# Sono Bot REAL TRADING — SWEET TRADING v1.0
# Scalping 1m-3m: muchas operaciones, stops ajustados, targets pequeños
# Lee señales de Sono Pro (Binance) y ejecuta en Pionex
# No depende de OpenClaw. Funciona 24/7.
#
# Uso: python sono_bot_real.py

import json, time, hashlib, hmac, requests, logging, sys
from datetime import datetime

# ─── LOGGING ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('sono_bot_real.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ─── CONFIG SWEET TRADING ────────────────────────────────
# Sweet Trading = Scalping agresivo. Timeframe 1m, stops 0.5-1%, targets 1-2%
# Se ejecuta en los activos que más se mueven (SOL, XRP, ETH)

CONFIG = {
    'BTC': {'min_trade': 10, 'risk_per_trade': 0.50, 'symbol': 'BTC_USDT', 'quote': 'USDT', 'decimals': 6, 'enabled': False},
    'ETH': {'min_trade': 10, 'risk_per_trade': 0.50, 'symbol': 'ETH_USDT', 'quote': 'USDT', 'decimals': 4, 'enabled': True},
    'SOL': {'min_trade': 5,  'risk_per_trade': 0.60, 'symbol': 'SOL_USDT', 'quote': 'USDT', 'decimals': 2, 'enabled': True},
    'XRP': {'min_trade': 5,  'risk_per_trade': 0.60, 'symbol': 'XRP_USDT', 'quote': 'USDT', 'decimals': 1, 'enabled': True},
}

# Umbrales SWEET TRADING (más sensibles que swing)
SWEET = {
    'BUY_MIN': 58,           # Score mínimo para comprar
    'SELL_MAX': 38,          # Score para vender
    'STOP_LOSS': 0.8,        # Stop loss fijo 0.8%
    'TAKE_PROFIT': 1.5,      # Take profit 1.5% (ratio 1:1.87)
    'TRAILING_ACTIVATE': 0.6, # Trailing se activa al +0.6%
    'TRAILING_DISTANCE': 0.4, # Trailing stop a 0.4% desde máximo
    'MAX_POSITIONS': 2,       # Máximo 2 posiciones simultáneas
    'CHECK_INTERVAL': 30,     # Revisar cada 30 segundos
    'TIMEFRAME': '1m',        # Velas de 1 minuto
    'LIMIT': 60,              # Últimas 60 velas
}

# ─── CREDENCIALES PIONEX ─────────────────────────────────
with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    _creds = json.load(f)
PIONEX_KEY = _creds['api_key']
PIONEX_SECRET = _creds['api_secret']
PIONEX_BASE = 'https://api.pionex.com'

