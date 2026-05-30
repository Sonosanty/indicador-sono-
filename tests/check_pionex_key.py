import json, hmac, hashlib, time, requests

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    c = json.load(f)
API_KEY = c['api_key']
API_SECRET = c['api_secret']

ts = str(int(time.time() * 1000))
raw = ts + 'GET' + '/api/v1/account/balances'
sig = hmac.new(API_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
h = {'API-KEY': API_KEY, 'API-TIMESTAMP': ts, 'API-SIGNATURE': sig}

r = requests.get('https://api.pionex.com/api/v1/account/balances', headers=h, timeout=10)
d = r.json()
print('result:', d.get('result'))
if d.get('result'):
    for b in d['data'].get('balances', []):
        free = float(b.get('free', 0))
        locked = float(b.get('locked', 0))
        if free > 0 or locked > 0:
            print('  ' + b['coin'] + ': ' + str(free) + ' free | ' + str(locked) + ' locked')
else:
    print('error:', d)
