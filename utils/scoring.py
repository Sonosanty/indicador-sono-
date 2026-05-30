"""
SCORING.PY
Sistema avanzado de scoring de 0-100 para evaluar el estado del mercado de BTC.
Incorpora pesos por timeframe, analisis de volatilidad, momentum y sentimiento.
Estructura modular compatible con Windows + Linux.
"""

import numpy as np

def calculate_momentum_score(rsi_btc, rsi_1m, rsi_5m, rsi_15m, rsi_1h):
    """
    Calcula la puntuacion de momentum (0 a 100).
    RSI sobrevendido suma puntos para LONG (bajo score de burbuja/alto para comprar)
    pero en un sistema de scoring tradicional donde:
    - 0-30: Pánico/Acumulación extrema (Zonas óptimas de compra)
    - 30-50: Acumulación/Consolidación
    - 50-70: Optimismo/Distribución
    - 70-100: Euforia/Burbuja/Zonas de venta (Cortos)
    """
    # Usamos promedios ponderados por timeframe
    # Timeframes cortos (1m, 5m, 15m) tienen 40% peso para intradia/scalping
    # Timeframes largos (1h, btc_global) tienen 60% peso
    rsi_vals = []
    weights = []
    
    if rsi_1m is not None:
        rsi_vals.append(rsi_1m)
        weights.append(0.1)
    if rsi_5m is not None:
        rsi_vals.append(rsi_5m)
        weights.append(0.1)
    if rsi_15m is not None:
        rsi_vals.append(rsi_15m)
        weights.append(0.2)
    if rsi_1h is not None:
        rsi_vals.append(rsi_1h)
        weights.append(0.3)
    if rsi_btc is not None:
        rsi_vals.append(rsi_btc)
        weights.append(0.3)
        
    if not rsi_vals:
        return 50.0  # Neutral
        
    weighted_rsi = np.average(rsi_vals, weights=weights)
    return float(weighted_rsi)

def calculate_trend_score(ma_data):
    """
    Evalua la estructura de medias moviles (0 a 100).
    Donde 0 es tendencia bajista total en todos los timeframes,
    50 es neutral, y 100 es alcista total (medias alineadas ma20 > ma50 > ma200).
    ma_data es un dict con estructura:
    {
      '1m': {'ma20': X, 'ma50': Y, 'ma200': Z},
      '5m': ...
    }
    """
    score = 50.0 # Comenzar neutral
    points = 0
    total_checks = 0
    
    for tf, mas in ma_data.items():
        if not mas: continue
        ma20 = mas.get('ma20')
        ma50 = mas.get('ma50')
        ma200 = mas.get('ma200')
        
        if ma20 and ma50:
            total_checks += 1
            if ma20 > ma50:
                points += 1 # Tendencia alcista
            else:
                points -= 1 # Tendencia bajista
                
        if ma50 and ma200:
            total_checks += 1
            if ma50 > ma200:
                points += 1
            else:
                points -= 1
                
    if total_checks > 0:
        # Normalizar de -1 a 1 a rango 0-100
        factor = points / total_checks # Rango [-1, 1]
        score = 50.0 + (factor * 50.0)
        
    return float(score)

def calculate_volatility_score(vix, atr_pct=None):
    """
    Calcula la volatilidad normalizada (0 a 100).
    VIX alto o ATR porcentual alto indica alta tension (bajo score de burbuja, alta probabilidad de suelo/panico)
    """
    # VIX promedio historico es ~18
    # VIX < 15: Volatilidad muy baja (calma/distribucion)
    # VIX > 25: Panico extremo/volatilidad alta
    vix_val = vix if vix is not None else 18.0
    
    # Normalizar VIX de rango 10-30 a 0-100
    vix_score = ((vix_val - 10) / 20) * 100
    vix_score = max(0.0, min(100.0, vix_score))
    
    if atr_pct is not None:
        # Si tenemos ATR, lo fusionamos
        atr_score = min(100.0, atr_pct * 20.0) # Escalado simple
        return float(0.5 * vix_score + 0.5 * atr_score)
        
    return float(vix_score)

