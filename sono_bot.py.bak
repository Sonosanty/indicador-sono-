# Sono Bot — Trading Bot Autónomo
# 
# Este script se conecta a Binance en tiempo real, calcula el Score Maestro
# exactamente igual que Sono Pro, y simula órdenes en modo paper trading.
# Para activar trading real: cambiar PAPER_MODE = False y tener fondos en Pionex.
# No depende de OpenClaw. Funciona 24/7 en segundo plano.
#
# Uso: python sono_bot.py

import json, time, hashlib, hmac, requests, threading, logging, sys
from datetime import datetime

# ── Score engine unificado (misma lógica que la SPA) ─────
import sys
sys.path.insert(0, r'C:\Users\sparreno\.openclaw\workspace')
from sono_score import compute_score as sono_compute_score
# ────────────────────────────────────────────────────────────

# Forzar encoding UTF-8 para logging a archivo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('sono_bot.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ==================================================-------------
# CONFIGURACIÓN
# ==================================================-------------

# MODO REAL: False = ejecuta ordenes reales en Pionex
# Modo real activo con balances actuales
PAPER_MODE = True
PAPER_BALANCE = 100

# Modo micro-capital: optimizado para cuentas pequeñas (<$50)
# Reduce mínimos para que el bot pueda operar con saldos reales
MICRO_MODE = True

# ═══ SWING TRADING ═══════════════════════════════════════
# Timeframe 15m para velas de swing (horas/días de duración)
INTERVAL = '15m'
LIMIT = 220  # Suficiente para MA200 + margen

# Activos a monitorizar
ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'ALT', 'OSMO']

# Archivo de log
LOG_FILE = 'sono_bot.log'



# ==================================================-------------
# CREDENCIALES
# ==================================================-------------

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    _creds = json.load(f)

PIONEX_KEY = _creds['api_key']
PIONEX_SECRET = _creds['api_secret']

# ==================================================-------------
# INDICADORES TÉCNICOS (idénticos a Sono Pro)
# ==================================================-------------

def calcMA(arr, p):
    return None if len(arr) < p else sum(arr[-p:]) / p

def calcRSI(closes, p=14):
    if len(closes) <= p:
        return None
    d = [closes[i] - closes[i-1] for i in range(len(closes)-p, len(closes))]
    gains = sum(x for x in d if x > 0) / p
    losses = sum(abs(x) for x in d if x < 0) / p
    return 100 if losses == 0 else round(100 - 100 / (1 + gains / losses), 2)

def calcBB(closes, p=20, m=2):
    if len(closes) < p:
        return None
    sl = closes[-p:]
    ma = sum(sl) / p
    std = (sum((x - ma)**2 for x in sl) / p) ** 0.5
    return {'upper': ma + m*std, 'middle': ma, 'lower': ma - m*std, 'std': std}

def calcATR(candles, p=14):
    if len(candles) < p + 1:
        return None
    trs = []
    for i in range(-(p+1), 0):
        c = candles[i]
        if i == -(p+1):
            trs.append(c['high'] - c['low'])
        else:
            prev = candles[i-1]
            trs.append(max(c['high']-c['low'], abs(c['high']-prev['close']), abs(c['low']-prev['close'])))
    return sum(trs) / p

def calcADX(candles, p=14):
    if len(candles) < p * 2:
        return None
    sl = candles[-(p*2):]
    dmP = dmM = tr = 0
    for i in range(1, len(sl)):
        c, pv = sl[i], sl[i-1]
        up = c['high'] - pv['high']
        dn = pv['low'] - c['low']
        dmP += up if up > dn and up > 0 else 0
        dmM += dn if dn > up and dn > 0 else 0
        tr += max(c['high']-c['low'], abs(c['high']-pv['close']), abs(c['low']-pv['close']))
    if tr == 0:
        return 0
    diP = (dmP / tr) * 100
    diM = (dmM / tr) * 100
    return round((abs(diP - diM) / (diP + diM + 0.001)) * 100, 1)

def computeScore(candles):
    """Wrapper: delega en sono_score.py (contrato unificado)."""
    return sono_compute_score(candles)

# ==================================================-------------
# PIONEX API
# ==================================================-------------

PIONEX_BASE = 'https://api.pionex.com'

