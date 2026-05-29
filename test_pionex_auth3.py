import json, hmac, hashlib, time, requests

API_KEY = "***"
API_SECRET = "***"

BASE = "https://api.pionex.com"

def sign(method, path, params=None, body=''):
    """Firma oficial Pionex — query string ordenado + timestamp"""
    ts = str(int(time.time() * 1000))
    
    # Construir query params con timestamp
    q = {}
    if params:
        q.update(params)
    q['timestamp'] = ts
    
    # Ordenar y construir query string
    qs = '&'.join(f"{k}={v}" for k, v in sorted(q.items()))
    
    # PATH + ? + qs
    path_url = path + '?' + qs
    
    # METHOD + path_url + body (solo POST/DELETE)
    raw = method + path_url
    if body:
        raw += body
    
    sig = hmac.new(API_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    
    headers = {
        'PIONEX-KEY': API_KEY,
        'PIONEX-SIGNATURE': sig,
        'PIONEX-TIMESTAMP': ts,
    }
    return headers, path_url

# PRUEBA 1: Sin query params extra (solo timestamp)
print("=== PRUEBA 1: GET balances (solo timestamp) ===")
h1, url1 = sign('GET', '/api/v1/account/balances')
print("URL:", BASE + url1)
print("Signature:", h1['PIONEX-SIGNATURE'][:30] + '...')
r1 = requests.get(BASE + url1, headers=h1, timeout=10)
d1 = r1.json()
print("Status:", r1.status_code)
print("Resp:", json.dumps(d1, indent=2)[:500])
print()

# PRUEBA 2: Con query params adicionales
if d1.get('result'):
    print("=== PRUEBA 2: GET ordenes abiertas ===")
    h2, url2 = sign('GET', '/api/v1/trade/orders', {'status': 'OPEN'})
    r2 = requests.get(BASE + url2, headers=h2, timeout=10)
    d2 = r2.json()
    print("Resp:", json.dumps(d2, indent=2)[:500])
else:
    # PRUEBA 3: Intentar con otro endpoint - market/info
    print("=== PRUEBA 3: GET market info ===")
    h3, url3 = sign('GET', '/api/v1/market/info')
    r3 = requests.get(BASE + url3, headers=h3, timeout=10)
    d3 = r3.json()
    print("Status:", r3.status_code)
    print("Resp:", json.dumps(d3, indent=2)[:500])
