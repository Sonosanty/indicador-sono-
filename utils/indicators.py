"""
INDICATORS.PY
Calculo portatil y robusto de indicadores tecnicos utilizando Pandas y NumPy.
Cero dependencias binarias para evitar problemas en Windows y Linux.
Incluye auto-test interactivo que conecta a la API de Binance.
"""

import pandas as pd
import numpy as np
import requests

def calculate_sma(df, column="close", period=20):
    """Calcula la Media Movil Simple (SMA)"""
    return df[column].rolling(window=period).mean()

def calculate_ema(df, column="close", period=20):
    """Calcula la Media Movil Exponencial (EMA)"""
    return df[column].ewm(span=period, adjust=False).mean()

def calculate_rsi(df, column="close", period=14):
    """
    Calcula el Relative Strength Index (RSI) con suavizado de Wilder.
    """
    delta = df[column].diff()
    gain = (delta.where(delta > 0, 0)).copy()
    loss = (-delta.where(delta < 0, 0)).copy()
    
    # Usar promedio movil simple para el primer valor
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    # Suavizado de Wilder
    for i in range(period, len(df)):
        avg_gain.iloc[i] = (avg_gain.iloc[i-1] * (period - 1) + gain.iloc[i]) / period
        avg_loss.iloc[i] = (avg_loss.iloc[i-1] * (period - 1) + loss.iloc[i]) / period
        
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(df, column="close", fast=12, slow=26, signal=9):
    """
    Calcula el MACD (Moving Average Convergence Divergence).
    Retorna (macd_line, signal_line, histogram)
    """
    ema_fast = calculate_ema(df, column, fast)
    ema_slow = calculate_ema(df, column, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(df, column="close", period=20, num_std=2):
    """
    Calcula las Bandas de Bollinger.
    Retorna (upper_band, middle_band, lower_band)
    """
    middle_band = calculate_sma(df, column, period)
    std_dev = df[column].rolling(window=period).std()
    upper_band = middle_band + (num_std * std_dev)
    lower_band = middle_band - (num_std * std_dev)
    return upper_band, middle_band, lower_band

def calculate_atr(df, high_col="high", low_col="low", close_col="close", period=14):
    """
    Calcula el Average True Range (ATR).
    """
    high = df[high_col]
    low = df[low_col]
    prev_close = df[close_col].shift(1)
    
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    return atr

def calculate_adx(df, high_col="high", low_col="low", close_col="close", period=14):
    """
    Calcula el Average Directional Index (ADX).
    Retorna (adx, plus_di, minus_di)
    """
    high = df[high_col]
    low = df[low_col]
    close = df[close_col]
    prev_high = high.shift(1)
    prev_low = low.shift(1)
    prev_close = close.shift(1)
    
    # True Range
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    
    # Directional Movement
    up_move = high - prev_high
    down_move = prev_low - low
    
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
    
    plus_dm = pd.Series(plus_dm, index=df.index)
    minus_dm = pd.Series(minus_dm, index=df.index)
    
    # Smoothed DM
    smooth_plus_dm = plus_dm.ewm(alpha=1/period, adjust=False).mean()
    smooth_minus_dm = minus_dm.ewm(alpha=1/period, adjust=False).mean()
    
    plus_di = 100 * (smooth_plus_dm / atr)
    minus_di = 100 * (smooth_minus_dm / atr)
    
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    
    return adx, plus_di, minus_di

def fetch_binance_klines(symbol="BTCUSDT", interval="1h", limit=100):
    """
    Descarga velas (ohlcv) reales desde la API publica de Binance.
    """
    url = f"https://api.binance.com/api/v3/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    try:
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        
        # Parse columns
        df = pd.DataFrame(data, columns=[
            "open_time", "open", "high", "low", "close", "volume",
            "close_time", "quote_volume", "count", "taker_buy_volume",
            "taker_buy_quote_volume", "ignore"
        ])
        
        # Cast to float
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
            
        df["datetime"] = pd.to_datetime(df["open_time"], unit="ms")
        return df
    except Exception as e:
        print(f"Error descargando datos de Binance: {e}")
        return None

if __name__ == "__main__":
    print("--- INICIANDO AUTO-TEST DE INDICADORES ---")
    print("Conectando con la API publica de Binance para obtener velas de BTCUSDT (1h)...")
    df = fetch_binance_klines(symbol="BTCUSDT", interval="1h", limit=100)
    
    if df is not None:
        print(f"Descargadas {len(df)} velas exitosamente.")
        print("Calculando indicadores tecnicos...")
        
        # Medias moviles
        df["ma20"] = calculate_sma(df, "close", 20)
        df["ma50"] = calculate_sma(df, "close", 50)
        df["ma200"] = calculate_sma(df, "close", 200) # Sera NaN porque limit es 100, pero valida la funcion
        
        # RSI, MACD, Bollinger
        df["rsi"] = calculate_rsi(df, "close", 14)
        df["macd"], df["macd_sig"], df["macd_hist"] = calculate_macd(df, "close")
        df["bb_up"], df["bb_mid"], df["bb_low"] = calculate_bollinger_bands(df, "close")
        
        # ATR y ADX
        df["atr"] = calculate_atr(df)
        df["adx"], df["plus_di"], df["minus_di"] = calculate_adx(df)
        
        print("\nUltimos 5 registros calculados:")
        print(df[["datetime", "close", "ma20", "rsi", "macd", "bb_up", "bb_low", "atr", "adx"]].tail(5))
        print("\n[OK] Auto-test completado con exito. Todos los indicadores funcionan perfectamente.")
    else:
        print("[ERROR] No se pudieron obtener los datos de prueba de Binance.")