def _pionex_sig(method, path, params=None):
    """Genera firma HMAC SHA256 para Pionex API."""
    if params is None:
        params = {}
    params['timestamp'] = str(int(time.time() * 1000))
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

SYMBOL_MAP = {
    'BTC': ('BTCUSDT', 'BTC_USDT'),
    'ETH': ('ETHUSDT', 'ETH_USDT'),
    'SOL': ('SOLUSDT', 'SOL_USDT'),
    'XRP': ('XRPUSDT', 'XRP_USDT'),
    'ALT': ('ALTUSDT', 'ALT_USDT'),
    'OSMO': ('OSMOUSDT', 'OSMO_USDT'),
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

# ==================================================-------------
# ESTRATEGIA DE TRADING
# ==================================================-------------

class SonoBot:
    def __init__(self):
        self.last_signals = {}  # asset -> último score
        self.positions = {}     # asset -> {'side': 'LONG'/'SHORT', 'entry': price, 'size': amount}
        self.balances = {}
        self.running = True
        self.paper_mode = PAPER_MODE
        
        # Paper trading: balances simulados
        if self.paper_mode:
            self.paper_balances = {
                'USDT': PAPER_BALANCE
            }
            self.trade_log = []  # historial de trades simulados
        
        # ═══ CONFIG SWING ═══
        # risk_per_trade más bajo (40%) para swing (menos operaciones, más capital por operación)
        self.config = {
            'BTC': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'BTC_USDT', 'quote': 'USDT', 'decimals': 6},
            'ETH': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'ETH_USDT', 'quote': 'USDT', 'decimals': 4},
            'SOL': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'SOL_USDT', 'quote': 'USDT', 'decimals': 2},
            'XRP': {'min_trade': 5, 'risk_per_trade': 0.80, 'symbol': 'XRP_USDT', 'quote': 'USDT', 'decimals': 1},
            'ALT': {'min_trade': 5, 'risk_per_trade': 0.60, 'symbol': 'ALT_USDT', 'quote': 'USDT', 'decimals': 4},
            'OSMO': {'min_trade': 5, 'risk_per_trade': 0.60, 'symbol': 'OSMO_USDT', 'quote': 'USDT', 'decimals': 4},
        }
        # ═══ UMBRALES SWING TRADING ═══
        # Más exigentes para swing: requiere convicción alta
        self.BUY_THRESHOLD = 68       # Swing: solo entrar con score alto
        self.SELL_THRESHOLD = 35      # Swing: salir antes de que empeore
        self.STRONG_BUY_THRESHOLD = 80  # Swing: convicción fuerte
        
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
                candles = fetch_candles(asset)
                score = computeScore(candles)
                if not score:
                    continue
                
                ticker = fetch_ticker(asset)
                score['price'] = ticker['close']
                score['change_24h'] = ticker['change']
                self.last_signals[asset] = score
                
                # Decidir si tradear
                signal = score['signal']
                price = score['price']
                atr = score.get('atr')
                
                logger.info(
                    f'{asset}: Score={score["total"]} ({signal}) '
                    f'P1={score["p1"]} P2={score["p2"]} P3={score["p3"]} '
                    f'RSI={score["rsi"]} ADX={score["adx"]} '
                    f'Price=${price:.2f} '
                    'ATR=$' + (f'{atr:.2f}' if atr else 'N/A')
                )
                
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
        risk_amount = usdt_balance * cfg['risk_per_trade']
        # Si el riesgo calculado es menor que el minimo, usar el minimo
        if risk_amount < cfg['min_trade']:
            amount = min(cfg['min_trade'], usdt_balance)
        else:
            amount = round(risk_amount, 2)
        if amount < cfg['min_trade']:
            logger.warning(f'{asset}: Saldo insuficiente. {cfg["quote"]}={usdt_balance:.2f}, necesita min {cfg["min_trade"]:.2f}')
            return
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
        else:
            logger.info(f'COMPRANDO {asset} | ${amount} USDT a ${price:.2f}')
            result = place_order(cfg['symbol'], 'BUY', amount)
            if result.get('result'):
                self.positions[asset] = {'side': 'LONG', 'entry': price, 'size': size}
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
        else:
            logger.info(f'VENDIENDO {asset} | {amount} {asset} a ${price:.2f}')
            result = place_order(cfg['symbol'], 'SELL', amount)
            if result.get('result'):
                self.positions.pop(asset, None)
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
                # Estrategia para operaciones de horas/días:
                # - Timeframe 15m para velas
                # - Entrada: COMPRA_FUERTE (≥80) o COMPRA (≥68) si es top priority
                # - Salida: Score < 35 (DISTRIBUCIÓN o peor)
                # - Máx 2 posiciones simultáneas (concentrar capital)
                # - Sin day trading: 1-3 operaciones a la semana
                
                # Micro-mode: priorizar activos con balance real
                if MICRO_MODE:
                    # SOL y XRP tienen USDT real (~$37), BTC/ETH tienen USDC real (~$0.01)
                    priority_order = ['SOL', 'XRP', 'ETH', 'BTC', 'ALT', 'OSMO']
                else:
                    priority_order = ['XRP', 'ETH', 'SOL', 'BTC', 'ALT', 'OSMO']
                
                # ═══ SWING: solo 1 posición máxima en micro-mode ═══
                max_positions = 1 if MICRO_MODE else 2
                active_positions = sum(1 for a in ASSETS if self.find_position(a))
                
                # Si ya hay 2 posiciones, no abrir más (swing concentrado)
                if active_positions >= max_positions and not pos:
                    logger.info(f'{asset}: Score {score["total"]} - saltado (ya hay {active_positions} posiciones, máx {max_positions})')
                    continue
                
                # Solo ejecuta si hay saldo suficiente
                if quote_bal < cfg.get('min_trade', 10):
                    logger.info(f'{asset}: Saldo insuficiente ({cfg["quote"]}={quote_bal:.2f})')
                    continue
                
                # Comprobar si hay posiciones de mayor prioridad
                has_higher_priority_pos = False
                for p_asset in priority_order:
                    if p_asset == asset:
                        break
                    if self.find_position(p_asset):
                        has_higher_priority_pos = True
                        break
                
                # ═══ ENTRADAS SWING ═══
                # COMPRA_FUERTE (≥80) → Siempre entrar (mejores setups)
                if signal == 'COMPRA_FUERTE' and not pos:
                    self.execute_buy(asset, price)
                # COMPRA (≥68) → Solo si no hay posición de mayor prioridad
                elif signal == 'COMPRA' and not pos:
                    if not has_higher_priority_pos:
                        self.execute_buy(asset, price)
                    else:
                        logger.info(f'{asset}: COMPRA score={score["total"]} - saltado (prioridad mayor activa)')
                # ACUMULACION → Solo si es el mejor activo y score alto
                elif signal == 'ACUMULACION' and not pos and active_positions == 0:
                    if asset in ('XRP', 'ETH'):
                        self.execute_buy(asset, price)
                
                # ═══ SWING: TRAILING STOP ═══
                # Si estamos en posición y el precio sube >3%, subimos el stop
                if pos and pos.get('entry', 0) > 0:
                    gain_pct = ((price - pos['entry']) / pos['entry']) * 100
                    highest = pos.get('highest_price', pos['entry'])
                    if price > highest:
                        pos['highest_price'] = price  # actualizar máximo
                    # Trailing stop: si cae 2% desde máximo, vendemos
                    trail_high = pos.get('highest_price', pos['entry'])
                    if trail_high > pos['entry']:
                        drawdown_pct = ((trail_high - price) / trail_high) * 100
                        if drawdown_pct >= 2.0:
                            logger.info(f'{asset}: Trailing stop activado (drawdown {drawdown_pct:.1f}% desde ${trail_high:.2f})')
                            self.execute_sell(asset, price)
                            continue
                
                # ═══ SALIDAS SWING ═══
                # DISTRIBUCIÓN (35-42) o VENTA/CAPITULACIÓN (<35) → Vender
                if signal in ('VENTA', 'CAPITULACION', 'DISTRIBUCION') and pos:
                    self.execute_sell(asset, price)
                        
        except Exception as e:
            logger.error(f'Error en ciclo: {e}')
    
    def run_forever(self, interval_seconds=60):
        """Loop principal del bot."""
        logger.info('SONO BOT INICIADO')
        logger.info(f'Intervalo: {interval_seconds}s | Velas: {INTERVAL} | Activos: {ASSETS}')
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
    print('SONO BOT v1.0')
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
    
    print('Iniciando bot...')
    bot = SonoBot()
    bot.run_forever(interval_seconds=120)