# ─── PIONEX API ──────────────────────────────────────────
def _pionex_sig(method, path, params=None):
    if params is None:
        params = {}
    params['timestamp'] = str(int(time.time() * 1000))
    sorted_params = sorted(params.items())
    query = '&'.join(f'{k}={v}' for k, v in sorted_params)
    path_url = path + '?' + query
    msg = method + path_url
    sig = hmac.new(PIONEX_SECRET.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    return path_url, sig

def pionex_get(path, params=None):
    path_url, sig = _pionex_sig('GET', path, params)
    headers = {'PIONEX-KEY': PIONEX_KEY, 'PIONEX-SIGNATURE': sig, 'Content-Type': 'application/json'}
    resp = requests.get(PIONEX_BASE + path_url, headers=headers, timeout=15)
    return resp.json()

def pionex_post(path, data):
    params = {'timestamp': str(int(time.time() * 1000))}
    body = json.dumps(data)
    sorted_params = sorted(params.items())
    query = '&'.join(f'{k}={v}' for k, v in sorted_params)
    path_url = path + '?' + query
    msg = 'POST' + path_url + body
    sig = hmac.new(PIONEX_SECRET.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256).hexdigest()
    headers = {'PIONEX-KEY': PIONEX_KEY, 'PIONEX-SIGNATURE': sig, 'Content-Type': 'application/json'}
    resp = requests.post(PIONEX_BASE + path + '?' + query, headers=headers, data=body, timeout=15)
    return resp.json()

def get_balances():
    d = pionex_get('/api/v1/account/balances')
    if d.get('result'):
        return {b['coin']: float(b['free']) for b in d['data']['balances']}
    logger.error(f'Error get_balances: {d}')
    return {}

def place_order(symbol, side, amount, amount_type=None):
    """Coloca orden MARKET en Pionex."""
    data = {'symbol': symbol, 'side': side, 'type': 'MARKET', 'amount': str(amount)}
    if amount_type:
        data['amountType'] = amount_type
    d = pionex_post('/api/v1/trade/order', data)
    return d

def get_open_orders(symbol=None):
    params = {}
    if symbol:
        params['symbol'] = symbol
    return pionex_get('/api/v1/trade/openOrders', params)

def cancel_order(symbol, order_id):
    return pionex_post('/api/v1/trade/cancelOrder', {'symbol': symbol, 'orderId': order_id})

# ─── DATOS BINANCE ──────────────────────────────────────
BINANCE_REST = 'https://api.binance.com/api/v3'

def get_scores_sweet():
    """
    Calcula Score Sono en timeframe 1m para sweet trading.
    Mismos pilares que Sono Pro pero más reactivo.
    """
    scores = {}
    
    for asset in ['BTC', 'ETH', 'SOL', 'XRP']:
        try:
            binance_sym = f'{asset}USDT'
            resp = requests.get(
                f'{BINANCE_REST}/klines?symbol={binance_sym}&interval={SWEET["TIMEFRAME"]}&limit={SWEET["LIMIT"]}',
                timeout=15
            )
            raw = resp.json()
            candles = [{'time': k[0], 'open': float(k[1]), 'high': float(k[2]),
                        'low': float(k[3]), 'close': float(k[4]), 'volume': float(k[5])} for k in raw]
            
            closes = [c['close'] for c in candles]
            price = closes[-1]
            volume = candles[-1]['volume'] if candles else 0
            prev_volume = candles[-2]['volume'] if len(candles) > 1 else 0
            
            def ma(arr, p):
                return None if len(arr) < p else sum(arr[-p:]) / p
            
            ma6 = ma(closes, 6)
            ma20 = ma(closes, 20)
            ma40 = ma(closes, 40)
            
            # RSI 7 periodos (más sensible que 14)
            rsi = None
            if len(closes) > 7:
                d = [closes[i] - closes[i-1] for i in range(len(closes)-7, len(closes))]
                gains = sum(x for x in d if x > 0) / 7
                losses = sum(abs(x) for x in d if x < 0) / 7
                rsi = 100 if losses == 0 else round(100 - 100 / (1 + gains / losses), 2)
            
            # ADX simplificado
            adx = None
            if len(candles) >= 14:
                sl = candles[-14:]
                dmP = dmM = tr = 0
                for i in range(1, len(sl)):
                    c, pv = sl[i], sl[i-1]
                    up = c['high'] - pv['high']
                    dn = pv['low'] - c['low']
                    dmP += up if up > dn and up > 0 else 0
                    dmM += dn if dn > up and dn > 0 else 0
                    tr += max(c['high']-c['low'], abs(c['high']-pv['close']), abs(c['low']-pv['close']))
                adx = 0 if tr == 0 else round((abs(dmP - dmM) / (dmP + dmM + 0.001)) * 100, 1)
            
            # BB 14 periodos
            bb = None
            if len(closes) >= 14:
                sl = closes[-14:]
                sma = sum(sl) / 14
                std = (sum((x - sma)**2 for x in sl) / 14) ** 0.5
                bb = {'upper': sma + 2*std, 'middle': sma, 'lower': sma - 2*std}
            
            # Volumen: si sube respecto a vela anterior
            volume_surge = volume > prev_volume * 1.5 if prev_volume > 0 else False
            
            # ═══ PILAR 1: MA Cross (max 30) ═══
            p1 = 0
            if ma6 and ma20:
                p1 += 15 if ma6 > ma20 else 0
            if ma6 and ma40:
                p1 += 15 if ma6 > ma40 else 0
            
            # ═══ PILAR 2: Momentum (max 40) ═══
            p2 = 0
            if rsi is not None:
                if rsi > 50:  # Bullish momentum
                    p2 += 10
                if 40 < rsi < 60:
                    p2 += 5   # Zona neutral
            if adx is not None:
                if adx > 30: p2 += 15   # Tendencia fuerte
                elif adx > 20: p2 += 10  # Tendencia media
                else: p2 += 3           # Sin tendencia
            p2 += 8 if volume_surge else 0  # Volumen confirmando
            if ma20 and price > ma20:
                p2 += 7
            
            # ═══ PILAR 3: Bollinger (max 30) ═══
            p3 = 0
            if bb:
                range_p = bb['upper'] - bb['lower']
                pctB = (price - bb['lower']) / range_p if range_p > 0 else 0.5
                if pctB < 0.2:    # Oversold bounce
                    p3 += 25
                elif pctB < 0.4:  # Zona baja
                    p3 += 18
                elif pctB < 0.6:  # Medio
                    p3 += 12
                elif pctB < 0.8:
                    p3 += 6
                else:  # Overbought
                    p3 += 2
            
            total = min(100, round(p1 + p2 + p3))
            
            # Sweet Trading: señales más granulares
            if total >= 78:
                signal = 'COMPRA_FUERTE'
            elif total >= 65:
                signal = 'COMPRA'
            elif total >= SWEET['BUY_MIN']:
                signal = 'SWEET_BUY'
            elif total >= 48:
                signal = 'NEUTRAL'
            elif total >= SWEET['SELL_MAX']:
                signal = 'SWEET_SELL'
            elif total >= 25:
                signal = 'VENTA'
            else:
                signal = 'CAPITULACION'
            
            scores[asset] = {
                'total': total, 'signal': signal, 'price': price,
                'rsi': rsi, 'adx': adx, 'p1': p1, 'p2': p2, 'p3': p3,
                'ma6': ma6, 'ma20': ma20, 'volume_surge': volume_surge,
                'volume': volume, 'bb_upper': bb['upper'] if bb else None,
                'bb_lower': bb['lower'] if bb else None
            }
        except Exception as e:
            logger.error(f'Error score {asset}: {e}')
    
    return scores

# ─── ESTRATEGIA SWEET TRADING ────────────────────────────

class SweetBot:
    def __init__(self):
        self.positions = {}      # asset -> pos details
        self.balances = {}
        self.trades_today = 0
        self.daily_pnl = 0.0
        
    def update_balances(self):
        self.balances = get_balances()
        
    def get_entry_price(self, asset):
        """Obtiene precio actual del activo desde Binance."""
        try:
            r = requests.get(f'{BINANCE_REST}/ticker/price?symbol={asset}USDT', timeout=10)
            return float(r.json()['price'])
        except:
            return 0
    
    def log_state(self, scores):
        usdt = self.balances.get('USDT', 0)
        eq = usdt
        for a, p in self.positions.items():
            s = scores.get(a, {})
            cp = s.get('price', 0)
            if cp > 0: eq += p['size'] * cp
        
        logger.info('=' * 55)
        logger.info(f'🔥 SWEET REAL | USDT: ${usdt:.2f} | Equity: ${eq:.2f} | Pos: {len(self.positions)} | Hoy: {self.trades_today} trades | PnL: ${self.daily_pnl:.2f}')
        logger.info('=' * 55)
        
        for asset in ['SOL', 'XRP', 'ETH', 'BTC']:
            s = scores.get(asset, {})
            pos = self.positions.get(asset)
            p = s.get('price', 0)
            sig = s.get('signal', '?')
            t = s.get('total', '?')
            rsi = s.get('rsi', '?')
            vol = s.get('volume', 0)
            vs = '🚀' if s.get('volume_surge') else '  '
            
            if pos:
                gain = ((p - pos['entry']) / pos['entry']) * 100
                ps = f'LONG +{gain:.2f}% @ ${pos["entry"]:.2f}'
            else:
                ps = 'NONE'
            
            logger.info(f'{asset} {vs} | Score: {str(t):3s} ({sig:14s}) | ${p:<10.2f} | RSI: {str(rsi):>5s} | {ps}')
        
        logger.info('=' * 55)
    
    def sweet_buy(self, asset, price, score):
        """Ejecuta compra SWEET en Pionex con stop loss inmediato."""
        cfg = CONFIG[asset]
        if not cfg.get('enabled', False):
            logger.info(f'{asset}: Desactivado en config')
            return False
        
        usdt = self.balances.get('USDT', 0)
        amount = min(usdt * cfg['risk_per_trade'], usdt)
        amount = max(cfg['min_trade'], round(amount, 2))
        
        if amount < cfg['min_trade']:
            logger.info(f'{asset}: Saldo insuficiente (USDT={usdt:.2f})')
            return False
        
        # Calcular stop loss y take profit
        stop_price = round(price * (1 - SWEET['STOP_LOSS']/100), 2)
        tp_price = round(price * (1 + SWEET['TAKE_PROFIT']/100), 2)
        
        logger.info(f'🔥 COMPRA SWEET {asset} | ${amount:.2f} @ ${price:.2f} | SL: ${stop_price:.2f} ({SWEET["STOP_LOSS"]}%) | TP: ${tp_price:.2f} ({SWEET["TAKE_PROFIT"]}%)')
        
        # Ejecutar orden market
        result = place_order(cfg['symbol'], 'BUY', amount, 'QUOTE')
        if result.get('result'):
            # Leer balance REAL después de la compra para saber el size exacto
            time.sleep(1)
            fresh_balances = get_balances()
            real_size = fresh_balances.get(asset, 0)
            real_usdt = fresh_balances.get('USDT', 0)
            self.balances = fresh_balances
            
            entry_price = price  # Usar precio de mercado como referencia
            
            self.positions[asset] = {
                'side': 'LONG', 'entry': entry_price, 'size': real_size,
                'amount': amount, 'entry_time': time.time(),
                'stop_loss': stop_price, 'take_profit': tp_price,
                'highest': entry_price, 'order_id': result.get('data', {}).get('orderId', '')
            }
            logger.info(f'✅ SWEET BUY EJECUTADA {asset} | ${amount:.2f} @ ~${entry_price:.2f} | Size: {real_size:.6f} {asset} | USDT restante: ${real_usdt:.2f}')
            self.log_trade(asset, 'BUY', amount, entry_price, score)
            return True
        else:
            logger.error(f'❌ Error sweet buy {asset}: {result}')
            return False
    
    def sweet_sell(self, asset, price, reason='SEÑAL', size_override=None):
        """Ejecuta venta SWEET en Pionex."""
        if asset not in self.positions:
            return False
        
        pos = self.positions[asset]
        cfg = CONFIG[asset]
        
        # Obtener balance real del activo para vender
        try:
            real_bal = self.balances.get(asset, 0)
            if real_bal <= 0:
                logger.error(f'{asset}: No hay balance real para vender ({asset}={real_bal})')
                return False
            
            # Redondear según decimales del activo
            decimals = cfg.get('decimals', 6)
            sell_amount = round(real_bal, decimals)
            if sell_amount <= 0:
                sell_amount = real_bal  # usar el valor exacto
            
            logger.info(f'💰 VENTA SWEET {asset} | {sell_amount:.{decimals}f} @ ${price:.2f} | Razón: {reason} | Balance real: {real_bal:.{decimals}f}')
            
            # Pasar amount SIN amountType para SELL (cantidad en activo base)
            result = place_order(cfg['symbol'], 'SELL', sell_amount)
            if result.get('result'):
                self.daily_pnl += 0  # PnL se calcula con la orden completada
                self.trades_today += 1
                
                logger.info(f'✅ SWEET SELL {asset} EJECUTADA | Razón: {reason}')
                self.log_trade(asset, 'SELL', 0, 0, None, 0, 0, reason)
                
                del self.positions[asset]
                return True
            else:
                # Fallback: vender usando el size de la posición directamente
                logger.warning(f'{asset}: Venta directa falló, intentando con size de posición: {pos["size"]:.{decimals}f}')
                result2 = place_order(cfg['symbol'], 'SELL', round(pos['size'], decimals))
                if result2.get('result'):
                    self.trades_today += 1
                    logger.info(f'✅ SWEET SELL {asset} (fallback) EJECUTADA | Razón: {reason}')
                    del self.positions[asset]
                    return True
                else:
                    logger.error(f'❌ Error sweet sell {asset} (fallback): {result2}')
                    return False
        except Exception as e:
            logger.error(f'❌ Error sweet sell {asset}: {e}')
            return False
    
    def log_trade(self, asset, trade_type, amount, price, score=None, pnl=None, pnl_pct=None, reason=''):
        """Registra trade en log estructurado."""
        log_entry = {
            'time': datetime.now().isoformat(),
            'asset': asset, 'type': trade_type,
            'amount': round(amount, 2), 'price': round(price, 2),
            'balance_usdt': round(self.balances.get('USDT', 0), 2)
        }
        if score:
            log_entry['score'] = score.get('total', '?')
            log_entry['signal'] = score.get('signal', '?')
        if pnl is not None:
            log_entry['pnl'] = round(pnl, 2)
            log_entry['pnl_pct'] = round(pnl_pct, 2)
            log_entry['reason'] = reason
            logger.info(f'📊 TRADE: {asset} {trade_type} | ${pnl:.2f} ({pnl_pct:.2f}%) | {reason}')
    
    def check_exits(self, asset, price, score):
        """Verifica condiciones de salida (stop loss, take profit, trailing)."""
        if asset not in self.positions:
            return False
        
        pos = self.positions[asset]
        
        # 1. Stop Loss fijo
        if price <= pos['stop_loss']:
            logger.info(f'{asset}: STOP LOSS ${price:.2f} (SL: ${pos["stop_loss"]:.2f})')
            self.sweet_sell(asset, price, f'SL_{SWEET["STOP_LOSS"]}%')
            return True
        
        # 2. Take Profit fijo
        if price >= pos['take_profit']:
            logger.info(f'{asset}: TAKE PROFIT ${price:.2f} (TP: ${pos["take_profit"]:.2f})')
            self.sweet_sell(asset, price, f'TP_{SWEET["TAKE_PROFIT"]}%')
            return True
        
        # 3. Trailing Stop (se activa cuando sube > trailing_activate %)
        gain = ((price - pos['entry']) / pos['entry']) * 100
        if gain > SWEET['TRAILING_ACTIVATE']:
            if price > pos['highest']:
                pos['highest'] = price
            drawdown = ((pos['highest'] - price) / pos['highest']) * 100
            if drawdown >= SWEET['TRAILING_DISTANCE']:
                logger.info(f'{asset}: TRAILING STOP {drawdown:.2f}% desde ${pos["highest"]:.2f}')
                self.sweet_sell(asset, price, f'TRAILING_{SWEET["TRAILING_DISTANCE"]}%')
                return True
        
        # 4. Señal de venta por score
        if score and score['signal'] in ('VENTA', 'CAPITULACION'):
            logger.info(f'{asset}: Señal VENTA ({score["signal"]})')
            self.sweet_sell(asset, price, score['signal'])
            return True
        
        return False
    
    def run_once(self):
        """Un ciclo de sweet trading (cada 30 segundos)."""
        try:
            self.update_balances()
            scores = get_scores_sweet()
            if not scores:
                return
            
            active_pos = len(self.positions)
            priority = ['SOL', 'XRP', 'ETH', 'BTC']
            
            for asset in priority:
                score = scores.get(asset)
                if not score or not CONFIG[asset].get('enabled', False):
                    continue
                
                price = score['price']
                signal = score['signal']
                total = score['total']
                pos = self.positions.get(asset)
                
                # Si estamos en posición, verificar salidas
                if pos:
                    self.check_exits(asset, price, score)
                    continue  # No comprar si ya tenemos posición
                
                # Si no hay posición, verificar entradas
                if active_pos >= SWEET['MAX_POSITIONS']:
                    continue
                
                # Señales de compra
                should_buy = False
                buy_reason = ''
                
                if signal == 'SWEET_BUY' and total >= SWEET['BUY_MIN']:
                    should_buy = True
                    buy_reason = 'SWEET_BUY'
                elif signal == 'COMPRA' and total >= 65:
                    should_buy = True
                    buy_reason = 'COMPRA'
                elif signal == 'COMPRA_FUERTE' and total >= 78:
                    should_buy = True
                    buy_reason = 'COMPRA_FUERTE'
                
                if should_buy:
                    if self.sweet_buy(asset, price, score):
                        active_pos += 1
            
            self.log_state(scores)
            
        except Exception as e:
            logger.error(f'Error sweet cycle: {e}')
    
    def run_forever(self):
        """Loop principal del sweet bot."""
        logger.info('╔══════════════════════════════════════════════╗')
        logger.info('║   SONO BOT — SWEET TRADING REAL v1.0        ║')
        logger.info('║   Scalping 1m · Stops {:.1f}% · TPs {:.1f}%        ║'.format(SWEET['STOP_LOSS'], SWEET['TAKE_PROFIT']))
        logger.info('║   Activos: SOL, XRP, ETH                     ║')
        logger.info('║   Revisando cada {}s                          ║'.format(SWEET['CHECK_INTERVAL']))
        logger.info('╚══════════════════════════════════════════════╝')
        
        self.run_once()
        
        while True:
            try:
                time.sleep(SWEET['CHECK_INTERVAL'])
                self.run_once()
            except KeyboardInterrupt:
                logger.info('Sweet Bot detenido por usuario')
                # Cerrar posiciones abiertas al parar
                for asset in list(self.positions.keys()):
                    price = self.get_entry_price(asset)
                    if price:
                        self.sweet_sell(asset, price, 'SHUTDOWN')
                break
            except Exception as e:
                logger.error(f'Error crítico: {e}')
                time.sleep(SWEET['CHECK_INTERVAL'] * 3)

if __name__ == '__main__':
    print()
    print('  ╔═══════════════════════════════════════╗')
    print('  ║  SONO BOT — SWEET TRADING REAL v1.0   ║')
    print('  ║  🔥 Scalping en Pionex con $37 USDT   ║')
    print('  ╚═══════════════════════════════════════╝')
    print()
    
    balances = get_balances()
    if not balances:
        print('❌ Error conectando a Pionex')
        exit(1)
    
    usdt = balances.get('USDT', 0)
    btc = balances.get('BTC', 0) * 73700  # aprox
    sol = balances.get('SOL', 0) * 82
    xrp = balances.get('XRP', 0) * 1.32
    total_approx = usdt + (btc * 0.000144) + sol + xrp
    
    print(f'✅ Conectado a Pionex')
    print(f'💰 USDT: ${usdt:.2f}')
    print(f'📊 Equity total aprox: ${total_approx:.2f}')
    print()
    
    if usdt < SWEET['BUY_MIN']:
        print('⚠️  Saldo bajo. Sweet trading necesita >$5 para operar.')
    else:
        print(f'✅ Capital disponible para sweet trading: ${usdt:.2f}')
    
    print('🔥 Iniciando Sweet Bot...')
    print()
    
    bot = SweetBot()
    bot.run_forever()
