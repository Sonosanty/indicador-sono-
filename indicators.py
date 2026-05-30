"""
indicators.py — Indicadores técnicos para main.py
Funciones compatibles con pandas.DataFrame para el servidor FastAPI.
"""
import pandas as pd
import numpy as np
import requests

BINANCE_REST = 'https://api.binance.com/api/v3'


def fetch_binance_klines(symbol='BTCUSDT', interval='15m', limit=300):
    """Fetch OHLCV desde Binance REST API, devuelve DataFrame."""
    try:
        url = f'{BINANCE_REST}/klines?symbol={symbol}&interval={interval}&limit={limit}'
        r = requests.get(url, timeout=15)
        raw = r.json()
        df = pd.DataFrame(raw, columns=[
            'time', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_vol', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col])
        df['time'] = pd.to_datetime(df['time'], unit='ms')
        return df
    except Exception as e:
        print(f'[indicators] Error fetch_binance_klines: {e}')
        return pd.DataFrame()


def calculate_rsi(df, column='close', period=14):
    """Calcula RSI usando pandas."""
    if df.empty or len(df) < period + 1:
        return pd.Series([None] * len(df))
    delta = df[column].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta.where(delta < 0, 0.0))
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float('nan'))
    rsi = 100 - (100 / (1 + rs))
    return rsi


def calculate_sma(df, column='close', period=20):
    """Calcula SMA (Simple Moving Average)."""
    if df.empty:
        return pd.Series([None] * len(df))
    return df[column].rolling(window=period, min_periods=period).mean()
