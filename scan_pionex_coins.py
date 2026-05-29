"""Scan ALL Pionex pairs + Binance data for volatility and trend analysis"""
import requests, json, time, hashlib, hmac, math, sys
from datetime import datetime

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    creds = json.load(f)

key = creds['api_key']
secret = creds['api_secret']

# 1. Get ALL tradable symbols from Pionex
ts = int(time.time() * 1000)
payload = 'timestamp=' + str(ts)
sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
url = 'https://api.pionex.com/api/v1/common/symbols?' + payload + '&signature=' + sig
r = requests.get(url, timeout=15)
data = r.json()

# Parse the symbols list
symbols_list = []
raw = data.get('data', {})
if isinstance(raw, dict):
    for item in raw.get('symbols', []):
        s = item.get('symbol', '')
        if s:
            symbols_list.append(s)
elif isinstance(raw, list):
    for item in raw:
        s = item.get('symbol', '')
        if s:
            symbols_list.append(s)

print(f'Pionex: {len(symbols_list)} total pairs')

# 2. Filter unique coins (different quote pairs = same coin)
coins = {}
for s in symbols_list:
    for quote in ['USDT', 'USDC', 'BTC', 'ETH']:
        if s.endswith('_' + quote):
            base = s.replace('_' + quote, '')
            if base not in coins:
                coins[base] = []
            coins[base].append(quote)
            break

print(f'Unique coins on Pionex: {len(coins)}')

# 3. From Binance, get top 200 tickers by 24h volume + volatility
r = requests.get('https://api.binance.com/api/v3/ticker/24hr', timeout=15)
tickers = r.json()

# Filter only USDT pairs
results = []
for t in tickers:
    s = t['symbol']
    if not s.endswith('USDT'):
        continue
    base = s.replace('USDT', '')
    if base in ('UP', 'DOWN', 'BULL', 'BEAR', 'BUSD', 'USDC'):
        continue
    try:
        vol = float(t['quoteVolume'])
        change = float(t['priceChangePercent'])
        high = float(t['highPrice'])
        low = float(t['lowPrice'])
        last = float(t['lastPrice'])
        if last <= 0:
            continue
        volatility = ((high - low) / low) * 100
        # Normalize: volatility / price level factor
        # Higher volatility = more movement
        results.append({
            'symbol': s,
            'base': base,
            'price': last,
            'change_24h': round(change, 2),
            'volatility_24h': round(volatility, 2),
            'volume_24h_usd': round(vol / 1e6, 1),  # in millions
            'on_pionex': base in coins
        })
    except:
        continue

# Sort by volatility descending
results.sort(key=lambda x: x['volatility_24h'], reverse=True)

# 4. Get additional data for top coins (week trend)
def get_weekly_trend(symbol):
    end = int(time.time() * 1000)
    start = end - 7 * 24 * 60 * 60 * 1000
    try:
        r = requests.get(
            f'https://api.binance.com/api/v3/klines?symbol={symbol}USDT&interval=1d&limit=7&startTime={start}&endTime={end}',
            timeout=10
        )
        candles = r.json()
        if not candles or len(candles) < 2:
            return 0, 0, 0
        open_price = float(candles[0][1])
        close_price = float(candles[-1][4])
        week_change = ((close_price - open_price) / open_price) * 100
        
        # RSI weekly
        closes = [float(k[4]) for k in candles]
        gains = [max(closes[i]-closes[i-1],0) for i in range(1,len(closes))]
        losses = [max(closes[i-1]-closes[i],0) for i in range(1,len(closes))]
        avg_g = sum(gains)/max(len(gains),1)
        avg_l = sum(losses)/max(len(losses),1)
        rsi = 100 - 100/(1+avg_g/avg_l) if avg_l > 0 else 100
        
        return round(week_change, 2), round(rsi, 1), round((high_low/high)*100) if (high_low:=float(max(k[2] for k in candles))-float(min(k[3] for k in candles))) else 0
    except:
        return 0, 0, 0

# For each of the top volatile coins, get weekly data
top_vol = results[:50]
for item in top_vol:
    w_change, rsi_7d, _ = get_weekly_trend(item['base'])
    item['change_7d'] = w_change
    item['rsi_7d'] = rsi_7d

# Print report sections

print()
print('=' * 100)
print('TOP 30 MAS VOLATILES (24h) - TODOS LOS PARES')
print('=' * 100)
print(f'{"#":>3} {"Coin":>8} {"Price":>12} {"Volat 24h":>10} {"Chg 24h":>8} {"Chg 7d":>8} {"RSI 7d":>7} {"Vol(MM)":>8} {"Pionex":>7}')
print('-' * 100)
for i, item in enumerate(results[:30]):
    print(f'{i+1:>3} {item["base"]:>8} ${item["price"]:>10,.4f} {item["volatility_24h"]:>8.1f}% {item["change_24h"]:>+7.1f}% {item.get("change_7d",0):>+7.1f}% {item.get("rsi_7d",0):>6.1f} {item["volume_24h_usd"]:>7.1f}M {"YES" if item["on_pionex"] else "NO":>7}')

# Summary by volatility tiers
print()
print('=' * 100)
print('RESUMEN POR CATEGORIA')
print('=' * 100)
high_vol = [r for r in results if r['volatility_24h'] > 10]
med_vol = [r for r in results if 5 <= r['volatility_24h'] <= 10]
low_vol = [r for r in results if r['volatility_24h'] < 5]
print(f'Volatilidad ALTA (>10%): {len(high_vol)} coins')
if high_vol:
    for r in high_vol[:5]:
        print(f'  {r["base"]}: {r["volatility_24h"]}% | ${r["price"]} | Chg: {r["change_24h"]}%')
print(f'Volatilidad MEDIA (5-10%): {len(med_vol)} coins')
print(f'Volatilidad BAJA (<5%): {len(low_vol)} coins')

# Coins ON PIONEX sorted by volatility
print()
print('=' * 100)
print('COINS EN PIONEX - ORDENADAS POR VOLATILIDAD')
print('=' * 100)
pionex_coins = [r for r in results if r['on_pionex']]
pionex_coins.sort(key=lambda x: x['volatility_24h'], reverse=True)
for item in pionex_coins[:20]:
    print(f'{item["base"]:>8} | Volat 24h: {item["volatility_24h"]:>6.1f}% | ${item["price"]:>10,.4f} | 24h: {item["change_24h"]:>+6.1f}% | 7d: {item.get("change_7d",0):>+6.1f}% | RSI 7d: {item.get("rsi_7d",0):>5.1f} | Vol: {item["volume_24h_usd"]}M')

# Our 4 assets ranking
print()
print('=' * 100)
print('TUS 4 ACTIVOS - COMPARATIVA')
print('=' * 100)
our = ['BTC', 'ETH', 'SOL', 'XRP']
for base in our:
    for r in results:
        if r['base'] == base:
            print(f'{base:>4} | Volat: {r["volatility_24h"]:>5.1f}% | ${r["price"]:>10,.2f} | 24h: {r["change_24h"]:>+6.1f}% | 7d: {r.get("change_7d",0):>+6.1f}% | RSI 7d: {r.get("rsi_7d",0):>5.1f} | Vol: {r["volume_24h_usd"]}M')
            break
