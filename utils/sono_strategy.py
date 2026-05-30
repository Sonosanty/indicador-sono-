"""
Método Sono adaptado a BTC
Estrategias intradía basadas en cruces de medias, gaps y Bollinger Bands

Pilares del Método Sono:
1. Cruces de Medias Móviles (MM6, MM40, MM70, MM200)
2. Operativa de Gaps (cierre de huecos)
3. Bandas de Bollinger (rebotes)
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, List
from datetime import datetime, timedelta


class SonoStrategy:
    """
    Implementación del Método Sono para BTC

    Filosofía:
    - Trading intradía (cierre posiciones antes del fin de sesión)
    - Alta volatilidad y volumen
    - Disciplina y stops dinámicos
    - Horarios clave: primeras horas y última hora
    """

    def __init__(self):
        """Inicializar estrategia Sono"""
        # Configuración de Medias Móviles según Sono
        self.ma_periods = {
            'ma6': 6, # Media ultra corta (señales rápidas)
            'ma40': 40, # Media corta (soporte/resistencia)
            'ma70': 70, # Media intermedia (cruce clave con MA6)
            'ma200': 200 # Media larga (tendencia principal)
        }

        # Horarios óptimos de operación (UTC - ajustar según mercado)
        self.optimal_hours = {
            'morning_start': 9, # 9:00 - 11:00 (alta volatilidad)
            'morning_end': 11,
            'afternoon_start': 14, # Última hora de mercado
            'afternoon_end': 17
        }

        # Parámetros de riesgo Sono
        self.risk_per_trade = 0.015 # 1.5% por operación
        self.max_risk_per_trade = 0.05 # 5% máximo

    def calculate_medias_sono(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calcular las 4 medias móviles del Método Sono, además de ATR y ADX.

        Args:
            df: DataFrame con columna 'close'

        Returns:
            DataFrame con MA6, MA40, MA70, MA200, atr y adx
        """
        for name, period in self.ma_periods.items():
            df[name] = df['close'].rolling(window=period).mean()

        # Importación segura para evitar importaciones circulares
        from indicators import calculate_atr, calculate_adx

        # Calcular ATR y ADX si existen las columnas necesarias (high, low, close)
        if 'high' in df.columns and 'low' in df.columns and 'close' in df.columns:
            df['atr'] = calculate_atr(df)
            df['adx'], df['plus_di'], df['minus_di'] = calculate_adx(df)
        else:
            # Fallbacks seguros por si son datos de prueba simplificados sin high/low
            df['atr'] = df['close'] * 0.02 # 2% aproximado como fallback
            df['adx'] = 25.0 # Tendencia moderada por defecto
            df['plus_di'] = 25.0
            df['minus_di'] = 20.0

        return df

    def detect_gap(self, previous_close: float, current_open: float,
                   min_gap_pct: float = 0.5) -> Dict:
        """
        Detectar gap de apertura (núcleo del Método Sono)

        Gap alcista: apertura > cierre previo
        Gap bajista: apertura < cierre previo

        Args:
            previous_close: Precio de cierre anterior
            current_open: Precio de apertura actual
            min_gap_pct: % mínimo para considerar gap significativo

        Returns:
            Dict con tipo, tamaño y target del gap
        """
        gap_pct = ((current_open - previous_close) / previous_close) * 100

        if abs(gap_pct) < min_gap_pct:
            return {
                'has_gap': False,
                'type': 'NINGUNO',
                'gap_pct': 0,
                'gap_points': 0,
                'target_price': previous_close
            }

        gap_type = 'ALCISTA' if gap_pct > 0 else 'BAJISTA'

        return {
            'has_gap': True,
            'type': gap_type,
            'gap_pct': gap_pct,
            'gap_points': abs(current_open - previous_close),
            'target_price': previous_close, # Objetivo: cerrar el gap
            'signal': 'SHORT' if gap_type == 'ALCISTA' else 'LONG' # Operamos el cierre
        }

    def cruce_ma6_ma70(self, df: pd.DataFrame, idx: int) -> Dict:
        """
        Detectar cruce MA6 sobre MA70 (señal clave Sono)

        LONG: MA6 cruza al alza MA70
        SHORT: MA6 cruza a la baja MA70

        Args:
            df: DataFrame con MA6 y MA70
            idx: Índice actual para evaluar

        Returns:
            Dict con señal, tipo y precios
        """
        if idx < 1:
            return {'signal': 'NEUTRAL', 'type': 'NO_CRUCE'}

        # Valores actuales
        ma6_now = df.loc[idx, 'ma6']
        ma70_now = df.loc[idx, 'ma70']

        # Valores previos
        ma6_prev = df.loc[idx - 1, 'ma6']
        ma70_prev = df.loc[idx - 1, 'ma70']

        # Detectar cruce alcista
        if ma6_prev <= ma70_prev and ma6_now > ma70_now:
            return {
                'signal': 'LONG',
                'type': 'CRUCE_ALCISTA',
                'ma6': ma6_now,
                'ma70': ma70_now,
                'strength': abs(ma6_now - ma70_now) / ma70_now * 100,
                'entry_price': df.loc[idx, 'close'],
                'stop_loss': ma70_now * 0.98, # 2% bajo MA70
                'take_profit': df.loc[idx, 'close'] * 1.03 # +3% objetivo
            }

        # Detectar cruce bajista
        elif ma6_prev >= ma70_prev and ma6_now < ma70_now:
            return {
                'signal': 'SHORT',
                'type': 'CRUCE_BAJISTA',
                'ma6': ma6_now,
                'ma70': ma70_now,
                'strength': abs(ma6_now - ma70_now) / ma70_now * 100,
                'entry_price': df.loc[idx, 'close'],
                'stop_loss': ma70_now * 1.02, # 2% sobre MA70
                'take_profit': df.loc[idx, 'close'] * 0.97 # -3% objetivo
            }

        return {'signal': 'NEUTRAL', 'type': 'NO_CRUCE'}

    def bollinger_rebote(self, df: pd.DataFrame, idx: int,
                         period: int = 20, std: float = 2.0) -> Dict:
        """
        Estrategia de rebote en Bandas de Bollinger (tercer pilar Sono)

        LONG: precio toca banda inferior
        SHORT: precio toca banda superior
        Objetivo: volver a la media (MA20)

        Args:
            df: DataFrame con precio
            idx: Índice actual
            period: Período para Bollinger (default 20)
            std: Desviación estándar (default 2.0)

        Returns:
            Dict con señal de rebote
        """
        # Calcular Bollinger Bands
        if idx < period:
            return {'signal': 'NEUTRAL', 'type': 'INSUFICIENTES_DATOS'}

        prices = df['close'].iloc[idx - period + 1:idx + 1]
        ma = prices.mean()
        sd = prices.std()

        upper_band = ma + (std * sd)
        lower_band = ma - (std * sd)

        current_price = df.loc[idx, 'close']

        # Detectar toque en banda inferior (rebote alcista)
        if current_price <= lower_band * 1.002: # 0.2% tolerancia
            distance_to_ma = ((ma - current_price) / current_price) * 100

            return {
                'signal': 'LONG',
                'type': 'REBOTE_BANDA_INFERIOR',
                'entry_price': current_price,
                'target_price': ma, # Objetivo: volver a la media
                'stop_loss': lower_band * 0.98,
                'upper_band': upper_band,
                'lower_band': lower_band,
                'ma': ma,
                'distance_to_ma': distance_to_ma,
                'potential_profit': distance_to_ma
            }

        # Detectar toque en banda superior (rebote bajista)
        elif current_price >= upper_band * 0.998:
            distance_to_ma = ((current_price - ma) / current_price) * 100

            return {
                'signal': 'SHORT',
                'type': 'REBOTE_BANDA_SUPERIOR',
                'entry_price': current_price,
                'target_price': ma,
                'stop_loss': upper_band * 1.02,
                'upper_band': upper_band,
                'lower_band': lower_band,
                'ma': ma,
                'distance_to_ma': distance_to_ma,
                'potential_profit': distance_to_ma
            }

        return {'signal': 'NEUTRAL', 'type': 'PRECIO_EN_RANGO'}

    def filtro_tendencia_ma200(self, df: pd.DataFrame, idx: int) -> str:
        """
        Filtro de tendencia principal con MA200 (Sono) y ADX de 14 períodos.

        Returns:
            'ALCISTA', 'BAJISTA' o 'LATERAL'
        """
        if idx < 200:
            return 'INSUFICIENTES_DATOS'

        # Si el ADX indica rango lateral (ADX < 20), el mercado se considera LATERAL
        if 'adx' in df.columns and df.loc[idx, 'adx'] < 20.0:
            return 'LATERAL'

        price = df.loc[idx, 'close']
        ma200 = df.loc[idx, 'ma200']
        ma40 = df.loc[idx, 'ma40']

        # Tendencia alcista clara
        if price > ma200 and ma40 > ma200:
            return 'ALCISTA'

        # Tendencia bajista clara
        elif price < ma200 and ma40 < ma200:
            return 'BAJISTA'

        # Lateral o indefinido
        else:
            return 'LATERAL'

    def estrategia_completa_sono(self, df: pd.DataFrame, idx: int,
                                  previous_close: float = None) -> Dict:
        """
        ESTRATEGIA COMPLETA DEL MÉTODO SONO (Fino Edition con ATR y ADX)

        Combina los 3 pilares:
        1. Gap (si aplica)
        2. Cruce MA6-MA70 (suprimido/atenuado si ADX < 20)
        3. Rebote Bollinger (priorizado si ADX < 20)

        Filtrado por:
        - MA200 (tendencia principal)
        - ADX de 14 períodos (filtro lateral inteligente)
        - Horario óptimo (si se proporciona timestamp)

        Returns:
            Dict con señal final, confianza y detalles
        """
        result = {
            'timestamp': df.loc[idx, 'timestamp'] if 'timestamp' in df.columns else datetime.now(),
            'price': df.loc[idx, 'close'],
            'signal': 'NEUTRAL',
            'confidence': 0,
            'strategies': {},
            'tendencia_principal': 'DESCONOCIDA',
            'horario_optimo': False,
            'details': {}
        }

        # 1. Filtro de tendencia MA200 y ADX
        tendencia = self.filtro_tendencia_ma200(df, idx)
        result['tendencia_principal'] = tendencia

        # Obtener ADX actual
        adx_now = df.loc[idx, 'adx'] if 'adx' in df.columns else 25.0
        is_lateral = adx_now < 20.0
        result['details']['adx'] = round(adx_now, 2)
        result['details']['is_lateral'] = is_lateral

        # 2. Gap (si hay cierre previo)
        if previous_close:
            current_open = df.loc[idx, 'open'] if 'open' in df.columns else df.loc[idx, 'close']
            gap_info = self.detect_gap(previous_close, current_open)
            result['strategies']['gap'] = gap_info

        # 3. Cruce MA6-MA70
        cruce_info = self.cruce_ma6_ma70(df, idx)
        result['strategies']['cruce_ma6_ma70'] = cruce_info

        # 4. Bollinger Rebote
        bollinger_info = self.bollinger_rebote(df, idx)
        result['strategies']['bollinger'] = bollinger_info

        # 5. Calcular señal final y confianza aplicando filtros inteligentes de ADX
        signals = []
        confidence = 0

        # Gap (peso 30%)
        if result['strategies'].get('gap', {}).get('has_gap'):
            gap_signal = result['strategies']['gap']['signal']
            signals.append(gap_signal)
            confidence += 30

        # Cruce MA6-MA70 (peso 40%) - Bloqueado o atenuado en lateral para evitar sierra
        if cruce_info['signal'] != 'NEUTRAL':
            if is_lateral:
                result['details']['cruce_bloqueado_por_lateral'] = True
            else:
                signals.append(cruce_info['signal'])
                confidence += 40

        # Bollinger (peso 30%) - Priorizado en mercados laterales (rango)
        if bollinger_info['signal'] != 'NEUTRAL':
            if is_lateral:
                signals.append(bollinger_info['signal'])
                confidence += 50 # Peso mayor para rebote en lateral
                result['details']['bollinger_priorizado_por_lateral'] = True
            else:
                signals.append(bollinger_info['signal'])
                confidence += 30

        # Determinar señal final (mayoría o neutral)
        if signals:
            long_count = signals.count('LONG')
            short_count = signals.count('SHORT')

            if long_count > short_count:
                result['signal'] = 'LONG'
                result['confidence'] = confidence
            elif short_count > long_count:
                result['signal'] = 'SHORT'
                result['confidence'] = confidence
            else:
                result['signal'] = 'NEUTRAL'
                result['confidence'] = confidence / 2

        # 6. Ajustar confianza según tendencia MA200 / ADX
        if tendencia == 'ALCISTA' and result['signal'] == 'LONG':
            result['confidence'] = min(100, result['confidence'] * 1.2)
        elif tendencia == 'BAJISTA' and result['signal'] == 'SHORT':
            result['confidence'] = min(100, result['confidence'] * 1.2)
        elif tendencia == 'LATERAL':
            result['confidence'] *= 0.8

        # Redondear confianza
        result['confidence'] = round(result['confidence'], 1)

        # 7. Stops y objetivos dinámicos adaptados por volatilidad (ATR)
        atr_now = df.loc[idx, 'atr'] if 'atr' in df.columns else df.loc[idx, 'close'] * 0.02
        result['details']['atr'] = round(atr_now, 2)

        if result['signal'] == 'LONG':
            result['stop_loss'] = result['price'] - (1.5 * atr_now)
            result['take_profit'] = result['price'] + (3.0 * atr_now)
        elif result['signal'] == 'SHORT':
            result['stop_loss'] = result['price'] + (1.5 * atr_now)
            result['take_profit'] = result['price'] - (3.0 * atr_now)

        return result

    def calcular_posicion_sono(self, capital: float, price: float,
                                stop_loss: float, risk_pct: float = 1.5) -> Dict:
        """
        Calcular tamaño de posición según Método Sono

        Risk: 1.5% de la cuenta por operación (hasta 5% máximo)

        Args:
            capital: Capital total
            price: Precio de entrada
            stop_loss: Precio de stop loss
            risk_pct: % de riesgo (default 1.5%)

        Returns:
            Dict con tamaño de posición y detalles
        """
        risk_pct = min(risk_pct, 5.0) # Máximo 5%

        riesgo_euros = capital * (risk_pct / 100)
        stop_distance = abs(price - stop_loss)
        stop_distance_pct = (stop_distance / price) * 100

        # Cantidad a comprar
        quantity = riesgo_euros / stop_distance if stop_distance > 0 else 0
        position_size = quantity * price

        # Apalancamiento implícito (CFDs)
        leverage = position_size / capital if capital > 0 else 1

        return {
            'capital': capital,
            'risk_euros': riesgo_euros,
            'risk_pct': risk_pct,
            'price': price,
            'stop_loss': stop_loss,
            'stop_distance': stop_distance,
            'stop_distance_pct': stop_distance_pct,
            'quantity': quantity,
            'position_size': position_size,
            'leverage': leverage,
            'max_loss': riesgo_euros
        }


