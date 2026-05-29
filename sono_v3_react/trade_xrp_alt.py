"""Vende XRP y compra ALT en Pionex"""
import requests, json, time, hashlib, hmac

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    creds = json.load(f)

KEY = creds['api_key']
SECRET = creds['api_secret']
BASE = 'https://api.pionex.com'

def _sig(method, path, params=None, body=''):
    ts = int(time.time() * 1000)
    query = 'timestamp=' + str(ts)
    if params:
        sorted_p = sorted(params.items())
        query = '&'.join(f'{k}={v}' for k, v in sorted_p) + '&timestamp=' + str(ts)
    msg = method + path + '?' + query + body
    sig = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return query, sig

def pionex_get(path, params=None):
    query, sig = _sig('GET', path, params)
    url = BASE + path + '?' + query
    headers = {'PIONEX-KEY': KEY, 'PIONEX-SIGNATURE': sig, 'Content-Type': 'application/json'}
    r = requests.get(url, headers=headers, timeout=15)
    return r.json()

def pionex_post(path, data):
    body = json.dumps(data, separators=(',', ':'))
    query, sig = _sig('POST', path, None, body)
    url = BASE + path + '?' + query
    headers = {'PIONEX-KEY': KEY, 'PIONEX-SIGNATURE': sig, 'Content-Type': 'application/json'}
    r = requests.post(url, headers=headers, data=body, timeout=15)
    return r.json()

# 1. Check balances first
print('=== BALANCES ACTUALES ===')
bal = pionex_get('/api/v1/account/balances')
for b in bal.get('data', {}).get('balances', []):
    coin = b['coin']
    free = float(b.get('free', 0))
    frozen = float(b.get('frozen', 0))
    total = free + frozen
    if total > 0:
        print(f'  {coin}: {total:.6f} (free: {free:.6f}, frozen: {frozen:.6f})')

# 2. Check current prices
for pair in ['XRPUSDT', 'ALTUSDT']:
    r = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={pair}', timeout=5)
    print(f'  {pair}: ${float(r.json()["price"]):.4f}')

# 3. Sell 5 XRP (we have ~8.58)
print('\n=== VENDIENDO 5 XRP ===')
result = pionex_post('/api/v1/trade/order', {
    'symbol': 'XRP_USDT',
    'side': 'SELL',
    'type': 'MARKET',
    'size': '5.0'
})
print(f'  Result: {result}')

if result.get('result'):
    time.sleep(2)
    # 4. Buy ALT with USDT
    bal2 = pionex_get('/api/v1/account/balances')
    usdt_free = 0
    for b in bal2.get('data', {}).get('balances', []):
        if b['coin'] == 'USDT':
            usdt_free = float(b.get('free', 0))
            break
    
    print(f'\n=== COMPRANDO ALT con ${usdt_free:.2f} USDT ===')
    if usdt_free >= 10:
        result2 = pionex_post('/api/v1/trade/order', {
            'symbol': 'ALT_USDT',
            'side': 'BUY',
            'type': 'MARKET',
            'amount': str(round(usdt_free * 0.9, 2)),
            'amountType': 'QUOTE'
        })
        print(f'  Result: {result2}')
    else:
        print(f'  USDT insuficiente: ${usdt_free:.2f} (min $10)')
else:
    print('\nVenta fallida. Probando con menos XRP...')
    for size in ['3.0', '2.0', '1.0', '0.5']:
        print(f'\nIntentando vender {size} XRP...')
        result = pionex_post('/api/v1/trade/order', {
            'symbol': 'XRP_USDT',
            'side': 'SELL',
            'type': 'MARKET',
            'size': size
        })
        print(f'  Result: {result}')
        if result.get('result'):
            break
