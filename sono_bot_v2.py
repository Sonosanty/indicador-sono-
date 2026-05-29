"""
SONO BOT v2 - CORREGIDO
========================
Correcciones aplicadas según doc oficial Pionex:
https://pionex-doc.gitbook.io/apidocs/restful/orders/new-order

BUG ORIGINAL:
- MARKET SELL usaba 'amount' (parámetro de MARKET BUY)
- Pionex responde "empty size" cuando falta 'size' en SELL

REGLA OFICIAL PIONEX:
- MARKET BUY  -> parámetro 'amount' (en USDT a gastar)
- MARKET SELL -> parámetro 'size' (en token base a vender)

MÉTODO AJRAM APLICADO:
- Entrada: Score < 45 + F&G < 45
- Stop: -2%
- Target: +4% (ratio 1:2)
- Sin operar en euforia
- Cierre antes 17:00
"""

import json, hmac, hashlib, time, uuid, requests, logging, sys, math
from datetime import datetime

# ─── CREDENCIALES ────────────────────────
with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    _creds = json.load(f)
API_KEY = _creds['api_key']
API_SECRET = _creds['api_secret']
BASE_URL = 'https://api.pionex.com'

# ─── CONFIG MÉTODO AJRAM ────────────────
RISK_PCT = 0.02       # 2% riesgo por trade
TARGET_PCT = 0.04     # 4% objetivo (ratio 1:2)
STOP_PCT = 0.02       # 2% stop loss
MIN_ORDER_USDT = 10.0 # Mínimo Pionex
MAX_TRADES = 3        # Máximo simultáneos

PAPER_MODE = True     # True = simulado, False = real
PAPER_CAPITAL = 100.0 # Capital ficticio

# ─── LOGGING ─────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('sono_bot_v2.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger('SonoBot')

