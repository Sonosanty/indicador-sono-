import json
import pandas as pd
import numpy as np

def analyze_signals():
    with open('historico.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    rows = []
    for item in data:
        row = {
            'fecha': item.get('fecha'),
            'score': item.get('score'),
            'estado': item.get('estado'),
            'rsi_btc': item.get('rsi_btc'),
            'price_usd': item.get('btc_price', {}).get('usd') if isinstance(item.get('btc_price'), dict) else None,
            'fear_greed': int(item.get('fear_greed', {}).get('value', 0)) if isinstance(item.get('fear_greed'), dict) else None,
        }
        tf = item.get('timeframes')
        if tf and isinstance(tf, dict):
            for t in ['1m', '5m', '15m', '1h', '4h', '1d']:
                if t in tf and isinstance(tf[t], dict):
                    row[f'{t}_rsi'] = tf[t].get('rsi')
                    row[f'{t}_ma20'] = tf[t].get('ma20')
                    row[f'{t}_ma50'] = tf[t].get('ma50')
                    row[f'{t}_price'] = tf[t].get('price')
        rows.append(row)
        
    df = pd.DataFrame(rows)
    df['fecha'] = pd.to_datetime(df['fecha'])
    df = df.sort_values('fecha').reset_index(drop=True)
    
    # Calculate returns
    df['price_lead_1h'] = df['price_usd'].shift(-6)  # 6 periods of 10m = 1 hour
    df['ret_1h'] = (df['price_lead_1h'] - df['price_usd']) / df['price_usd'] * 100
    
    df['price_lead_4h'] = df['price_usd'].shift(-24) # 24 periods = 4 hours
    df['ret_4h'] = (df['price_lead_4h'] - df['price_usd']) / df['price_usd'] * 100

    print("=== QUANTITATIVE INSIGHTS FROM 175 SAMPLES ===")
    
    # 1. RSI oversold on 5m or 15m
    oversold_5m = df[df['5m_rsi'] < 35]
    print(f"\nAverage 1h return after 5m RSI < 35 (N={len(oversold_5m)}): {oversold_5m['ret_1h'].mean():.4f}%")
    print(f"Average 4h return after 5m RSI < 35 (N={len(oversold_5m)}): {oversold_5m['ret_4h'].mean():.4f}%")
    
    # 2. RSI overbought on 5m or 15m
    overbought_5m = df[df['5m_rsi'] > 60]
    print(f"\nAverage 1h return after 5m RSI > 60 (N={len(overbought_5m)}): {overbought_5m['ret_1h'].mean():.4f}%")
    print(f"Average 4h return after 5m RSI > 60 (N={len(overbought_5m)}): {overbought_5m['ret_4h'].mean():.4f}%")

    # 3. MA Golden Crosses in short timeframes
    # 5m timeframe: MA20 > MA50
    df['5m_trend'] = df['5m_ma20'] > df['5m_ma50']
    # Golden cross: 5m_trend changes from False to True
    df['5m_cross_up'] = df['5m_trend'] & (~df['5m_trend'].shift(1).fillna(False))
    cross_ups = df[df['5m_cross_up'] == True]
    print(f"\nGolden Crosses on 5m (MA20 > MA50) (N={len(cross_ups)}):")
    for idx, r in cross_ups.head(5).iterrows():
        print(f"  Date: {r['fecha']} | Price: {r['price_usd']:.2f} | 1h Ret: {r['ret_1h']:.4f}% | 4h Ret: {r['ret_4h']:.4f}%")
        
    # 4. MA Death Crosses in short timeframes
    df['5m_cross_down'] = (~df['5m_trend']) & df['5m_trend'].shift(1).fillna(False)
    cross_downs = df[df['5m_cross_down'] == True]
    print(f"\nDeath Crosses on 5m (MA20 < MA50) (N={len(cross_downs)}):")
    for idx, r in cross_downs.head(5).iterrows():
        print(f"  Date: {r['fecha']} | Price: {r['price_usd']:.2f} | 1h Ret: {r['ret_1h']:.4f}% | 4h Ret: {r['ret_4h']:.4f}%")

if __name__ == "__main__":
    analyze_signals()
