import json
import pandas as pd
import numpy as np

def run_analysis():
    # Load historical data
    with open('historico.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} records.")
    
    # We will build a list of rows
    rows = []
    for item in data:
        row = {
            'fecha': item.get('fecha'),
            'score': item.get('score'),
            'estado': item.get('estado'),
            'rsi_btc': item.get('rsi_btc'),
            'btc_dominance': item.get('btc_dominance'),
            'vix': item.get('vix'),
            'price_usd': item.get('btc_price', {}).get('usd') if isinstance(item.get('btc_price'), dict) else None,
            'fear_greed_val': int(item.get('fear_greed', {}).get('value', 0)) if isinstance(item.get('fear_greed'), dict) else None,
        }
        
        # Flatten timeframes if available
        tf = item.get('timeframes')
        if tf and isinstance(tf, dict):
            for tf_name, tf_data in tf.items():
                if isinstance(tf_data, dict):
                    row[f'{tf_name}_price'] = tf_data.get('price')
                    row[f'{tf_name}_rsi'] = tf_data.get('rsi')
                    row[f'{tf_name}_ma20'] = tf_data.get('ma20')
                    row[f'{tf_name}_ma50'] = tf_data.get('ma50')
                    row[f'{tf_name}_ma200'] = tf_data.get('ma200')
                    row[f'{tf_name}_change'] = tf_data.get('change_percent')
        
        rows.append(row)
        
    df = pd.DataFrame(rows)
    df['fecha'] = pd.to_datetime(df['fecha'])
    df = df.sort_values('fecha').reset_index(drop=True)
    
    print(f"DataFrame columns: {list(df.columns)}")
    print(f"Data spans from {df['fecha'].min()} to {df['fecha'].max()}")
    
    # 1. Look for Long signals or low risk / accumulation zones
    print("\n--- ANALYZING POTENTIAL LONG ENTRIES ---")
    # Low RSI, extreme fear, low score, etc.
    # Let's find rows where fear_greed_val <= 30 (Fear/Extreme Fear) and '15m_rsi' < 40 or 'rsi_btc' < 45
    long_candidates = df[
        (df['fear_greed_val'] <= 30) & 
        ((df['15m_rsi'] < 42) | (df['rsi_btc'] < 45))
    ]
    print(f"Found {len(long_candidates)} records matching Long entry criteria.")
    if len(long_candidates) > 0:
        print(long_candidates[['fecha', 'price_usd', 'score', 'estado', 'rsi_btc', '15m_rsi']].head(10))
        
    # 2. Look for Short signals or high risk / bubble zones
    print("\n--- ANALYZING POTENTIAL SHORT ENTRIES ---")
    # High RSI in lower timeframes (1m/5m) while higher timeframe is overbought or neutral, etc.
    short_candidates = df[
        (df['1m_rsi'] > 65) | (df['5m_rsi'] > 55)
    ]
    print(f"Found {len(short_candidates)} records matching Short/Overbought conditions.")
    if len(short_candidates) > 0:
        print(short_candidates[['fecha', 'price_usd', 'score', 'estado', 'rsi_btc', '1m_rsi', '5m_rsi']].head(10))
        
    # 3. Calculate simulated trades
    # Let's see what happens if we buy at the minimum price in our dataset and sell at the maximum.
    min_idx = df['price_usd'].idxmin()
    max_idx = df['price_usd'].idxmax()
    print(f"\nAbsolute Minimum Price: {df.loc[min_idx, 'price_usd']} USD at {df.loc[min_idx, 'fecha']}")
    print(f"Absolute Maximum Price: {df.loc[max_idx, 'price_usd']} USD at {df.loc[max_idx, 'fecha']}")
    potential_profit = (df.loc[max_idx, 'price_usd'] - df.loc[min_idx, 'price_usd']) / df.loc[min_idx, 'price_usd'] * 100
    print(f"Max theoretical profit: {potential_profit:.2f}%")
    
    # 4. Correlation of score with price changes
    # Let's compute price change after 3 periods (30 minutes)
    df['price_lead_3'] = df['price_usd'].shift(-3)
    df['price_change_3pct'] = (df['price_lead_3'] - df['price_usd']) / df['price_usd'] * 100
    
    print("\n--- SCORE VS FUTURE 30M PRICE CHANGE ---")
    corr = df[['score', 'price_change_3pct']].corr().iloc[0,1]
    print(f"Correlation between score and 30-min future price change: {corr:.4f}")
    
    print("\nAverage price change by score:")
    print(df.groupby('score')['price_change_3pct'].mean())

if __name__ == "__main__":
    run_analysis()