# ════════════════════════════════════════
# CLIENTE PIONEX CORREGIDO
# ════════════════════════════════════════
class PionexClient:
    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret.encode('utf-8')
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self._symbols_cache = {}  # cache símbolos

    def _sig(self, path, method='GET', params=None, body=None):
        if params is None:
            params = {}
        params['timestamp'] = str(int(time.time() * 1000))
        sp = sorted(params.items())
        q = '&'.join(f'{k}={v}' for k, v in sp)
        path_url = path + '?' + q
        msg = method.encode() + path_url.encode()
        if body:
            msg += json.dumps(body).encode()
        sig = hmac.new(self.api_secret, msg, hashlib.sha256).hexdigest()
        return path_url, sig

    def _request(self, method, path, params=None, body=None):
        path_url, sig = self._sig(path, method, params, body)
        headers = {
            'PIONEX-KEY': self.api_key,
            'PIONEX-SIGNATURE': sig,
            'Content-Type': 'application/json'
        }
        url = BASE_URL + path_url
        if method == 'GET':
            r = self.session.get(url, headers=headers, timeout=15)
        elif method == 'POST':
            r = self.session.post(url, headers=headers, data=json.dumps(body) if body else None, timeout=15)
        else:
            r = self.session.delete(url, headers=headers, timeout=15)
        return r.json()

    def get(self, path, params=None):
        return self._request('GET', path, params)

    def post(self, path, body=None):
        return self._request('POST', path, body=body)

    def get_symbol_info(self, symbol):
        """Obtiene precisión y mínimos del par."""
        if symbol in self._symbols_cache:
            return self._symbols_cache[symbol]
        r = self.get('/api/v1/common/symbols')
        for s in r.get('data', {}).get('symbols', []):
            if s.get('symbol') == symbol:
                info = {
                    'basePrecision': int(s.get('basePrecision', 6)),
                    'quotePrecision': int(s.get('quotePrecision', 2)),
                    'minTradeSize': float(s.get('minTradeSize', 0.0001)),
                    'minAmount': float(s.get('minAmount', 10)),
                }
                self._symbols_cache[symbol] = info
                return info
        # Fallback
        return {'basePrecision': 6, 'quotePrecision': 2, 'minTradeSize': 0.0001, 'minAmount': 10}

    def get_balances(self):
        """Obtiene balances no cero."""
        r = self.get('/api/v1/account/balances')
        if not r.get('result'):
            log.error(f'Error balances: {r}')
            return {}
        balances = {}
        for b in r['data']['balances']:
            free = float(b.get('free', 0))
            if free > 0.00000001:
                balances[b['coin']] = free
        return balances

    def get_price(self, symbol):
        """Obtiene precio actual del par."""
        r = self.get('/api/v1/market/tickers', {'symbol': symbol})
        tickers = r.get('data', {}).get('tickers', [])
        if not tickers:
            raise ValueError(f'No price for {symbol}')
        return float(tickers[0]['close'])

    # ─── MARKET BUY (usa 'amount' en USDT) ───
    def market_buy(self, symbol, usdt_amount):
        """Compra a mercado. amount = USDT a gastar."""
        if PAPER_MODE:
            price = self.get_price(symbol)
            size = usdt_amount / price
            log.info(f'[PAPER] BUY {symbol} ${usdt_amount:.2f} → {size:.6f} @ ${price:.4f}')
            return {'paper': True, 'price': price, 'size': size, 'amount': usdt_amount}

        log.info(f'BUY {symbol} ${usdt_amount:.2f}')
        result = self.post('/api/v1/trade/order', {
            'symbol': symbol,
            'side': 'BUY',
            'type': 'MARKET',
            'amount': str(round(usdt_amount, 2)),
        })
        log.info(f'  Result: {json.dumps(result, indent=2)[:300]}')
        return result

    # ─── MARKET SELL (usa 'size' en tokens base) ───
    def market_sell(self, symbol, size):
        """
        Vende 'size' tokens a mercado.
        CORREGIDO: usa 'size' (tokens base), NO 'amount'.
        Precisión redondeada según basePrecision del par.
        """
        info = self.get_symbol_info(symbol)
        precision = info['basePrecision']
        min_trade = info['minTradeSize']

        # Redondear hacia ABAJO para no exceder balance
        rounded = math.floor(size * (10 ** precision)) / (10 ** precision)

        if rounded < min_trade:
            log.error(f'{symbol}: size {rounded} < minTradeSize {min_trade}')
            return None

        if PAPER_MODE:
            price = self.get_price(symbol)
            usdt = rounded * price
            log.info(f'[PAPER] SELL {symbol} {rounded:.{precision}f} → ${usdt:.2f} @ ${price:.4f}')
            return {'paper': True, 'price': price, 'size': rounded, 'usdt': usdt}

        result = self.post('/api/v1/trade/order', {
            'symbol': symbol,
            'side': 'SELL',
            'type': 'MARKET',
            'size': str(rounded),
        })
        log.info(f'SELL {symbol} {rounded} -> {json.dumps(result, indent=2)[:300]}')
        return result

    def sell_all(self, coin):
        """Vende TODO el balance libre de una moneda."""
        balances = self.get_balances()
        size = balances.get(coin, 0)
        if size <= 0:
            log.warning(f'No {coin} balance to sell')
            return None
        symbol = f'{coin}_USDT'
        log.info(f'Sell all {coin} ({size:.6f})')
        return self.market_sell(symbol, size)

# ════════════════════════════════════════
# SEÑALES MÉTODO AJRAM
# ════════════════════════════════════════
def get_fear_greed():
    try:
        r = requests.get('https://api.alternative.me/fng/', timeout=5)
        return int(r.json()['data'][0]['value'])
    except:
        return 50

def get_binance_24h(symbol='BTCUSDT'):
    try:
        r = requests.get(f'https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}', timeout=5)
        d = r.json()
        return {'price': float(d['lastPrice']), 'change_pct': float(d['priceChangePercent'])}
    except:
        return {'price': 0, 'change_pct': 0}

def calculate_score(fg, change_pct):
    """Score Sono 0-100. Bajo = miedo/oportunidad, Alto = euforia."""
    fg_weight = 0.7
    price_weight = 0.3
    if change_pct < -5: ps = 20
    elif change_pct < -2: ps = 35
    elif change_pct < 0: ps = 45
    elif change_pct < 2: ps = 55
    elif change_pct < 5: ps = 65
    else: ps = 80
    return max(0, min(100, int(fg * fg_weight + ps * price_weight)))

def check_signal(score, fg):
    """Señal Ajram: comprar en miedo."""
    if score < 35 and fg < 30:
        return ('STRONG_LONG', 0.85, f'Pánico score={score} fg={fg}')
    if score < 45 and fg < 45:
        return ('LONG', 0.70, f'Acumulación score={score} fg={fg}')
    if score > 75 and fg > 75:
        return ('NO_TRADE', 0.0, f'Euforia score={score} fg={fg} — esperar')
    return ('WAIT', 0.0, f'Neutral score={score} fg={fg}')

