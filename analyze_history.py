import json
import pandas as pd
import numpy as np

def analyze():
    with open('historico.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Total records found: {len(data)}")
    
    # Create DataFrame
    df = pd.DataFrame(data)
    print("Columns available:", list(df.columns))
    
    # Print date range
    df['fecha'] = pd.to_datetime(df['fecha'])
    print(f"Start date: {df['fecha'].min()}")
    print(f"End date: {df['fecha'].max()}")
    
    # Value counts of states
    print("\nState distribution:")
    print(df['estado'].value_counts() if 'estado' in df.columns else "No 'estado' column")
    
    # Value counts of scores
    print("\nScore distribution:")
    print(df['score'].value_counts().sort_index() if 'score' in df.columns else "No 'score' column")
    
    # Extract BTC Price (USD)
    if 'btc_price' in df.columns:
        df['price_usd'] = df['btc_price'].apply(lambda x: x.get('usd') if isinstance(x, dict) else np.nan)
        print(f"\nPrice stats (USD): Min: {df['price_usd'].min():.2f}, Max: {df['price_usd'].max():.2f}, Mean: {df['price_usd'].mean():.2f}")
    
    # Look for timeframe records
    records_with_tf = df[df['timeframes'].notna()]
    print(f"\nRecords with detailed timeframes: {len(records_with_tf)}")
    
    # Check what indicators or fields are inside timeframes
    if len(records_with_tf) > 0:
        sample_tf = records_with_tf.iloc[0]['timeframes']
        print("Timeframe keys available:", list(sample_tf.keys()))
        print("Example 1m timeframe fields:", list(sample_tf['1m'].keys()) if '1m' in sample_tf else "No 1m")

if __name__ == "__main__":
    analyze()
