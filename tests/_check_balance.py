import json, requests, time, hashlib, hmac
with open('pionex_credentials.json') as f:
    c = json.load(f)
key = c['api_key']
secret = c['api_secret']
ts = str(int(time.time()*1000))
q = 'timestamp=' + ts
m = 'GET' + '/api/v1/account/balances?' + q
s = hmac.new(secret.encode(), m.encode(), hashlib.sha256).hexdigest()
r = requests.get('https://api.pionex.com/api/v1/account/balances?' + q, headers={'PIONEX-KEY':key,'PIONEX-SIGNATURE':s}, timeout=15)
d = r.json()

# Precios actuales vía Binance
prices = {}
for sym in ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT']:
    try:
        pr = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={sym}', timeout=10)
        p = pr.json()
        prices[sym.replace('USDT','')] = float(p['price'])
    except:
        pass

total_usd = 0
print("=== BALANCE PIONEX ===")
for b in d.get('data',{}).get('balances',[]):
    amt = float(b['free'])
    if amt > 0:
        coin = b['coin']
        if coin == 'USDT' or coin == 'USDC':
            val = amt
        elif coin in prices:
            val = amt * prices[coin]
        else:
            val = 0
        total_usd += val
        coin_prices_str = f" @ ${prices[coin]:.2f}" if coin in prices else ""
        print(f"  {coin}: {amt:.6f}{coin_prices_str} = ${val:.2f}")

print(f"\n💰 TOTAL: ${total_usd:.2f}")
print(f"📊 Composición:")
print(f"   USDT/USDC: ${total_usd:.2f} en stablecoins")
for b in d.get('data',{}).get('balances',[]):
    amt = float(b['free'])
    if amt > 0 and b['coin'] not in ('USDT','USDC'):
        coin = b['coin']
        val = amt * prices.get(coin, 0)
        pct = (val / total_usd * 100) if total_usd > 0 else 0
        print(f"   {coin}: ${val:.2f} ({pct:.1f}%)")
