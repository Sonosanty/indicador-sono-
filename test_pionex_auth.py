import json, hmac, hashlib, time, requests

API_KEY = "***"
API_SECRET = "Xr8sax…k5Jj"

BASE = "https://api.pionex.com"

# Prueba 1: formato ESTÁNDAR Pionex (mayúsculas en headers)
ts = str(int(time.time() * 1000))
method = "GET"
path = "/api/v1/account/balances"
raw = ts + method + path
sig = hmac.new(API_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
h1 = {"API-KEY": API_KEY, "API-TIMESTAMP": ts, "API-SIGNATURE": sig}

print("=== PRUEBA 1: GET balances ===")
r1 = requests.get(BASE + path, headers=h1, timeout=10)
print("Status:", r1.status_code)
print("Resp:", json.dumps(r1.json(), indent=2)[:300])
print()

# Prueba 2: Probar el endpoint de account/info para ver si existe la key
print("=== PRUEBA 2: GET account info ===")
r2 = requests.get(BASE + "/api/v1/account", headers=h1, timeout=10)
print("Status:", r2.status_code)
try:
    print("Resp:", json.dumps(r2.json(), indent=2)[:300])
except:
    print("Resp:", r2.text[:300])
print()

# Prueba 3: Probar con otro endpoint - tickers
ts3 = str(int(time.time() * 1000))
raw3 = ts3 + "GET" + "/api/v1/market/tickers"
sig3 = hmac.new(API_SECRET.encode(), raw3.encode(), hashlib.sha256).hexdigest()
h3 = {"API-KEY": API_KEY, "API-TIMESTAMP": ts3, "API-SIGNATURE": sig3}

print("=== PRUEBA 3: GET tickers (sin auth) ===")
r3 = requests.get(BASE + "/api/v1/market/tickers?symbol=BTC_USDT", timeout=10)
print("Status:", r3.status_code)
try:
    print("Resp:", json.dumps(r3.json(), indent=2)[:300])
except:
    print("Resp:", r3.text[:300])