def ejemplo_uso():
    """Ejemplo de uso del Método Sono"""

    # Crear datos de ejemplo
    dates = pd.date_range(start='2026-05-01', periods=250, freq='1h')
    np.random.seed(42)

    # Simular precio BTC
    price = 77000
    prices = [price]
    for _ in range(249):
        change = np.random.normal(0, 500)
        price = price + change
        prices.append(price)

    df = pd.DataFrame({
        'timestamp': dates,
        'close': prices,
        'open': [p * 0.999 for p in prices]
    })

    # Inicializar estrategia
    sono = SonoStrategy()

    # Calcular medias móviles
    df = sono.calculate_medias_sono(df)

    print("="*60)
    print("MÉTODO SONO - ANÁLISIS BTC")
    print("="*60)

    # Analizar últimas 5 velas
    for i in range(245, 250):
        if i < 200:
            continue

        previous_close = df.loc[i-1, 'close'] if i > 0 else None

        signal = sono.estrategia_completa_sono(df, i, previous_close)

        if signal['signal'] != 'NEUTRAL':
            print(f"\n📊 Señal detectada:")
            print(f" Fecha: {signal['timestamp']}")
            print(f" Precio: ${signal['price']:,.0f}")
            print(f" Señal: {signal['signal']}")
            print(f" Confianza: {signal['confidence']:.1f}%")
            print(f" Tendencia MA200: {signal['tendencia_principal']}")

            # Mostrar estrategias activas
            for name, data in signal['strategies'].items():
                if data.get('signal') == signal['signal']:
                    print(f" ✅ {name}: {data.get('type', 'N/A')}")

            # Calcular posición
            if 'stop_loss' in signal:
                capital = 10000 # $10k ejemplo
                pos = sono.calcular_posicion_sono(
                    capital,
                    signal['price'],
                    signal['stop_loss']
                )

                print(f"\n💰 Gestión de posición:")
                print(f" Capital: ${pos['capital']:,.0f}")
                print(f" Riesgo: ${pos['risk_euros']:,.2f} ({pos['risk_pct']:.1f}%)")
                print(f" Cantidad BTC: {pos['quantity']:.6f}")
                print(f" Tamaño posición: ${pos['position_size']:,.0f}")
                print(f" Apalancamiento: {pos['leverage']:.2f}x")
                print(f" Stop Loss: ${signal['stop_loss']:,.0f} (-{pos['stop_distance_pct']:.2f}%)")
                print(f" Take Profit: ${signal.get('take_profit', 0):,.0f}")


if __name__ == "__main__":
    ejemplo_uso()
