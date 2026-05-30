"""
sistema_hibrido.py — Sistema híbrido BTC para main.py (stub funcional).
"""
import sys
sys.path.insert(0, r'C:\Users\sparreno\.openclaw\workspace')

class SistemaHibridoBTC:
    """Sistema de análisis híbrido multi-timeframe."""
    
    def __init__(self):
        self.timeframes = ['1h', '4h', '1d']
        self.last_analysis = None
    
    def analyze(self, df_dict):
        """Analiza multiples timeframes."""
        if not df_dict:
            return {'signal': 'NEUTRAL', 'confidence': 0}
        
        signals = []
        for tf, df in df_dict.items():
            if df is not None and not df.empty:
                closes = df['close'].values
                if len(closes) > 0:
                    price = float(closes[-1])
                    ma20 = float(closes[-20:].mean()) if len(closes) >= 20 else price
                    signals.append({
                        'timeframe': tf,
                        'price': price,
                        'trend': 'UP' if price > ma20 else 'DOWN'
                    })
        
        self.last_analysis = {
            'signals': signals,
            'timestamp': __import__('time').time()
        }
        return self.last_analysis
