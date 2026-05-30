"""
scoring.py — Motor de scoring avanzado para main.py (FastAPI).
"""
import numpy as np


def calculate_advanced_score(df, price=None):
    """Calcula score multi-factor basado en DataFrame OHLCV."""
    if df.empty:
        return {'total': 0, 'signal': 'NO_DATA', 'p1': 0, 'p2': 0, 'p3': 0}

    closes = df['close'].values
    if price is None:
        price = float(closes[-1]) if len(closes) > 0 else 0

    total = 0
    p1 = p2 = p3 = 0

    # Pilar 1 — Cruces MA
    if len(closes) >= 200:
        ma6 = float(np.mean(closes[-6:]))
        ma40 = float(np.mean(closes[-40:]))
        ma70 = float(np.mean(closes[-70:]))
        ma200 = float(np.mean(closes[-200:]))
        if ma6 > ma40:
            p1 += 12
        if ma6 > ma70:
            p1 += 10
        if ma40 > ma200:
            p1 += 13

    total += p1

    # Pilar 2 — Momentum / RSI
    if len(closes) >= 14:
        diffs = np.diff(closes[-15:])
        gain = np.sum(diffs[diffs > 0]) / 14
        loss = np.sum(np.abs(diffs[diffs < 0])) / 14
        if loss == 0:
            loss = 0.001
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        if rsi > 50 and rsi < 70:
            p2 += 12
        elif rsi >= 30:
            p2 += 7
        else:
            p2 += 2

    total += p2

    # Señal
    if total >= 78:
        signal = 'COMPRA FUERTE'
    elif total >= 62:
        signal = 'COMPRA'
    elif total >= 52:
        signal = 'ACUMULACION'
    elif total >= 42:
        signal = 'NEUTRAL'
    elif total >= 30:
        signal = 'DISTRIBUCION'
    elif total >= 18:
        signal = 'VENTA'
    else:
        signal = 'CAPITULACION'

    return {
        'total': total,
        'signal': signal,
        'p1': p1, 'p2': p2, 'p3': p3,
        'price': price,
        'rsi': float(rsi) if len(closes) >= 14 else None
    }