def get_market_state(score):
    """
    Mapea el score acumulado (0-100) a un estado comprensible y una accion recomendada.
    """
    if score < 15:
        return {
            "score": score,
            "estado": "PÁNICO EXTREMO",
            "accion": "LONG",
            "color": "red",
            "explicacion": "Condiciones de panico extremo con RSI extremadamente sobrevendido. Maxima probabilidad de rebote. Zona optima de compras (LONG)."
        }
    elif score < 35:
        return {
            "score": score,
            "estado": "ACUMULACIÓN",
            "accion": "LONG",
            "color": "orange",
            "explicacion": "El mercado se encuentra en fase de acumulacion. RSI e indicadores de tendencia muestran debilidad controlada y miedo. Excelente relacion riesgo/beneficio para LONG."
        }
    elif score < 65:
        return {
            "score": score,
            "estado": "NEUTRAL",
            "accion": "WAIT / SCALPING",
            "color": "gray",
            "explicacion": "Fase de consolidacion o neutralidad. No hay tendencia dominante clara. Se recomienda prudencia, operaciones cortas de scalping o esperar confirmacion."
        }
    elif score < 85:
        return {
            "score": score,
            "estado": "OPTIMISMO / DISTRIBUCIÓN",
            "accion": "SHORT",
            "color": "blue",
            "explicacion": "Optimismo en el mercado con medias alineadas al alza pero RSI empezando a mostrar sobrecompra en timeframes cortos. Oportunidad de buscar cortos tacticos (SHORT)."
        }
    else:
        return {
            "score": score,
            "estado": "EUFORIA EXTREMA",
            "accion": "SHORT",
            "color": "green",
            "explicacion": "Burbuja intradia. Euforia generalizada, codicia extrema y sobrecompra masiva en multiples marcos temporales. Alta probabilidad de correccion violenta. Zona optima de venta (SHORT)."
        }

def calculate_advanced_score(rsi_btc, rsi_1m, rsi_5m, rsi_15m, rsi_1h, fear_greed_val, vix, ma_data):
    """
    Genera el Score Maestro consolidado (0 a 100).
    Pesos de confluencia:
    - Momentum (RSI multi-timeframe): 30%
    - Tendencia (Medias Moviles): 30%
    - Sentimiento (Fear & Greed): 20%
    - Volatilidad (VIX): 20%
    """
    # 1. Momentum (0-100)
    momentum_score = calculate_momentum_score(rsi_btc, rsi_1m, rsi_5m, rsi_15m, rsi_1h)
    
    # 2. Tendencia (0-100)
    trend_score = calculate_trend_score(ma_data)
    
    # 3. Sentimiento (0-100)
    fg_val = fear_greed_val if fear_greed_val is not None else 50.0
    sentiment_score = float(fg_val)
    
    # 4. Volatilidad (0-100)
    volatility_score = calculate_volatility_score(vix)
    
    # Fusionamos con los pesos descritos
    final_score = (
        0.30 * momentum_score +
        0.30 * trend_score +
        0.20 * sentiment_score +
        0.20 * (100.0 - volatility_score) # Cuando la volatilidad (miedo) es baja, el score de codicia/burbuja sube
    )
    
    return get_market_state(final_score)

if __name__ == "__main__":
    print("--- AUTO-TEST DE SCORING AVANZADO ---")
    
    # Simulacion de un escenario de panico/acumulacion
    ma_bajista = {
        '15m': {'ma20': 76800, 'ma50': 76900, 'ma200': 77100},
        '1h': {'ma20': 76700, 'ma50': 77000, 'ma200': 78000}
    }
    
    print("\nSimulando escenario [PÁNICO / ACUMULACIÓN]:")
    res_acumulacion = calculate_advanced_score(
        rsi_btc=32.0, rsi_1m=22.0, rsi_5m=25.0, rsi_15m=28.0, rsi_1h=35.0,
        fear_greed_val=20, vix=26.0, ma_data=ma_bajista
    )
    for k, v in res_acumulacion.items():
        print(f"  {k}: {v}")
        
    # Simulacion de un escenario de euforia
    ma_alcista = {
        '15m': {'ma20': 78500, 'ma50': 78100, 'ma200': 77500},
        '1h': {'ma20': 79000, 'ma50': 78000, 'ma200': 76000}
    }
    
    print("\nSimulando escenario [EUFORIA EXTREMA]:")
    res_euforia = calculate_advanced_score(
        rsi_btc=78.0, rsi_1m=85.0, rsi_5m=82.0, rsi_15m=75.0, rsi_1h=72.0,
        fear_greed_val=85, vix=12.0, ma_data=ma_alcista
    )
    for k, v in res_euforia.items():
        print(f"  {k}: {v}")