# ════════════════════════════════════════
# GESTOR DE POSICIONES
# ════════════════════════════════════════
class PositionManager:
    def __init__(self, client):
        self.client = client
        self.positions = {}
        self.trades = []
        self._load_history()

    def open_position(self, symbol, usdt_amount):
        if symbol in self.positions:
            log.warning(f'Ya abierta {symbol}')
            return False
        if usdt_amount < MIN_ORDER_USDT:
            log.warning(f'${usdt_amount:.2f} < mínimo ${MIN_ORDER_USDT}')
            return False

        result = self.client.market_buy(symbol, usdt_amount)
        if not result:
            return False

        if result.get('paper'):
            entry = result['price']
            size = result['size']
        else:
            time.sleep(1.5)
            oid = result.get('data', {}).get('orderId')
            if oid:
                oinfo = self.client.get(f'/api/v1/trade/order', {'symbol': symbol, 'orderId': str(oid)})
                d = oinfo.get('data', {})
                entry = float(d.get('price', 0)) or result.get('price', 0)
                size = float(d.get('filledSize', 0)) or result.get('size', 0)
            else:
                return False

        if entry <= 0 or size <= 0:
            log.error(f'Fill inválido: price={entry} size={size}')
            return False

        stop = entry * (1 - STOP_PCT)
        target = entry * (1 + TARGET_PCT)

        self.positions[symbol] = {
            'symbol': symbol, 'entry': entry, 'size': size,
            'invested': usdt_amount, 'stop': stop, 'target': target,
            'time': datetime.now().isoformat(),
            'paper': result.get('paper', False)
        }
        log.info(f'✅ LONG {symbol} ${usdt_amount:.2f} @ ${entry:.4f} '
                 f'SL=${stop:.4f} TP=${target:.4f}')
        return True

    def close_position(self, symbol, reason):
        if symbol not in self.positions:
            return False
        pos = self.positions[symbol]
        result = self.client.market_sell(symbol, pos['size'])
        if not result:
            return False

        if result.get('paper'):
            exit_p = result['price']
        else:
            oid = result.get('data', {}).get('orderId')
            if oid:
                time.sleep(1)
                oinfo = self.client.get(f'/api/v1/trade/order', {'symbol': symbol, 'orderId': str(oid)})
                exit_p = float(oinfo.get('data', {}).get('price', pos['entry']))
            else:
                exit_p = pos['entry']

        pnl_pct = ((exit_p - pos['entry']) / pos['entry']) * 100
        pnl_usd = pos['invested'] * (pnl_pct / 100)
        label = 'WIN ✅' if pnl_usd > 0 else 'LOSS ❌'

        log.info(f'{label} CLOSE {symbol} ${pos["entry"]:.4f}→${exit_p:.4f} '
                 f'{pnl_pct:+.2f}% (${pnl_usd:+.2f}) {reason}')

        record = {**pos, 'exit': exit_p, 'exit_time': datetime.now().isoformat(),
                  'pnl_pct': pnl_pct, 'pnl_usd': pnl_usd,
                  'result': 'WIN' if pnl_usd > 0 else 'LOSS', 'reason': reason}
        self.trades.append(record)
        self._save_history()
        del self.positions[symbol]
        return True

    def check_stops(self, symbol, price):
        if symbol not in self.positions:
            return
        p = self.positions[symbol]
        if price <= p['stop']:
            self.close_position(symbol, 'STOP_LOSS')
        elif price >= p['target']:
            self.close_position(symbol, 'TAKE_PROFIT')

    def stats(self):
        if not self.trades:
            log.info('Sin trades aún')
            return
        wins = [t for t in self.trades if t['result'] == 'WIN']
        losses = [t for t in self.trades if t['result'] == 'LOSS']
        wr = len(wins) / len(self.trades) * 100
        aw = sum(t['pnl_pct'] for t in wins) / len(wins) if wins else 0
        al = sum(t['pnl_pct'] for t in losses) / len(losses) if losses else 0
        total = sum(t['pnl_usd'] for t in self.trades)
        pf = abs(sum(t['pnl_usd'] for t in wins)) / abs(sum(t['pnl_usd'] for t in losses)) if losses else float('inf')

        log.info(f'📊 STATS | Trades:{len(self.trades)} WR:{wr:.1f}% PF:{pf:.2f} '
                 f'AvgW:{aw:+.2f}% AvgL:{al:+.2f}% PnL:${total:+.2f}')
        if wr > 55 and pf > 1.5:
            log.info('✅ ESTRATEGIA VÁLIDA — listo para real')
        elif len(self.trades) < 30:
            log.info(f'⏳ {30 - len(self.trades)} trades más para validar')
        else:
            log.info('❌ NO VALIDADA — ajustar parámetros')

    def _save_history(self):
        with open('trades_history_v2.json', 'w') as f:
            json.dump(self.trades, f, indent=2)

    def _load_history(self):
        try:
            with open('trades_history_v2.json') as f:
                self.trades = json.load(f)
        except:
            self.trades = []

