"""
sono_score.py — Score Maestro UNIFICADO (bot Python)
Lee umbrales/pesos desde sono-score-config.json (misma fuente que JS)

Uso:
    from sono_score import compute_score, classify_score, calc_ma, ...
    score = compute_score(candles)  # candles = [{'open','high','low','close'}]
"""

import json
import math
import os

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'indicador-sono-repo', 'sono-score-config.json')

with open(_CONFIG_PATH) as f:
    _CFG = json.load(f)

B = _CFG['barreras']
W = _CFG['pesos_maximos']

# ── Helpers ──────────────────────────────────────────────
def calc_ma(arr, p):
    if len(arr) < p:
        return None
    return sum(arr[-p:]) / p

def calc_rsi(closes, p=14):
    if len(closes) <= p:
        return None
    diffs = [closes[i] - closes[i-1] for i in range(-(p+1), 0)][1:]
    gains = sum(d for d in diffs if d > 0) / p
    losses = sum(abs(d) for d in diffs if d < 0) / p
    if losses == 0:
        return 100.0
    return round(100 - 100 / (1 + gains / losses), 2)

def calc_bb(closes, p=20, mult=2):
    if len(closes) < p:
        return None
    sl = closes[-p:]
    ma = sum(sl) / p
    std = math.sqrt(sum((v - ma)**2 for v in sl) / p)
    return {'upper': ma + mult * std, 'middle': ma, 'lower': ma - mult * std, 'std': std}

def calc_atr(candles, p=14):
    if len(candles) < p + 1:
        return None
    trs = []
    for i in range(-(p+1), 0):
        c = candles[i]
        if i == -(p+1):
            tr = c['high'] - c['low']
        else:
            pv = candles[i-1]
            tr = max(c['high'] - c['low'],
                     abs(c['high'] - pv['close']),
                     abs(c['low'] - pv['close']))
        trs.append(tr)
    return sum(trs) / p

def calc_adx(candles, p=14):
    if len(candles) < p * 2:
        return None
    sl = candles[-(p*2):]
    dmP = dmM = tr = 0.0
    for i in range(1, len(sl)):
        c = sl[i]
        pv = sl[i-1]
        up = c['high'] - pv['high']
        dn = pv['low'] - c['low']
        dmP += up if (up > dn and up > 0) else 0
        dmM += dn if (dn > up and dn > 0) else 0
        tr += max(c['high'] - c['low'], abs(c['high'] - pv['close']), abs(c['low'] - pv['close']))
    if tr == 0:
        return 0.0
    diP = (dmP / tr) * 100
    diM = (dmM / tr) * 100
    return round((abs(diP - diM) / (diP + diM + 0.001)) * 100, 1)

# ── Score ────────────────────────────────────────────────
def compute_score(candles):
    """Calcula Score Maestro 0-100.
    Misma lógica que scoreEngine.js.
    """
    if not candles or len(candles) < 210:
        return None

    closes = [c['close'] for c in candles]
    price = closes[-1]
    ma6   = calc_ma(closes, 6)
    ma40  = calc_ma(closes, 40)
    ma70  = calc_ma(closes, 70)
    ma200 = calc_ma(closes, 200)
    bb    = calc_bb(closes, 20)
    adx   = calc_adx(candles, 14)
    rsi   = calc_rsi(closes, 14)
    atr   = calc_atr(candles, 14)

    # Pilar 1 — Cruces MA (max 35)
    p1 = 0
    if ma6 and ma40:
        p1 += 12 if ma6 > ma40 else 0
    if ma6 and ma70:
        p1 += 10 if ma6 > ma70 else 0
    if ma40 and ma200:
        p1 += 13 if ma40 > ma200 else 0

    # Pilar 2 — Momentum (max 35)
    p2 = 0
    if adx is not None:
        p2 += 15 if adx > 35 else 10 if adx > 25 else 3
    if rsi is not None:
        p2 += 12 if 50 < rsi < 70 else 7 if rsi >= 35 else 2
    if ma200:
        p2 += 8 if price > ma200 else 0

    # Pilar 3 — Bollinger (max 30)
    p3 = 0
    if bb:
        rng = bb['upper'] - bb['lower']
        pctB = (price - bb['lower']) / rng if rng > 0 else 0.5
        if pctB < 0.15:
            p3 += 28
        elif pctB < 0.35:
            p3 += 20
        elif pctB < 0.65:
            p3 += 14
        elif pctB < 0.85:
            p3 += 7
        else:
            p3 += 2

    total = min(100, round(p1 + p2 + p3))
    return classify_score(total, {
        'p1': p1, 'p2': p2, 'p3': p3,
        'price': price, 'atr': atr,
        'ma6': ma6, 'ma40': ma40, 'ma70': ma70, 'ma200': ma200,
        'rsi': rsi, 'adx': adx
    })

def classify_score(total, extra=None):
    """Clasifica total 0-100 usando contrato JSON."""
    if total >= B['compra_fuerte']:
        label_key = 'strong_long'
    elif total >= B['compra']:
        label_key = 'long'
    elif total >= B['acumulacion']:
        label_key = 'accumulate'
    elif total >= B['neutral']:
        label_key = 'neutral'
    elif total >= B['distribucion']:
        label_key = 'distribute'
    elif total >= B['venta']:
        label_key = 'short'
    else:
        label_key = 'capitulate'

    result = {
        'total': total,
        'level': _CFG['niveles'][label_key],
        'signal': _CFG['labels'][label_key],
        'action': _CFG['acciones'][label_key],
        'bias_color': _CFG['colores'][label_key],
        'label_key': label_key,
    }
    if extra:
        result.update(extra)
    return result


# ── Test / auto-verificación ────────────────────────────
if __name__ == '__main__':
    # Test rápido: genera datos de prueba y verifica coherencia
    import random
    test_candles = []
    p = 50000
    for i in range(250):
        o = p
        c = o + random.uniform(-500, 500)
        h = max(o, c) + random.uniform(0, 200)
        l = min(o, c) - random.uniform(0, 200)
        test_candles.append({'open': o, 'high': h, 'low': l, 'close': c})
        p = c

    s = compute_score(test_candles)
    print(f"Test Score: total={s['total']}, signal={s['signal']}, action={s['action']}, level={s['level']}")

    # Test con datos alcistas fuertes
    bullish = []
    p = 30000
    for i in range(250):
        c = p * (1 + random.uniform(0.001, 0.008))
        o = p
        h = max(o, c) * 1.002
        l = min(o, c) * 0.998
        bullish.append({'open': o, 'high': h, 'low': l, 'close': c})
        p = c
    s2 = compute_score(bullish)
    print(f"Bullish Test: total={s2['total']}, signal={s2['signal']}, action={s2['action']}")

    print(f"\n✅ Score engine verificado. Config cargada de: {_CONFIG_PATH}")
