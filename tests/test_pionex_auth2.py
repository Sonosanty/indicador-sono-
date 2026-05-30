import json, hmac, hashlib, time, requests

API_KEY = "***"
API_SECRET = "***"

BASE = "https://api.pionex.com"

def sign(method, path, params=None, body=''):
    """Firma HMAC-SHA256 estilo Pionex (documentación oficial)"""
    ts = str(int(time.time() * 1000))
    
    # Construir query params: incluir siempre timestamp
    qparams = {}
    if params:
        qparams.update(params)
    qparams['timestamp'] = ts
    
    # Ordenar alfabéticamente por clave y concatenar con &
    sorted_qs = '&'.join(f"{k}={v}" for k, v in sorted(qparams.items()))
    
    # PATH + ? + query string ordenado
    path_url = path + '?' + sorted_qs
    
    # METHOD + PATH_URL + body (solo para POST/DELETE)
    raw = method + path_url
    if body:
        raw += body
    
    # HMAC-SHA256
    sig = hmac.new(API_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    
    headers = {
        'PIONEX-KEY': API_KEY,
        'PIONEX-SIGNATURE': sig,
        'PIONEX-TIMESTAMP': ts,
    }
    return headers, path_url

# PRUEBA: GET balances (sin query params extra)
print("=== PRUEBA: GET balances (formato Pionex oficial) ===")
h, url = sign('GET', '/api/v1/account/balances')
full_url = BASE + url
print("URL:", full_url[:80] + '...')
print("Headers:", {k: v[:20] + '...' for k, v in h.items()})

r = requests.get(full_url, headers=h, timeout=10)
d = r.json()
print("Status:", r.status_code)
print("Respuesta:", json.dumps(d, indent=2)[:500])
print()

# Si funciona, también probar órdenes abiertas
if d.get('result'):
    print("=== PRUEBA 2: GET ordenes abiertas ===")
    h2, url2 = sign('GET', '/api/v1/trade/orders', {'status': 'OPEN'})
    r2 = requests.get(BASE + url2, headers=h2, timeout=10)
    d2 = r2.json()
    print("Respuesta:", json.dumps(d2, indent=2)[:500])
