import json, hmac, hashlib, time, uuid, requests

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    _creds = json.load(f)
API_KEY = _creds['api_key']
API_SECRET = _creds['api_secret']

BASE = 'https://api.pionex.com'
def sign(method, path, body=''):
    ts = str(int(time.time() * 1000))
    raw = ts + method + path + body
    sig = hmac.new(API_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return {'API-KEY': API_KEY, 'API-TIMESTAMP': ts, 'API-SIGNATURE': sig}

# Balances
h = sign('GET', '/api/v1/account/balances')
r = requests.get(BASE + '/api/v1/account/balances', headers=h, timeout=10)
data = r.json()
print('=== BALANCES PIONEX ===')
if data.get('result'):
    for b in data['data'].get('balances', []):
        free = float(b.get('free', 0))
        locked = float(b.get('locked', 0))
        if free > 0 or locked > 0:
            print('  ' + b['coin'] + ': ' + str(free) + ' free | ' + str(locked) + ' locked')
else:
    print('  Error:', data)

# Ordenes abiertas
print()
h2 = sign('GET', '/api/v1/trade/orders')
r2 = requests.get(BASE + '/api/v1/trade/orders', headers=h2, timeout=10)
data2 = r2.json()
print('=== ORDENES ABIERTAS ===')
if data2.get('result'):
    orders = data2['data'].get('orders', [])
    if orders:
        for o in orders:
            print('  ' + o['symbol'] + ' | ' + o['side'] + ' | ' + o['type'] + ' | ' + o['status'] + ' | price: ' + o.get('price','?'))
    else:
        print('  No hay ordenes abiertas')
else:
    print('  Error:', data2)

# Log
print()
try:
    with open('C:/Users/sparreno/.openclaw/workspace/sono_bot_v2.log') as f:
        lines = f.readlines()
        print('=== ULTIMAS 15 LINEAS DEL LOG ===')
        for l in lines[-15:]:
            print('  ' + l.strip())
except Exception as e:
    print('  No se pudo leer el log:', e)
