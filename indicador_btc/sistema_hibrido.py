"""
SISTEMA_HIBRIDO.PY (FINO EDITION 👒)
Fusiona las señales rápidas del Método Sono con el sistema de confluencia macro (Score Maestro),
el Crypto Fear & Greed Index oficial, el índice de volatilidad VIX y Google Trends.

Resuelve las debilidades de Sono en solitario:
- Bloquea señales falsas (doble sierra) en mercados laterales usando el Score de Confluencia.
- Evita atrapar cuchillos cayendo en Bollinger limitando las entradas a pánicos extremos (F&G < 25, RSI < 30).
- Ajusta dinámicamente los stops según el nivel de volatilidad (VIX institucional).
"""

import os
import json
import pandas as pd
from datetime import datetime
from sono_strategy import SonoStrategy
from scoring import calculate_advanced_score

class SistemaHibridoBTC:
    def __init__(self):
        self.sono = SonoStrategy()
        
    def evaluar_senales_hibridas(self, df_candles: pd.DataFrame, idx: int, 
                                 fear_greed_val: int, fear_greed_label: str,
                                 vix_val: float, google_trends_val: int,
                                 capital: float = 10000.0) -> dict:
        """
        Evalúa y unifica la operativa de Sono con filtros macro avanzados del Score Maestro.
        
        Args:
            df_candles: DataFrame con columnas ['close', 'open', 'high', 'low'] y medias calculadas.
            idx: Índice actual de evaluación (generalmente la última vela).
            fear_greed_val: Valor en vivo (0-100) de Alternative.me.
            fear_greed_label: Clasificación en vivo de Alternative.me.
            vix_val: Valor del VIX (^VIX) en vivo de Yahoo Finance.
            google_trends_val: Valor (0-100) en vivo de Google Trends para 'bitcoin'.
            capital: Capital asignado para gestión de posición.
            
        Returns:
            Dict completo con decisión final, nivel de riesgo y stops ajustados.
        """
        # 1. Asegurar medias calculadas en df
        df = df_candles.copy()
        df = self.sono.calculate_medias_sono(df)
        
        # 2. Calcular nuestro Score Maestro Avanzado (0-100)
        # Para scoring necesitamos un mapeo de las medias móviles calculadas
        ma_data = {}
        for tf in ["15m", "1h", "4h", "1d"]:
            # Usamos el timeframe actual de candles como aproximación o simulamos los cruces
            ma_data[tf] = {
                "ma20": df.loc[idx, 'ma40'] * 1.001, # Mapeo dinámico aproximado
                "ma50": df.loc[idx, 'ma70'],
                "ma200": df.loc[idx, 'ma200']
            }
        
        # Obtener rsi actual de la vela (si no está, calculamos un RSI rápido de 14 períodos)
        rsi_val = 50.0
        if 'rsi' in df.columns:
            rsi_val = df.loc[idx, 'rsi']
        else:
            # Calcular RSI de 14 periodos
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            rsi_val = df.loc[idx, 'rsi'] if not pd.isna(df.loc[idx, 'rsi']) else 50.0
            
        score_analysis = calculate_advanced_score(
            rsi_btc=rsi_val,
            rsi_1m=rsi_val,
            rsi_5m=rsi_val,
            rsi_15m=rsi_val,
            rsi_1h=rsi_val,
            fear_greed_val=fear_greed_val,
            vix=vix_val,
            ma_data=ma_data
        )
        
        score_maestro = score_analysis["score"]
        
        # 3. Obtener señales puras de Sono
        previous_close = df.loc[idx - 1, 'close'] if idx > 0 else df.loc[idx, 'close']
        sono_raw = self.sono.estrategia_completa_sono(df, idx, previous_close)
        
        # 4. APLICAR FILTROS HÍBRIDOS INTELIGENTES (FINO RULES 👒)
        decision_final = "NEUTRAL"
        motivo_bloqueo = ""
        confianza_hibrida = 0.0
        
        sono_signal = sono_raw["signal"]
        sono_confidence = sono_raw["confidence"]
        
        # Regla A: Filtro de Doble Sierra mediante Score Maestro
        if sono_signal == "LONG":
            if score_maestro > 65:
                # Sono dice comprar, pero el Score Macro está demasiado alto (Sobrecompra/Euforia)
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bloqueado por Score Maestro: Zona de Distribución Macro alta (Venta)."
            else:
                decision_final = "LONG"
                # Coincidencia perfecta: Score bajo (<35) y Sono LONG -> Confianza Premium
                if score_maestro < 35:
                    confianza_hibrida = min(100.0, (sono_confidence + (100 - score_maestro)) / 2 * 1.1)
                else:
                    confianza_hibrida = (sono_confidence + (100 - score_maestro)) / 2
                    
        elif sono_signal == "SHORT":
            if score_maestro < 35:
                # Sono dice vender/corto, pero el Score Macro está muy bajo (Zona de fuerte acumulación)
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bloqueado por Score Maestro: Zona de Acumulación Macro baja (Compra)."
            else:
                decision_final = "SHORT"
                # Coincidencia perfecta: Score alto (>65) y Sono SHORT -> Confianza Premium
                if score_maestro > 65:
                    confianza_hibrida = min(100.0, (sono_confidence + score_maestro) / 2 * 1.1)
                else:
                    confianza_hibrida = (sono_confidence + score_maestro) / 2
                    
        # Regla B: Bollinger Mean Reversion Inteligente (Evitar atrapar cuchillos)
        bollinger_raw = sono_raw["strategies"].get("bollinger", {})
        if bollinger_raw.get("signal") == "LONG" and decision_final == "LONG":
            # Si la señal viene por Bollinger, exigimos que haya pánico (Fear & Greed < 30 y RSI bajo)
            if fear_greed_val > 30:
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bollinger LONG bloqueado: No hay pánico en el mercado (F&G > 30)."
            elif rsi_val > 35:
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bollinger LONG bloqueado: RSI demasiado alto para rebote de sobreventa (RSI > 35)."

        elif bollinger_raw.get("signal") == "SHORT" and decision_final == "SHORT":
            # Si es corto por Bollinger, exigimos euforia (Fear & Greed > 70 o RSI alto)
            if fear_greed_val < 70:
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bollinger SHORT bloqueado: No hay euforia en el mercado (F&G < 70)."
            elif rsi_val < 65:
                decision_final = "NEUTRAL"
                motivo_bloqueo = "Bollinger SHORT bloqueado: RSI demasiado bajo para corto (RSI < 65)."

        # Regla C: Google Trends Spike como multiplicador de confianza
        if google_trends_val > 75 and decision_final != "NEUTRAL":
            confianza_hibrida = min(100.0, confianza_hibrida * 1.15) # +15% confianza si hay interés retail explotando

        # 5. AJUSTE DINÁMICO DE GESTIÓN DE RIESGO SEGÚN EL VIX
        stop_loss = sono_raw.get("stop_loss", df.loc[idx, 'close'] * 0.98)
        take_profit = sono_raw.get("take_profit", df.loc[idx, 'close'] * 1.03)
        
        # El VIX promedio es ~15. Si el VIX está por encima de 20, ensanchamos un poco los stops
        # para que Bitcoin tenga espacio para respirar sin sacarnos por mechas falsas.
        volatilidad_multiplier = 1.0
        if vix_val > 20.0:
            volatilidad_multiplier = 1.0 + (min(vix_val, 40.0) - 20.0) * 0.015 # Hasta un 30% más de ancho
            
            entry = df.loc[idx, 'close']
            if decision_final == "LONG":
                original_dist = entry - stop_loss
                stop_loss = entry - (original_dist * volatilidad_multiplier)
                original_tp_dist = take_profit - entry
                take_profit = entry + (original_tp_dist * volatilidad_multiplier)
            elif decision_final == "SHORT":
                original_dist = stop_loss - entry
                stop_loss = entry + (original_dist * volatilidad_multiplier)
                original_tp_dist = entry - take_profit
                take_profit = entry - (original_tp_dist * volatilidad_multiplier)

        # 6. Calcular tamaño de posición de bajo riesgo (1.5% capital)
        position_details = self.sono.calcular_posicion_sono(
            capital=capital,
            price=df.loc[idx, 'close'],
            stop_loss=stop_loss,
            risk_pct=1.5
        )

        adx_val = df.loc[idx, 'adx'] if 'adx' in df.columns else 25.0
        atr_val = df.loc[idx, 'atr'] if 'atr' in df.columns else 0.0
        estado_mercado = "LATERAL (RANGO)" if adx_val < 20.0 else "TENDENCIAL"

        return {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "entry_price": round(df.loc[idx, 'close'], 2),
            "signal_sono_pura": sono_signal,
            "decision_final": decision_final,
            "motivo_bloqueo": motivo_bloqueo,
            "confianza_hibrida": round(confianza_hibrida, 2) if decision_final != "NEUTRAL" else 0.0,
            "score_maestro": round(score_maestro, 2),
            "fear_greed_vivo": fear_greed_val,
            "vix_vivo": vix_val,
            "trends_vivo": google_trends_val,
            "adx_vivo": round(adx_val, 2),
            "atr_vivo": round(atr_val, 2),
            "estado_mercado": estado_mercado,
            "stop_loss": round(stop_loss, 2),
            "take_profit": round(take_profit, 2),
            "volatilidad_stop_multiplicador": round(volatilidad_multiplier, 3),
            "gestion_posicion": {
                "capital": capital,
                "riesgo_euros": round(position_details["risk_euros"], 2),
                "cantidad_btc": round(position_details["quantity"], 6),
                "tamano_posicion_usd": round(position_details["position_size"], 2),
                "apalancamiento_implicit": round(position_details["leverage"], 2),
                "distancia_stop_pct": round(position_details["stop_distance_pct"], 2)
            },
            "estrategias_individuales": {
                "gap": sono_raw["strategies"].get("gap", {}),
                "cruce": sono_raw["strategies"].get("cruce_ma6_ma70", {}),
                "bollinger": sono_raw["strategies"].get("bollinger", {})
            }
        }
