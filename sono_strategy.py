"""
sono_strategy.py — Estrategia Sono para main.py
Usa sono_score.py como backend de scoring.
"""
import sys
sys.path.insert(0, r'C:\Users\sparreno\.openclaw\workspace')
from sono_score import compute_score

class SonoStrategy:
    """Wrapper de estrategia Sono para main.py."""
    
    def __init__(self, symbol='BTCUSDT'):
        self.symbol = symbol
        self.position = None
        self.trades = []
    
    def analyze(self, candles):
        """Analiza velas y devuelve decision."""
        if not candles or len(candles) < 210:
            return {'action': 'HOLD', 'score': None}
        score = compute_score(candles)
        if not score:
            return {'action': 'HOLD', 'score': None}
        action = 'BUY' if score['total'] >= 62 else 'SELL' if score['total'] < 30 else 'HOLD'
        return {'action': action, 'score': score}
    
    def get_status(self):
        return {
            'symbol': self.symbol,
            'position': self.position,
            'trades_count': len(self.trades)
        }
