"""
scoring.py — Motor de scoring avanzado. Soporta kwargs-style desde main.py.
"""
import numpy as np


def calculate_advanced_score(df=None, price=None, **kwargs):
    """
    Calcula score multi-factor. Acepta DataFrame o kwargs individuales.
    
    Args:
        df: DataFrame OHLCV (uso normal)
        price: Precio actual (opcional)
        **kwargs: Para compatibilidad con main.py que pasa rsi_btc, rsi_1m, etc.
    """
    # Si llaman con kwargs en vez de df, extraer un score sintético
    if df is None or (hasattr(df, 'empty') and df.empty):
        # Fallback para llamada estilo main.py
        rsi = kwargs.get('rsi_btc', 50)
        rsi_1m = kwargs.get('rsi_1m', 50)
        rsi_5m = kwargs.get('rsi_5m', 50)
        rsi_15m = kwargs.get('rsi_15m', 50)
        rsi_1h = kwargs.get('rsi_1h', 50)
        fear_greed = kwargs.get('fear_greed_val', 50)
        vix = kwargs.get('vix', 20)
        ma_data = kwargs.get('ma_data', {})

        # Scoring basado en RSI multi-timeframe
        rsi_avg = (rsi_1m + rsi_5m + rsi_15m + rsi_1h + rsi * 2) / 6
        
        p1 = 0
        # Analizar MA data si disponible
        for tf, mas in ma_data.items():
            ma20 = mas.get('ma20', 0)
            ma50 = mas.get('ma50', 0)
            ma200 = mas.get('ma200', 0)
            if ma20 > ma50 > ma200:
                p1 += 10
            elif ma20 < ma50 < ma200:
                p1 -= 5

        p2 = 0
        if 50 < rsi_avg < 70:
            p2 = 22
        elif rsi_avg >= 35:
            p2 = 17
        else:
            p2 = 5

        # Fear & Greed factor
        if fear_greed < 20:
            p3 = 25  # Miedo extremo = oportunidad
        elif fear_greed < 40:
            p3 = 18
        elif fear_greed < 60:
            p3 = 14
        elif fear_greed < 75:
            p3 = 8
        else:
            p3 = 3  # Euforia = riesgo

        # VIX factor
        if vix > 30:
            p3 -= 3
        elif vix < 15:
            p3 += 2

        total = max(0, min(100, p1 + p2 + p3))
        
        # Determinar señal
        if total >= 70:
            signal = 'COMPRA FUERTE'
        elif total >= 55:
            signal = 'COMPRA'
        elif total >= 42:
            signal = 'NEUTRAL+'
        elif total >= 30:
            signal = 'NEUTRAL'
        elif total >= 18:
            signal = 'VENTA'
        else:
            signal = 'VENTA FUERTE'

        return {
            'score': total,
            'total': total,
            'signal': signal,
            'p1': p1,
            'p2': p2,
            'p3': p3,
            'rsi_avg': round(rsi_avg, 1),
            'fear_greed': fear_greed,
            'vix': vix,
        }

    # Lógica normal con DataFrame
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

        if 50 < rsi < 70:
            p2 += 12
        elif rsi >= 30:
            p2 += 7
        else:
            p2 += 2

        # ADX-like momentum
        direction = np.abs(np.mean(diffs))
        if direction > 0.005 * price:
            p2 += 15
        elif direction > 0.002 * price:
            p2 += 10
        else:
            p2 += 3

    total += p2

    # Pilar 3 — Bollinger
    if len(closes) >= 20:
        bb20 = float(np.mean(closes[-20:]))
        bb_std = float(np.std(closes[-20:]))
        bbp = (price - (bb20 - 2 * bb_std)) / ((bb20 + 2 * bb_std) - (bb20 - 2 * bb_std)) if bb_std > 0 else 0.5

        if bbp < 0.15:
            p3 = 28
        elif bbp < 0.35:
            p3 = 20
        elif bbp < 0.65:
            p3 = 14
        elif bbp < 0.85:
            p3 = 7
        else:
            p3 = 2

    total += p3
    total = max(0, min(100, total))

    # Señal
    if total >= 78:
        signal = 'COMPRA FUERTE'
    elif total >= 62:
        signal = 'COMPRA'
    elif total >= 52:
        signal = 'ACUMULAR'
    elif total >= 42:
        signal = 'NEUTRAL'
    elif total >= 30:
        signal = 'VENTA'
    elif total >= 18:
        signal = 'VENTA FUERTE'
    else:
        signal = 'CAPITULACION'

    return {
        'total': total,
        'score': total,
        'signal': signal,
        'p1': p1,
        'p2': p2,
        'p3': p3,
        'price': price,
    }
