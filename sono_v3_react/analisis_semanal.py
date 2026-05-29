"""Analisis semanal de las 4 criptomonedas con datos reales de Binance + CoinGecko + Fear&Greed"""
import requests, json, time, math
from datetime import datetime, timezone

assets = {
    'BTC': 'btcusdt',
    'ETH': 'ethusdt',
    'SOL': 'solusdt',
    'XRP': 'xrpusdt'
}

results = {}

for name, pair in assets.items():
    # 1. Precio actual + cambio 24h
    r = requests.get(f'https://api.binance.com/api/v3/ticker/24hr?symbol={pair.upper()}', timeout=10)
    t = r.json()
    price = float(t['lastPrice'])
    change_24h = float(t['priceChangePercent'])
    high_24h = float(t['highPrice'])
    low_24h = float(t['lowPrice'])
    volume = float(t['volume'])
    
    # 2. Velas 7 dias (1h) para tendencia
    end = int(time.time() * 1000)
    start = end - 7 * 24 * 60 * 60 * 1000
    r = requests.get(f'https://api.binance.com/api/v3/klines?symbol={pair.upper()}&interval=1h&limit=168&startTime={start}&endTime={end}', timeout=10)
    candles = r.json()
    
    closes = [float(k[4]) for k in candles]
    highs = [float(k[2]) for k in candles]
    lows = [float(k[3]) for k in candles]
    
    # RSI 14h
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i-1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    
    avg_gain = sum(gains[-14:]) / 14 if len(gains) >= 14 else 0
    avg_loss = sum(losses[-14:]) / 14 if len(losses) >= 14 else 1
    rs = avg_gain / avg_loss if avg_loss > 0 else 0
    rsi = 100 - (100 / (1 + rs))
    
    # ATR 14h
    tr_list = []
    for i in range(1, len(candles)):
        h = float(candles[i][2])
        l = float(candles[i][3])
        pc = float(candles[i-1][4])
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    atr = sum(tr_list[-14:]) / 14 if len(tr_list) >= 14 else 0
    atr_pct = (atr / closes[-1]) * 100
    
    # MA20 y MA50
    ma20 = sum(closes[-20:]) / min(20, len(closes))
    ma50 = sum(closes[-50:]) / min(50, len(closes))
    
    # Price vs MAs
    vs_ma20 = ((closes[-1] - ma20) / ma20) * 100
    vs_ma50 = ((closes[-1] - ma50) / ma50) * 100
    
    # Support / Resistance semanal
    support = min(lows[-7:])
    resistance = max(highs[-7:])
    
    # Bollinger
    mean = sum(closes[-20:]) / 20
    variance = sum((x - mean) ** 2 for x in closes[-20:]) / 20
    std = math.sqrt(variance)
    bb_upper = mean + 2 * std
    bb_lower = mean - 2 * std
    bb_position = ((closes[-1] - bb_lower) / (bb_upper - bb_lower)) * 100
    
    # Volume trend
    vol7 = [float(k[5]) for k in candles[-168:]]  # 7d
    vol_trend = 'CRECIENTE' if vol7[-1] > sum(vol7[-24:])/24 else 'DECRECIENTE'
    
    results[name] = {
        'price': price,
        'change_24h': change_24h,
        'high_24h': high_24h,
        'low_24h': low_24h,
        'volume': volume,
        'rsi_14h': round(rsi, 1),
        'atr_pct': round(atr_pct, 2),
        'ma20': round(ma20, 2),
        'ma50': round(ma50, 2),
        'vs_ma20': round(vs_ma20, 2),
        'vs_ma50': round(vs_ma50, 2),
        'support_7d': support,
        'resistance_7d': resistance,
        'bb_position': round(bb_position, 1),
        'vol_trend': vol_trend,
        'vol_7d_avg': round(sum(vol7) / len(vol7), 2),
    }
    
    print(f'\n=== {name} \u20bf {price}')
    print(f'  24h: {change_24h:+.2f}% | RSI 14h: {rsi:.1f}')
    print(f'  MA20: ${ma20:.2f} ({vs_ma20:+.2f}%) | MA50: ${ma50:.2f} ({vs_ma50:+.2f}%)')
    print(f'  S/R 7d: ${support:.2f} / ${resistance:.2f}')
    print(f'  ATR: {atr_pct:.2f}% | BB pos: {bb_position:.1f}%')
    print(f'  Vol: {vol_trend} | Vol 7d avg: {sum(vol7)/len(vol7):.0f}')

# Fear & Greed
r = requests.get('https://api.alternative.me/fng/?limit=1', timeout=10)
fng = r.json()
fng_val = int(fng['data'][0]['value'])
print(f'\n=== MACRO ===')
print(f'  Fear & Greed: {fng_val}/100 ({fng["data"][0]["value_classification"]})')

# CoinGecko dominancia
r = requests.get('https://api.coingecko.com/api/v3/global', timeout=10)
data = r.json()['data']
print(f'  BTC Dominance: {data["market_cap_percentage"]["btc"]:.1f}%')
print(f'  ETH Dominance: {data["market_cap_percentage"]["eth"]:.1f}%')
total_mcap = data['total_market_cap']['usd']
print(f'  Total Market Cap: ${total_mcap:.0f}')

# RANKING semanal
print('\n=== RANKING SEMANAL ===')
scores = {}
for name, r in results.items():
    score = 0
    # RSI: 30-70 rango optimo, puntos extra si esta en zona de sobreventa (<35)
    if 30 <= r['rsi_14h'] <= 70:
        score += 2
    if r['rsi_14h'] < 35:
        score += 3  # Sobreventa -> potencial rebote
    
    # Price vs MA20 (por debajo = potencial, lejos por encima = sobrecomprado)
    if -5 <= r['vs_ma20'] <= 2:
        score += 2  # Cerca de MA20, listo para romper
    elif r['vs_ma20'] < -5:
        score += 1  # Descontado, posible rebote
    else:
        score -= 1  # Lejos por encima, sobrecomprado
        
    # BB position: entre 20-60 es ideal, <20 sobreventa
    if 20 <= r['bb_position'] <= 60:
        score += 2
    elif r['bb_position'] < 20:
        score += 2  # Sobreventa = oportunidad
    else:
        score -= 1
    
    # ATR (volatilidad moderada = mejor)
    if 1 <= r['atr_pct'] <= 4:
        score += 2
    elif r['atr_pct'] < 1:
        score += 1  # Muy plano
    else:
        score -= 1  # Muy volatil
    
    # Volumen creciente = señal positiva
    if r['vol_trend'] == 'CRECIENTE':
        score += 1
    
    # Cambio 24h: neutro o ligeramente negativo es mejor (comprar en debilidad)
    if -3 <= r['change_24h'] <= 1:
        score += 1
    
    scores[name] = score
    print(f'  {name}: {score}/11 pts | Precio: ${r["price"]} | RSI: {r["rsi_14h"]} | MA20: {r["vs_ma20"]:+.1f}% | BB: {r["bb_position"]:.0f}% | Vol: {r["vol_trend"]}')

ranking = sorted(scores.items(), key=lambda x: x[1], reverse=True)
print(f'\n  \U0001f947 1ª: {ranking[0][0]} ({ranking[0][1]}/11 pts)')
print(f'  \U0001f948 2ª: {ranking[1][0]} ({ranking[1][1]}/11 pts)')
print(f'  \U0001f949 3ª: {ranking[2][0]} ({ranking[2][1]}/11 pts)')
print(f'  4ª: {ranking[3][0]} ({ranking[3][1]}/11 pts)')