# ════════════════════════════════════════
# CLEANUP: vender posiciones huérfanas
# ════════════════════════════════════════
def cleanup(client):
    """Vende todo el balance de activos no-USDT."""
    log.info('🧹 Limpieza de posiciones huérfanas...')
    balances = client.get_balances()
    log.info(f'Balances: {balances}')
    for coin, size in balances.items():
        if coin in ('USDT', 'USDC'):
            continue
        symbol = f'{coin}_USDT'
        log.info(f'Vendiendo {coin} {size:.6f}')
        r = client.market_sell(symbol, size)
        log.info(f'Resultado: {json.dumps(r, indent=2)[:200] if r else "None"}')
        time.sleep(1)
    log.info('✅ Limpieza completada')
    final = client.get_balances()
    log.info(f'Balance final: {final}')

# ════════════════════════════════════════
# LOOP PRINCIPAL
# ════════════════════════════════════════
def main():
    mode = '📄 PAPER' if PAPER_MODE else '🔥 REAL'
    log.info(f'🚀 SONO BOT v2 — Modo: {mode}')
    log.info(f'   Método Ajram | Stop:{STOP_PCT*100:.0f}% Target:{TARGET_PCT*100:.0f}% '
             f'Max:{MAX_TRADES} trades')

    client = PionexClient(API_KEY, API_SECRET)
    mgr = PositionManager(client)

    if PAPER_MODE:
        capital = PAPER_CAPITAL
    else:
        bal = client.get_balances()
        capital = bal.get('USDT', 0)
        log.info(f'Capital real: ${capital:.2f}')
        log.info(f'Balances: {bal}')

    active_symbols = ['SOL_USDT', 'XRP_USDT', 'ETH_USDT', 'BTC_USDT']
    iter_no = 0

    while True:
        iter_no += 1
        log.info(f'--- [{datetime.now().strftime("%H:%M:%S")}] Iter {iter_no} ---')

        try:
            fg = get_fear_greed()
            btc = get_binance_24h()
            score = calculate_score(fg, btc.get('change_pct', 0))
            signal, confidence, reason = check_signal(score, fg)
            log.info(f'F&G:{fg} Score:{score} Señal:{signal} ({reason})')

            # Verificar stops
            for sym in list(mgr.positions.keys()):
                try:
                    mgr.check_stops(sym, client.get_price(sym))
                except Exception as e:
                    log.error(f'Stop check {sym}: {e}')

            # Entrar si hay señal
            if signal in ('LONG', 'STRONG_LONG'):
                if len(mgr.positions) >= MAX_TRADES:
                    log.info(f'Max trades ({MAX_TRADES}) alcanzado')
                else:
                    # Escoger activo: priorizar SOL/XRP
                    target = 'SOL_USDT'  # o rotar según momentum
                    invest = min(capital * RISK_PCT / STOP_PCT, capital * 0.25)
                    invest = max(MIN_ORDER_USDT, invest)
                    mgr.open_position(target, invest)

            # Regla Ajram: cerrar a las 16:55
            now = datetime.now()
            if now.hour == 16 and now.minute >= 55:
                log.info('⏰ 16:55 — Cerrando todo (regla Ajram)')
                for sym in list(mgr.positions.keys()):
                    mgr.close_position(sym, 'CIERRE_FIN_DIA')

            # Stats cada 10
            if iter_no % 10 == 0:
                mgr.stats()

        except Exception as e:
            log.error(f'Error: {e}', exc_info=True)

        time.sleep(30)

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'cleanup':
        c = PionexClient(API_KEY, API_SECRET)
        cleanup(c)
    else:
        main()
