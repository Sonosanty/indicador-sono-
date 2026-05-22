"""
BACKTESTER_SONO.PY (FINO EDITION 👒)
Simulador Cuantitativo de Alto Rendimiento para el Método Sono.
- Descarga velas reales por la API de Binance (hasta 1000 horas).
- Calcula todos los indicadores (MA6, MA40, MA70, MA200, ATR, ADX, Bollinger).
- Simula ejecuciones precisas evitando sesgo de mirada a futuro (look-ahead bias).
- Descuenta comisiones reales de exchange (0.1% estándar).
- Genera un reporte institucional detallado.
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any

# Asegurar importación de indicators y de la estrategia
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from indicators import fetch_binance_klines, calculate_atr, calculate_adx, calculate_rsi
from sono_strategy import SonoStrategy

class BacktesterSono:
    def __init__(self, initial_capital: float = 10000.0, commission: float = 0.001):
        """
        Inicializar el backtester cuantitativo
        
        Args:
            initial_capital: Capital de inicio en USD
            commission: Comisión del exchange por transacción (0.001 = 0.1% spot estándar)
        """
        self.initial_capital = initial_capital
        self.commission = commission
        self.strategy = SonoStrategy()
        
    def run_backtest(self, coin: str = "BTC", limit: int = 1000) -> Dict[str, Any]:
        """
        Ejecuta la simulación histórica sobre los datos descargados de Binance
        """
        symbol = "BTCUSDT" if coin == "BTC" else f"{coin}USDT"
        print(f"\n[BACKTEST] Descargando últimas {limit} velas de {symbol} en Binance (timeframe 1h)...")
        
        df = fetch_binance_klines(symbol=symbol, interval="1h", limit=limit)
        if df is None or df.empty:
            raise ValueError(f"No se pudieron descargar datos de Binance para {symbol}")
            
        print(f"[BACKTEST] Descargadas {len(df)} velas. Iniciando cálculo de indicadores...")
        
        # 1. Calcular indicadores de la estrategia
        df = self.strategy.calculate_medias_sono(df)
        df['rsi'] = calculate_rsi(df, 'close', 14)
        
        # Bollinger Bands para la estrategia
        df['bb_mid'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_up'] = df['bb_mid'] + (2.0 * df['bb_std'])
        df['bb_low'] = df['bb_mid'] - (2.0 * df['bb_std'])
        
        # 2. Variables de control de simulación
        capital = self.initial_capital
        position_active = False
        position_type = None # 'LONG' o 'SHORT'
        entry_price = 0.0
        stop_loss = 0.0
        take_profit = 0.0
        shares = 0.0 # Cantidad comprada/vendida de cripto
        trades = []
        
        # Para calcular Buy & Hold
        bh_entry_price = df['close'].iloc[200] # Empezamos el hold donde la MA200 ya está calculada
        bh_exit_price = df['close'].iloc[-1]
        bh_return_pct = ((bh_exit_price - bh_entry_price) / bh_entry_price) * 100
        
        # Bucle principal de simulación (comenzamos en 201 para tener MA200 calculada)
        for idx in range(201, len(df)):
            current_row = df.iloc[idx]
            close_price = current_row['close']
            high_price = current_row['high']
            low_price = current_row['low']
            open_price = current_row['open']
            dt = current_row['datetime']
            
            # --- CASO A: GESTIONAR POSICIÓN ACTIVA ---
            if position_active:
                # Comprobación conservadora de trigger de salida (Stop Loss / Take Profit)
                triggered_sl = False
                triggered_tp = False
                
                if position_type == 'LONG':
                    # Si el precio mínimo toca o cruza el SL
                    if low_price <= stop_loss:
                        triggered_sl = True
                    # Si el precio máximo toca o cruza el TP
                    if high_price >= take_profit:
                        triggered_tp = True
                        
                    if triggered_sl and triggered_tp:
                        # Si ambos se tocan en la misma vela de 1h, asumimos la pérdida de forma conservadora
                        exit_price = stop_loss
                        exit_reason = 'STOP_LOSS (CONSERVADOR)'
                    elif triggered_sl:
                        exit_price = stop_loss
                        exit_reason = 'STOP_LOSS'
                    elif triggered_tp:
                        exit_price = take_profit
                        exit_reason = 'TAKE_PROFIT'
                    else:
                        exit_price = None
                        
                elif position_type == 'SHORT':
                    # Si el precio máximo toca o cruza el SL (hacia arriba)
                    if high_price >= stop_loss:
                        triggered_sl = True
                    # Si el precio mínimo toca o cruza el TP (hacia abajo)
                    if low_price <= take_profit:
                        triggered_tp = True
                        
                    if triggered_sl and triggered_tp:
                        exit_price = stop_loss
                        exit_reason = 'STOP_LOSS (CONSERVADOR)'
                    elif triggered_sl:
                        exit_price = stop_loss
                        exit_reason = 'STOP_LOSS'
                    elif triggered_tp:
                        exit_price = take_profit
                        exit_reason = 'TAKE_PROFIT'
                    else:
                        exit_price = None
                
                # Ejecutar salida de la operación si se ha disparado el trigger
                if exit_price is not None:
                    # Calcular retorno bruto
                    if position_type == 'LONG':
                        gross_return = (exit_price - entry_price) * shares
                    else: # SHORT
                        gross_return = (entry_price - exit_price) * shares
                        
                    # Aplicar comisión de salida
                    commission_fee = exit_price * shares * self.commission
                    net_return = gross_return - commission_fee
                    capital_before = capital + gross_return # Guardar capital bruto de la operacion
                    capital += net_return
                    
                    trades.append({
                        'type': position_type,
                        'entry_time': entry_time,
                        'exit_time': dt,
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'net_profit_usd': net_return,
                        'return_pct': (net_return / (entry_price * shares)) * 100,
                        'reason': exit_reason,
                        'balance': capital
                    })
                    
                    position_active = False
                    position_type = None
                    shares = 0.0
            
            # --- CASO B: BUSCAR SEÑALES DE ENTRADA ---
            if not position_active:
                # Obtener la señal completa de Sono para la vela actual
                prev_close = df['close'].iloc[idx - 1]
                sig_info = self.strategy.estrategia_completa_sono(df, idx, prev_close)
                
                if sig_info['signal'] in ['LONG', 'SHORT']:
                    # Calcular el tamaño de la posición respetando el riesgo estricto (1.5%)
                    # Usamos la calculadora integrada de Sono para que use el stop ajustado por ATR
                    pos_info = self.strategy.calcular_posicion_sono(
                        capital=capital,
                        price=close_price,
                        stop_loss=sig_info['stop_loss'],
                        risk_pct=1.5
                    )
                    
                    # Evitar comprar montos nulos
                    if pos_info['quantity'] > 0:
                        position_active = True
                        position_type = sig_info['signal']
                        entry_price = close_price
                        stop_loss = sig_info['stop_loss']
                        take_profit = sig_info['take_profit']
                        entry_time = dt
                        
                        # Comisión de entrada
                        commission_fee = entry_price * pos_info['quantity'] * self.commission
                        capital -= commission_fee
                        shares = pos_info['quantity']
        
        # 3. Métricas finales del reporte
        total_trades = len(trades)
        if total_trades > 0:
            winning_trades = [t for t in trades if t['net_profit_usd'] > 0]
            win_rate = (len(winning_trades) / total_trades) * 100
            
            gross_profits = sum([t['net_profit_usd'] for t in trades if t['net_profit_usd'] > 0])
            gross_losses = sum([abs(t['net_profit_usd']) for t in trades if t['net_profit_usd'] < 0])
            
            profit_factor = gross_profits / gross_losses if gross_losses > 0 else float('inf')
            
            # Drawdown Máximo del balance
            balance_history = [self.initial_capital] + [t['balance'] for t in trades]
            peaks = np.maximum.accumulate(balance_history)
            drawdowns = (peaks - balance_history) / peaks * 100
            max_drawdown = np.max(drawdowns)
        else:
            win_rate = 0.0
            profit_factor = 0.0
            max_drawdown = 0.0
            
        final_capital = capital
        strategy_return_pct = ((final_capital - self.initial_capital) / self.initial_capital) * 100
        
        return {
            'coin': coin,
            'limit': limit,
            'initial_capital': self.initial_capital,
            'final_capital': final_capital,
            'strategy_return_pct': strategy_return_pct,
            'bh_return_pct': bh_return_pct,
            'total_trades': total_trades,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'max_drawdown_pct': max_drawdown,
            'trades_list': trades
        }

def print_gorgeous_report(report: Dict[str, Any]):
    """Imprime el informe institucional del backtest en consola de forma hermosa"""
    print("\n" + "="*70)
    print(f" [FINO] REPORT COMPLETO DE BACKTESTING: METODO SONO (FINO EDITION)")
    print("="*70)
    print(f" Activo Evaluado:            {report['coin']}USDT")
    print(f" Período del Historial:      Últimas {report['limit']} velas de 1h (~41 días)")
    print(f" Capital Inicial:            ${report['initial_capital']:,.2f} USD")
    print(f" Comisión de Exchange:       0.1% por operación (Estándar Spot)")
    print("-"*70)
    
    # Capital final y retornos
    color_ret = "\033[92m" if report['strategy_return_pct'] >= 0 else "\033[91m"
    color_bh = "\033[92m" if report['bh_return_pct'] >= 0 else "\033[91m"
    color_reset = "\033[0m"
    
    print(f" Capital Final Obtenido:     {color_ret}${report['final_capital']:,.2f} USD{color_reset}")
    print(f" Retorno de la Estrategia:   {color_ret}{report['strategy_return_pct']:.2f}%{color_reset}")
    print(f" Retorno de Comprar y Mantener: {color_bh}{report['bh_return_pct']:.2f}%{color_reset}")
    print(f" Alfa (Exceso vs Buy&Hold):  {color_ret}{(report['strategy_return_pct'] - report['bh_return_pct']):+.2f}%{color_reset}")
    print("-"*70)
    
    # Métricas de rendimiento
    print(f" Total de Operaciones:       {report['total_trades']}")
    print(f" Win Rate (Aciertos):        {report['win_rate']:.1f}%")
    print(f" Profit Factor:              {report['profit_factor']:.2f}")
    print(f" Drawdown Máximo Histórico:  \033[91m{report['max_drawdown_pct']:.2f}%\033[0m")
    print("="*70)
    
    # Listado de operaciones individuales
    if report['total_trades'] > 0:
        print("\n[OPERACIONES] HISTORIAL DETALLADO DE OPERACIONES:")
        print("-"*105)
        print(f"{'Tipo':<6} | {'Fecha Entrada':<19} | {'Fecha Salida':<19} | {'E. Price':<9} | {'X. Price':<9} | {'Ganancia ($)':<12} | {'Ret (%)':<8} | {'Motivo':<15}")
        print("-"*105)
        for t in report['trades_list']:
            col = "\033[92m" if t['net_profit_usd'] > 0 else "\033[91m"
            print(f"{t['type']:<6} | {t['entry_time'].strftime('%Y-%m-%d %H:%M'):<19} | {t['exit_time'].strftime('%Y-%m-%d %H:%M'):<19} | {t['entry_price']:<9.2f} | {t['exit_price']:<9.2f} | {col}{t['net_profit_usd']:<12.2f}{color_reset} | {col}{t['return_pct']:<8.2f}{color_reset} | {t['reason']:<15}")
        print("-"*105)

if __name__ == "__main__":
    # Si se pasa como argumento una moneda, correr el test para esa moneda
    coin_arg = sys.argv[1].upper() if len(sys.argv) > 1 else "BTC"
    
    backtester = BacktesterSono(initial_capital=10000.0)
    res = backtester.run_backtest(coin=coin_arg, limit=1000)
    print_gorgeous_report(res)
