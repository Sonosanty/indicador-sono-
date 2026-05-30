"""
sistema_hibrido.py — Sistema híbrido BTC (completo con evaluar_senales_hibridas).
"""
import sys
import time
import logging
sys.path.insert(0, r'C:\Users\sparreno\.openclaw\workspace')

logger = logging.getLogger(__name__)


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
            'timestamp': time.time()
        }
        return self.last_analysis

    def evaluar_senales_hibridas(self, df_candles=None, idx=None,
                                  fear_greed_val=50, fear_greed_label='Neutral',
                                  vix_val=15, google_trends_val=50, capital=10000.0):
        """Evalúa señales híbridas multi-factor. Stub funcional."""
        df = df_candles
        if df is None or df.empty:
            return self._hibrida_vacia()

        i = idx if idx is not None else len(df) - 1
        row = df.iloc[i]
        close = float(row.get('close', 0))
        ma200 = float(row.get('ma200', row.get('close', 0)))
        adx = float(row.get('adx', 25))
        atr = float(row.get('atr', close * 0.02))
        rsi = float(row.get('rsi', 50))

        # Señal básica
        if close > ma200 and rsi > 50:
            decision = 'BUY'
            confianza = min(100, 50 + (rsi - 50) + (adx - 25) / 2)
        elif close < ma200 and rsi < 50:
            decision = 'SELL'
            confianza = min(100, 50 + (50 - rsi) + (adx - 25) / 2)
        else:
            decision = 'NEUTRAL'
            confianza = 40

        # Ajuste por Fear & Greed
        if fear_greed_val < 20:
            confianza += 10  # Miedo extremo = oportunidad
        elif fear_greed_val > 80:
            confianza -= 10  # Euforia = riesgo

        # Ajuste por VIX
        if vix_val > 30:
            confianza -= 5

        confianza = max(10, min(100, confianza))

        estado = 'ALCISTA' if close > ma200 else ('BAJISTA' if close < ma200 else 'NEUTRAL')

        return {
            'timestamp': time.time(),
            'entry_price': close,
            'decision_final': decision,
            'confianza_hibrida': confianza,
            'adx_vivo': adx,
            'atr_vivo': atr,
            'estado_mercado': estado,
            'estrategias_individuales': {
                'gap': {'has_gap': False, 'type': 'NINGUNO', 'gap_pct': 0.0},
                'trend': {'type': 'ALCISTA' if close > ma200 else 'BAJISTA'},
                'rsi': {'value': rsi, 'zone': 'SOBREVENTA' if rsi < 30 else 'SOBRECOMPRA' if rsi > 70 else 'NEUTRAL'},
            }
        }

    def _hibrida_vacia(self):
        return {
            'timestamp': time.time(),
            'entry_price': 0,
            'decision_final': 'NEUTRAL',
            'confianza_hibrida': 0,
            'adx_vivo': 25,
            'atr_vivo': 0,
            'estado_mercado': 'SIN_DATOS',
            'estrategias_individuales': {
                'gap': {'has_gap': False, 'type': 'NINGUNO', 'gap_pct': 0.0}
            }
        }
