# Sono Bot — Trading Bot Autónomo
# 
# Este script se conecta a Binance en tiempo real, calcula el Score Maestro
# exactamente igual que Sono Pro, y simula órdenes en modo paper trading.
# Para activar trading real: cambiar PAPER_MODE = True y tener fondos en Pionex.
# No depende de OpenClaw. Funciona 24/7 en segundo plano.
#
# Uso: python sono_bot.py

import json, time, hashlib, hmac, requests, threading, logging, sys, os
from dotenv import load_dotenv
from datetime import datetime

# ── Asegurar stdout en UTF-8 (evita caracteres rotos en consola Windows) ────
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
# ─────────────────────────────────────────────────────────────────────────────

# ── Score engine unificado (misma lógica que la SPA) ─────
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BOT_DIR)
from sono_score import compute_score as sono_compute_score
# ────────────────────────────────────────────────────────────

# ── Telegram alerts ────────────────────────────────────────
from telegram_alerts import (
    send_alert, format_score_alert, format_trade_alert,
    format_score_cross_alert
)
# ────────────────────────────────────────────────────────────

# Forzar encoding UTF-8 para logging a archivo (ruta absoluta)
_LOG_PATH = os.path.join(_BOT_DIR, 'sono_bot.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(_LOG_PATH, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f'Log path: {_LOG_PATH}')

# ==================================================-------------
# CONFIGURACIÓN
# ==================================================-------------

# MODO REAL: False = ejecuta ordenes reales en Pionex
# Modo real activo con balances actuales
PAPER_MODE = True
PAPER_BALANCE = 100
# Archivo de estado persistente para paper trading (balance, posiciones, historial)
_STATE_FILE = os.path.join(_BOT_DIR, 'sono_state.json')

# Modo micro-capital: optimizado para cuentas pequeñas (<$50)
# Reduce mínimos para que el bot pueda operar con saldos reales
MICRO_MODE = True

# Enviar alertas Telegram en tiempo real
SEND_TELEGRAM_ALERTS = False

# ═══ SWING TRADING ═══════════════════════════════════════
# Timeframe 15m para velas de swing (horas/días de duración)
INTERVAL = '15m'
LIMIT = 220  # Suficiente para MA200 + margen

# Activos a monitorizar (4 principales eliminados ALT y OSMO)
ASSETS = ['BTC', 'ETH', 'SOL', 'XRP']

# Archivo de log (ruta absoluta)
LOG_FILE = _LOG_PATH

# ==================================================-------------
# CREDENCIALES
# ==================================================-------------

load_dotenv(r'C:\Users\sparreno\.openclaw\workspace\.env')
PIONEX_KEY = os.getenv('PIONEX_API_KEY', '')
PIONEX_SECRET = os.getenv('PIONEX_API_SECRET', '')
if not PIONEX_KEY or not PIONEX_SECRET:
    print('ERROR: PIONEX_API_KEY / PIONEX_API_SECRET no encontradas en .env')
    sys.exit(1)

# ==================================================-------------
# INDICADORES TÉCNICOS — DELEGADOS A sono_score.py
# ==================================================-------------

def computeScore(candles):
    """Wrapper: delega en sono_score.py (contrato unificado).
    Todas las funciones helper (calcMA, calcRSI, calcBB, calcATR, calcADX)
    se han eliminado de aquí y viven solo en sono_score.py.
    """
    return sono_compute_score(candles)

# ==================================================-------------
# PIONEX API
# ==================================================-------------

PIONEX_BASE = 'https://api.pionex.com'

# Cache de offset contra servidor Pionex (evita INVALID_TIMESTAMP)
_pionex_time_offset = None

def _sync_pionex_timestamp():
    """Sincroniza reloj local con Pionex."""
    global _pionex_time_offset
    try:
        t0 = time.time()
        r = requests.get(PIONEX_BASE + '/api/v1/common/time', timeout=10)
        t1 = time.time()
        d = r.json()
        if 'serverTime' in d:
            _pionex_time_offset = d['serverTime'] - ((t0 + t1) / 2 * 1000)
            logger.info(f'Pionex time offset: {_pionex_time_offset:.0f}ms')
    except Exception as e:
        logger.warning(f'Error sync timestamp Pionex: {e}')

_sync_pionex_timestamp()

def _pionex_sig(method, path, params=None):
    """Genera firma HMAC SHA256 para Pionex API."""
    if params is None:
        params = {}
    ts = int(time.time() * 1000)
    if _pionex_time_offset is not None:
        ts += int(_pionex_time_offset)
    params['timestamp'] = str(ts)
    # Ordenar alfabéticamente por key
    sorted_params = sorted(params.items())
    query = '&'.join(f'{k}={v}' for k, v in sorted_params)
    path_url = path + '?' + query
    msg = method + path_url
    sig = hmac.new(PIONEX_SECRET.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    return path_url, sig

def pionex_get(path, params=None):
    """GET request autenticado a Pionex."""
    path_url, sig = _pionex_sig('GET', path, params)
    headers = {
        'PIONEX-KEY': PIONEX_KEY,
        'PIONEX-SIGNATURE': sig,
        'Content-Type': 'application/json'
    }
    resp = requests.get(PIONEX_BASE + path_url, headers=headers, timeout=15)
    return resp.json()

def pionex_post(path, data):
    """POST request autenticado a Pionex."""
    params = {'timestamp': str(int(time.time() * 1000))}
    body = json.dumps(data)
    # POST: METHOD + path + '?' + sorted_params + body
    sorted_params = sorted(params.items())
    query = '&'.join(f'{k}={v}' for k, v in sorted_params)
    path_url = path + '?' + query
    msg = 'POST' + path_url + body
    sig = hmac.new(PIONEX_SECRET.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    headers = {
        'PIONEX-KEY': PIONEX_KEY,
        'PIONEX-SIGNATURE': sig,
        'Content-Type': 'application/json'
    }
    resp = requests.post(PIONEX_BASE + path + '?' + query, headers=headers, data=body, timeout=15)
    return resp.json()

def get_balances():
    """Obtiene saldos de Pionex."""
    d = pionex_get('/api/v1/account/balances')
    if d.get('result'):
        return {b['coin']: float(b['free']) for b in d['data']['balances']}
    logger.error(f'Error get_balances: {d}')
    return {}

def place_order(symbol, side, amount):
    """Coloca orden market en Pionex.
    
    Args:
        symbol: Ej. 'BTC_USDT'
        side: 'BUY' o 'SELL'
        amount: Cantidad en USDT (para BUY) o en activo base (para SELL)
    """
    data = {
        'symbol': symbol,
        'side': side,
        'type': 'MARKET',
        'amount': str(amount)
    }
    if side == 'BUY':
        data['amount'] = str(amount)  # En USDT
        data['amountType'] = 'QUOTE'  # amount es en quote currency
    d = pionex_post('/api/v1/trade/order', data)
    return d

def get_open_orders(symbol=None):
    """Obtiene órdenes abiertas."""
    params = {}
    if symbol:
        params['symbol'] = symbol
    d = pionex_get('/api/v1/trade/openOrders', params)
    return d

# ==================================================-------------
# BINANCE DATA
# ==================================================-------------

BINANCE_REST = 'https://api.binance.com/api/v3'

# SYMBOL_MAP limpio: solo los 4 activos reales (eliminados ALT y OSMO)
SYMBOL_MAP = {
    'BTC': ('BTCUSDT', 'BTC_USDT'),
    'ETH': ('ETHUSDT', 'ETH_USDT'),
    'SOL': ('SOLUSDT', 'SOL_USDT'),
    'XRP': ('XRPUSDT', 'XRP_USDT'),
}

def fetch_candles(asset):
    """Obtiene velas de Binance."""
    binance_sym, _ = SYMBOL_MAP[asset]
    resp = requests.get(
        f'{BINANCE_REST}/klines?symbol={binance_sym}&interval={INTERVAL}&limit={LIMIT}',
        timeout=15
    )
    raw = resp.json()
    return [{'time': k[0], 'open': float(k[1]), 'high': float(k[2]),
             'low': float(k[3]), 'close': float(k[4]), 'volume': float(k[5])}
            for k in raw]

def fetch_ticker(asset):
    """Obtiene ticker 24h de Binance."""
    binance_sym, _ = SYMBOL_MAP[asset]
    resp = requests.get(f'{BINANCE_REST}/ticker/24hr?symbol={binance_sym}', timeout=15)
    d = resp.json()
    return {'close': float(d['lastPrice']), 'change': float(d['priceChangePercent'])}

# ═══ MAPA DE NIVELES PARA DETECCIÓN DE CRUCES ═══
LEVEL_ORDER = {
    'CAPITULACIÓN': 0,
    'VENTA': 1,
    'DISTRIBUCIÓN': 2,
    'NEUTRAL': 3,
    'ACUMULACIÓN': 4,
    'COMPRA': 5,
    'COMPRA FUERTE': 6,
}

# ==================================================-------------
# ESTRATEGIA DE TRADING
# ==================================================-------------

class SonoBot:
    def __init__(self):
        self.last_signals = {}  # asset -> último score
        self.last_signals_raw = {}  # asset -> score raw anterior (para detección de cruces)
        self.positions = {}     # asset -> {'side': 'LONG'/'SHORT', 'entry': price, 'size': amount}
        self.balances = {}
        self.running = True
        self.paper_mode = PAPER_MODE
        
        # Paper trading: balances simulados con persistencia
        if self.paper_mode:
            self.trade_log = []  # historial de trades simulados
            self._load_paper_state()  # carga estado persistente o inicializa con PAPER_BALANCE
        
        # ═══ CONFIG SWING ═══
        self.config = {
            'BTC': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'BTC_USDT', 'quote': 'USDT', 'decimals': 6},
            'ETH': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'ETH_USDT', 'quote': 'USDT', 'decimals': 4},
            'SOL': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'SOL_USDT', 'quote': 'USDT', 'decimals': 2},
            'XRP': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'XRP_USDT', 'quote': 'USDT', 'decimals': 1},
        }
        # ═══ UMBRALES SWING TRADING ═══
        # (reservado para futuro override; la logica real usa sono-score-config.json via classify_score)

        # Contador de alertas para throttle
        self._last_alert_time = {}
        self._alert_cooldown = 3600  # 1h entre alertas del mismo tipo/activo

    def _should_alert(self, alert_key):
        """Rate limiting para alertas: 1h entre mismo tipo/activo."""
        now = time.time()
        last = self._last_alert_time.get(alert_key, 0)
        if now - last < self._alert_cooldown:
            return False
        self._last_alert_time[alert_key] = now
        return True

    # ── Persistencia de estado paper ────────────────────────────────────
    def _state_path(self):
        return _STATE_FILE

    def _load_paper_state(self):
        """Carga estado persistente de paper trading o inicializa con PAPER_BALANCE."""
        sp = self._state_path()
        if os.path.exists(sp):
            try:
                with open(sp, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                self.paper_balances = state.get('balances', {'USDT': PAPER_BALANCE})
                self.positions = {}
                for pos in state.get('positions', []):
                    self.positions[pos['asset']] = {
                        'side': pos['side'],
                        'entry': pos['entry'],
                        'size': pos['size'],
                    }
                    if 'highest_price' in pos:
                        self.positions[pos['asset']]['highest_price'] = pos['highest_price']
                self.trade_log = state.get('trade_log', [])
                logger.info(f'Estado paper cargado: USDT={self.paper_balances.get("USDT",0):.2f}, '
                           f'posiciones={len(self.positions)}')
                return
            except Exception as e:
                logger.warning(f'Error cargando estado paper: {e}. Usando balance inicial.')

        # Inicializar con valores por defecto
        self.paper_balances = {'USDT': PAPER_BALANCE}
        self.positions = {}
        self.trade_log = []
        logger.info(f'Estado paper inicializado: USDT={PAPER_BALANCE:.2f}')

    def _save_paper_state(self):
        """Persiste estado actual de paper trading."""
        if not self.paper_mode:
            return
        try:
            sp = self._state_path()
            positions_list = []
            for asset, pos in self.positions.items():
                p = {'asset': asset, 'side': pos['side'], 'entry': pos['entry'], 'size': pos['size']}
                if 'highest_price' in pos:
                    p['highest_price'] = pos['highest_price']
                positions_list.append(p)
            state = {
                'balances': self.paper_balances,
                'positions': positions_list,
                'trade_log': self.trade_log[-500:],  # mantener últimos 500 trades
                'last_update': datetime.now().isoformat(),
                'version': 1,
            }
            with open(sp, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f'Error guardando estado paper: {e}')
    # ─────────────────────────────────────────────────────────────────────

    def log_state(self):
        """Loggea estado actual."""
        logger.info('-' * 50)
        for asset in ASSETS:
            cfg = self.config.get(asset, {})
            sig = self.last_signals.get(asset, {})
            pos = self.positions.get(asset)
            bal_q = self.balances.get(cfg.get('quote', 'USDT'), 0)
            bal_b = self.balances.get(asset, 0)
            price = sig.get('price', 0)
            logger.info(
                f'{asset} | Score: {sig.get("total", "?")} ({sig.get("signal", "?")}) | '
                f'Price: ${price:.2f} | '
                f'Bal {cfg.get("quote","?")}: {bal_q:.2f} | {asset}: {bal_b:.6f} | '
                f'Position: {"NONE" if not pos else pos["side"] + " @ $" + str(round(pos.get("entry",0),2))}'
            )
        logger.info('-' * 50)
        # Persistir estado después de cada log
        self._save_paper_state()

    def update_balances(self):
        """Actualiza saldos (reales o simulados)."""
        if self.paper_mode:
            self.balances = self.paper_balances
            return  # No llamar a API en paper mode
        else:
            self.balances = get_balances()
    
    def check_signals(self):
        """Calcula Score para cada activo y decide si tradear."""
        for asset in ASSETS:
            try:
                # Refrescar balance antes de cada activo (evita recomprar con saldo ya gastado)
                if self.paper_mode:
                    self.balances = dict(self.paper_balances)
                candles = fetch_candles(asset)
                score = computeScore(candles)
                if not score:
                    continue
                
                ticker = fetch_ticker(asset)
                score['price'] = ticker['close']
                score['change_24h'] = ticker['change']
                
                # Detectar cambio de categoría (para alertas)
                old_score = self.last_signals_raw.get(asset, {})
                old_signal = old_score.get('signal', 'NEUTRAL')
                new_signal = score.get('signal', 'NEUTRAL')
                
                self.last_signals_raw[asset] = dict(score)
                self.last_signals[asset] = score
                
                price = score['price']
                atr = score.get('atr')
                
                logger.info(
                    f'{asset}: Score={score["total"]} ({new_signal}) '
                    f'P1={score["p1"]} P2={score["p2"]} P3={score["p3"]} '
                    f'RSI={score["rsi"]} ADX={score["adx"]} '
                    f'Price=${price:.2f} '
                    f'ATR={"$" + f"{atr:.2f}" if atr is not None else "N/A"}'
                )
                
                # ═══ Alertas Telegram por cambio de categoría ═══
                if SEND_TELEGRAM_ALERTS and old_score:
                    if old_signal != new_signal:
                        alert_key = f'cross_{asset}'
                        if self._should_alert(alert_key):
                            try:
                                alert_msg = format_score_cross_alert(asset, old_score, score, price)
                                send_alert(alert_msg)
                                logger.info(f'Telegram: alerta cambio de señal {asset}: {old_signal} -> {new_signal}')
                            except Exception as e:
                                logger.error(f'Error enviando alerta Telegram: {e}')
                    
                    # Alerta especial para COMPRA_FUERTE o CAPITULACION
                    if new_signal in ('COMPRA FUERTE', 'CAPITULACIÓN'):
                        alert_key = f'extreme_{asset}_{new_signal}'
                        if self._should_alert(alert_key) and old_signal != new_signal:
                            try:
                                alert_msg = format_score_alert(asset, score, price=None, action=f'ALERTA EXTREMA: {new_signal}')
                                send_alert(alert_msg)
                                logger.info(f'Telegram: alerta extrema {asset}: {new_signal}')
                            except Exception as e:
                                logger.error(f'Error enviando alerta extrema: {e}')
                
            except Exception as e:
                logger.error(f'Error checking {asset}: {e}')
    
    def find_position(self, asset):
        """Busca posicion abierta (solo si fue abierta por el bot)."""
        return self.positions.get(asset)
    
    def execute_buy(self, asset, price):
        """Ejecuta compra en Pionex (o simula en paper mode)."""
        cfg = self.config.get(asset, {})
        if not cfg:
            logger.warning(f'No config for {asset}')
            return
        usdt_balance = self.balances.get(cfg['quote'], 0)
        # Verificar saldo ANTES de calcular riesgo
        if usdt_balance < cfg['min_trade']:
            logger.warning(f'{asset}: Saldo insuficiente. {cfg["quote"]}={usdt_balance:.2f}, necesita min {cfg["min_trade"]:.2f}')
            return
        risk_amount = usdt_balance * cfg['risk_per_trade']
        # Si el riesgo calculado es menor que el minimo, usar el minimo
        if risk_amount < cfg['min_trade']:
            amount = min(cfg['min_trade'], usdt_balance)
        else:
            amount = round(risk_amount, 2)
        amount = round(amount, 2)
        size = amount / price
        if self.paper_mode:
            self.paper_balances['USDT'] = self.paper_balances.get('USDT', 0) - amount
            self.paper_balances[asset] = self.paper_balances.get(asset, 0) + size
            self.positions[asset] = {'side': 'LONG', 'entry': price, 'size': size}
            self.trade_log.append({
                'time': datetime.now().isoformat(),
                'type': 'BUY', 'asset': asset,
                'amount_usdt': round(amount, 2),
                'size': round(size, 8),
                'price': round(price, 2)
            })
            logger.info(f'PAPER BUY {asset} | ${amount:.2f} @ ${price:.2f} | Size: {size:.6f} | Bal: ${self.paper_balances["USDT"]:.2f}')

            # ═══ Alerta Telegram ═══
            if SEND_TELEGRAM_ALERTS:
                try:
                    alert_msg = format_trade_alert('BUY', asset, price, size)
                    send_alert(alert_msg)
                except Exception as e:
                    logger.error(f'Error enviando alerta trade: {e}')
        else:
            logger.info(f'COMPRANDO {asset} | ${amount} USDT a ${price:.2f}')
            result = place_order(cfg['symbol'], 'BUY', amount)
            if result.get('result'):
                self.positions[asset] = {'side': 'LONG', 'entry': price, 'size': size}
                if SEND_TELEGRAM_ALERTS:
                    try:
                        alert_msg = format_trade_alert('BUY', asset, price, size)
                        send_alert(alert_msg)
                    except Exception as e:
                        logger.error(f'Error enviando alerta trade: {e}')
            else:
                logger.error(f'Error compra {asset}: {result}')
    
    def execute_sell(self, asset, price):
        """Ejecuta venta (o simula en paper mode)."""
        cfg = self.config.get(asset, {})
        if not cfg:
            return
        pos = self.find_position(asset)
        if not pos:
            logger.info(f'{asset}: Sin posicion para vender')
            return
        base_bal = self.balances.get(asset, 0)
        if base_bal <= 0:
            logger.info(f'{asset}: Balance 0, nada que vender')
            return
        decimals = cfg['decimals']
        amount = round(base_bal, decimals)
        proceeds = amount * price
        entry_cost = pos.get('size', 0) * pos.get('entry', price)
        pnl = proceeds - entry_cost
        pnl_pct = (pnl / entry_cost) * 100 if entry_cost else 0
        if self.paper_mode:
            self.paper_balances['USDT'] = self.paper_balances.get('USDT', 0) + proceeds
            self.paper_balances[asset] = self.paper_balances.get(asset, 0) - amount
            self.positions.pop(asset, None)
            self.trade_log.append({
                'time': datetime.now().isoformat(),
                'type': 'SELL', 'asset': asset,
                'pnl': round(pnl, 2),
                'pnl_pct': round(pnl_pct, 2)
            })
            logger.info(f'PAPER SELL {asset} | {amount:.6f} @ ${price:.2f} | PnL: ${pnl:.2f} ({pnl_pct:.1f}%) | Bal: ${self.paper_balances["USDT"]:.2f}')

            # ═══ Alerta Telegram con PnL ═══
            if SEND_TELEGRAM_ALERTS:
                try:
                    pnl_dict = {'pnl': round(pnl, 2), 'pnl_pct': round(pnl_pct, 2)}
                    alert_msg = format_trade_alert('SELL', asset, price, amount, pnl=pnl_dict)
                    send_alert(alert_msg)
                except Exception as e:
                    logger.error(f'Error enviando alerta venta: {e}')
        else:
            logger.info(f'VENDIENDO {asset} | {amount} {asset} a ${price:.2f}')
            result = place_order(cfg['symbol'], 'SELL', amount)
            if result.get('result'):
                self.positions.pop(asset, None)
                if SEND_TELEGRAM_ALERTS:
                    try:
                        pnl_dict = {'pnl': round(pnl, 2), 'pnl_pct': round(pnl_pct, 2)}
                        alert_msg = format_trade_alert('SELL', asset, price, amount, pnl=pnl_dict)
                        send_alert(alert_msg)
                    except Exception as e:
                        logger.error(f'Error enviando alerta venta: {e}')
            else:
                logger.error(f'Error venta {asset}: {result}')
    
    def run_once(self):
        """Un ciclo completo del bot."""
        try:
            self.update_balances()
            self.check_signals()
            self.log_state()
            
            for asset in ASSETS:
                score = self.last_signals.get(asset)
                if not score:
                    continue
                
                signal = score['signal']
                price = score['price']
                pos = self.find_position(asset)
                cfg = self.config.get(asset, {})
                quote = cfg.get('quote', 'USDT')
                quote_bal = self.balances.get(quote, 0)
                
                # ═══ SWING TRADING — DECISIÓN ═══
                micro_mode = MICRO_MODE
                
                if micro_mode:
                    priority_order = ['SOL', 'XRP', 'ETH', 'BTC']
                else:
                    priority_order = ['XRP', 'ETH', 'SOL', 'BTC']
                
                max_positions = 1 if micro_mode else 2
                active_positions = sum(1 for a in ASSETS if self.find_position(a))
                
                if active_positions >= max_positions and not pos:
                    logger.info(f'{asset}: Score {score["total"]} - saltado (ya hay {active_positions} posiciones, máx {max_positions})')
                    continue
                
                if quote_bal < cfg.get('min_trade', 10):
                    logger.info(f'{asset}: Saldo insuficiente ({cfg["quote"]}={quote_bal:.2f})')
                    continue
                
                has_higher_priority_pos = False
                for p_asset in priority_order:
                    if p_asset == asset:
                        break
                    if self.find_position(p_asset):
                        has_higher_priority_pos = True
                        break
                
                # ═══ ENTRADAS SWING ═══
                if signal == 'COMPRA FUERTE' and not pos:
                    self.execute_buy(asset, price)
                elif signal == 'COMPRA' and not pos:
                    if not has_higher_priority_pos:
                        self.execute_buy(asset, price)
                    else:
                        logger.info(f'{asset}: COMPRA score={score["total"]} - saltado (prioridad mayor activa)')
                elif signal == 'ACUMULACIÓN' and not pos and active_positions == 0:
                    if asset in ('XRP', 'ETH'):
                        self.execute_buy(asset, price)
                
                # ═══ SWING: TRAILING STOP ═══
                if pos and pos.get('entry', 0) > 0:
                    gain_pct = ((price - pos['entry']) / pos['entry']) * 100
                    highest = pos.get('highest_price', pos['entry'])
                    if price > highest:
                        pos['highest_price'] = price
                    trail_high = pos.get('highest_price', pos['entry'])
                    if trail_high > pos['entry']:
                        drawdown_pct = ((trail_high - price) / trail_high) * 100
                        if drawdown_pct >= 2.0:
                            logger.info(f'{asset}: Trailing stop activado (drawdown {drawdown_pct:.1f}% desde ${trail_high:.2f})')
                            self.execute_sell(asset, price)
                            continue
                
                # ═══ SALIDAS SWING ═══
                if signal in ('VENTA', 'CAPITULACIÓN', 'DISTRIBUCIÓN') and pos:
                    self.execute_sell(asset, price)
                        
        except Exception as e:
            logger.error(f'Error en ciclo: {e}')
    
    def run_forever(self, interval_seconds=60):
        """Loop principal del bot."""
        logger.info('SONO BOT INICIADO')
        logger.info(f'Intervalo: {interval_seconds}s | Velas: {INTERVAL} | Activos: {ASSETS}')
        logger.info(f'Paper mode: {PAPER_MODE} | Alertas Telegram: {SEND_TELEGRAM_ALERTS}')
        if not PAPER_MODE:
            logger.info(f'Ejecutando en Pionex con API Key: {PIONEX_KEY[:8]}...')
        
        # Ejecutar inmediatamente
        self.run_once()
        
        while self.running:
            try:
                time.sleep(interval_seconds)
                self.run_once()
            except KeyboardInterrupt:
                logger.info('Bot detenido por usuario')
                self.running = False
                break
            except Exception as e:
                logger.error(f'Error crítico: {e}')
                time.sleep(interval_seconds * 2)

# ==================================================-------------
# ENTRY POINT
# ==================================================-------------

if __name__ == '__main__':
    print('SONO BOT v1.5')
    print('=' * 50)
    print('Bot de trading autonomo para Pionex')
    print('Basado en el Score Maestro de Sono Pro')
    print('=' * 50)
    
    mode = 'SIMULACION (Paper Trading)' if PAPER_MODE else 'REAL'
    print('Modo:', mode)
    if PAPER_MODE:
        print('Balance simulado: $' + str(PAPER_BALANCE) + ' USDT')
        print('No se ejecutaran ordenes reales. Solo simulacion.')
    else:
        balances = get_balances()
        if not balances:
            print('No se pudo conectar a Pionex. Verifica credenciales.')
            exit(1)
        print('Conexion a Pionex exitosa')
        for coin, bal in balances.items():
            if float(bal) > 0:
                print('  ' + coin + ': ' + str(bal))
    
    print('Alertas Telegram:', 'ACTIVADAS' if SEND_TELEGRAM_ALERTS else 'DESACTIVADAS')
    print('Iniciando bot...')
    bot = SonoBot()
    bot.run_forever(interval_seconds=120)


