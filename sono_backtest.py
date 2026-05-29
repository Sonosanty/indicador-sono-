# Sono Pro Backtest — 30 días BTCUSDT 3m
# Simula trading historico con el Score Maestro Sono
# Compra en COMPRA/COMPRA_FUERTE (score>=62), vende en VENTA/CAPITULACION (score<=29)

import sys, os, csv, json, math
from datetime import datetime, timedelta, timezone
import requests

# Add workspace to path and import computeScore from sono_bot
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sono_bot import computeScore

SYMBOL = 'BTCUSDT'
INTERVAL = '3m'
DAYS = 30
LIMIT = 500  # fetch batches

# Trading thresholds
BUY_THRESHOLD = 62   # >= 62 => COMPRA / COMPRA FUERTE
SELL_THRESHOLD = 29  # <= 29 => VENTA / CAPITULACION

# Fees (Binance spot: 0.1%)
FEE_RATE = 0.001

def fetch_klines(symbol, interval, limit, start_time=None):
    """Fetch klines from Binance REST API."""
    url = 'https://api.binance.com/api/v3/klines'
    params = {
        'symbol': symbol,
        'interval': interval,
        'limit': min(limit, 1000)
    }
    if start_time:
        params['startTime'] = int(start_time * 1000)
    
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    
    candles = []
    for k in data:
        candles.append({
            'open': float(k[1]),
            'high': float(k[2]),
            'low': float(k[3]),
            'close': float(k[4]),
            'volume': float(k[5]),
            'time': int(k[0]) // 1000
        })
    return candles

def fetch_all_klines(symbol, interval, days):
    """Fetch all klines for the last N days."""
    now = int(datetime.now(timezone.utc).timestamp())
    start = now - days * 86400
    
    all_candles = []
    current_start = start
    
    while current_start < now:
        batch = fetch_klines(symbol, interval, 1000, current_start)
        if not batch:
            break
        all_candles.extend(batch)
        current_start = batch[-1]['time'] + 1
        # Avoid rate limiting
        import time as _time
        _time.sleep(0.2)
    
    return all_candles

def format_price(p):
    if p is None:
        return '—'
    return f'${p:,.2f}'

def run_backtest():
    print('=' * 60)
    print('SONO PRO BACKTEST — BTCUSDT 3m')
    print(f'Periodo: últimos {DAYS} días')
    print(f'Regla: Comprar score >= {BUY_THRESHOLD}, Vender score <= {SELL_THRESHOLD}')
    print('=' * 60)
    
    # Fetch candles
    print('\n📥 Descargando velas de Binance...')
    candles = fetch_all_klines(SYMBOL, INTERVAL, DAYS)
    print(f'   ✅ {len(candles)} velas descargadas')
    
    if len(candles) < 210:
        print('❌ Insuficientes velas para calcular Score Maestro (necesita 210)')
        return
    
    # Simulate trading
    trades = []
    in_position = False
    entry_price = 0
    entry_time = 0
    entry_score = 0
    entry_signal = ''
    
    peak_equity = 0
    max_dd = 0
    equity_curve = [0]  # cumulative R
    
    print('\n🔄 Procesando señales...')
    
    # We need at least 210 candles before we can compute the first score
    for i in range(210, len(candles)):
        window = candles[i-209:i+1]  # 210 candles up to current
        score = computeScore(window)
        if not score:
            continue
        
        c = candles[i]
        price = c['close']
        ts = datetime.fromtimestamp(c['time'], tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
        
        total = score['total']
        signal = score['signal']
        level = score['level']
        
        # Entry signal: score >= BUY_THRESHOLD and not in position
        if not in_position and total >= BUY_THRESHOLD:
            in_position = True
            entry_price = price
            entry_time = c['time']
            entry_score = total
            entry_signal = signal
            
            trade = {
                'entry_time': ts,
                'entry_price': entry_price,
                'entry_score': entry_score,
                'entry_signal': entry_signal,
                'exit_time': '',
                'exit_price': 0,
                'exit_score': 0,
                'exit_signal': '',
                'pnl_pct': 0,
                'pnl_r': 0,
                'result': 'OPEN'
            }
            trades.append(trade)
        
        # Exit signal: score <= SELL_THRESHOLD and in position
        elif in_position and total <= SELL_THRESHOLD:
            exit_price = price
            exit_time_ts = c['time']
            exit_score = total
            exit_signal = signal
            
            # Calculate PnL as R-multiple (1R = ATR at entry)
            # For simplicity, use flat PnL%
            pnl_pct = ((exit_price - entry_price) / entry_price) * 100
            
            # Estimate ATR for R calculation
            atr_val = score.get('atr')
            if atr_val and atr_val > 0:
                pnl_r = (exit_price - entry_price) / atr_val
            else:
                pnl_r = pnl_pct / 2  # rough fallback
            
            result = 'WIN' if pnl_pct > 0 else 'LOSS'
            
            if trades:
                trades[-1]['exit_time'] = ts
                trades[-1]['exit_price'] = exit_price
                trades[-1]['exit_score'] = exit_score
                trades[-1]['exit_signal'] = exit_signal
                trades[-1]['pnl_pct'] = round(pnl_pct, 2)
                trades[-1]['pnl_r'] = round(pnl_r, 2)
                trades[-1]['result'] = result
            
            # Update equity curve
            r_gained = round(pnl_r, 2)
            equity_curve.append(equity_curve[-1] + r_gained)
            
            # Track drawdown
            if equity_curve[-1] > peak_equity:
                peak_equity = equity_curve[-1]
            dd = peak_equity - equity_curve[-1]
            if dd > max_dd:
                max_dd = dd
            
            in_position = False
            
            symbol = '🟢' if result == 'WIN' else '🔴'
            print(f'{symbol} {ts} | Entry: ${entry_price:,.2f} → Exit: ${exit_price:,.2f} | '
                  f'{pnl_pct:+.2f}% | R: {pnl_r:+.2f} | Señal: {entry_signal}→{exit_signal}')
    
    # Close any open position at last price
    if in_position and len(candles) > 0:
        last_price = candles[-1]['close']
        last_ts = datetime.fromtimestamp(candles[-1]['time'], tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
        pnl_pct = ((last_price - entry_price) / entry_price) * 100
        pnl_r = pnl_pct / 2
        
        result = 'WIN' if pnl_pct > 0 else 'LOSS'
        
        if trades:
            trades[-1]['exit_time'] = last_ts + ' (ABIERTO)'
            trades[-1]['exit_price'] = last_price
            trades[-1]['pnl_pct'] = round(pnl_pct, 2)
            trades[-1]['pnl_r'] = round(pnl_r, 2)
            trades[-1]['result'] = result
        
        r_gained = round(pnl_r, 2)
        equity_curve.append(equity_curve[-1] + r_gained)
        
        if equity_curve[-1] > peak_equity:
            peak_equity = equity_curve[-1]
        dd = peak_equity - equity_curve[-1]
        if dd > max_dd:
            max_dd = dd
        
        print(f'📌 {last_ts} | Cierre forzado (posición abierta) | {pnl_pct:+.2f}% | R: {pnl_r:+.2f}')
        in_position = False
    
    # Calculate statistics
    completed_trades = [t for t in trades if t['result'] != 'OPEN']
    wins = [t for t in completed_trades if t['result'] == 'WIN']
    losses = [t for t in completed_trades if t['result'] == 'LOSS']
    
    total_trades = len(completed_trades)
    win_count = len(wins)
    loss_count = len(losses)
    winrate = (win_count / total_trades * 100) if total_trades > 0 else 0
    
    total_profit = sum(w['pnl_r'] for w in wins)
    total_loss = abs(sum(l['pnl_r'] for l in losses))
    profit_factor = (total_profit / total_loss) if total_loss > 0 else float('inf')
    
    total_pnl = sum(t['pnl_r'] for t in completed_trades)
    
    # Max consecutive wins/losses
    max_consec_wins = 0
    max_consec_losses = 0
    streak = 0
    for t in completed_trades:
        if t['result'] == 'WIN':
            streak = streak + 1 if streak > 0 else 1
            max_consec_wins = max(max_consec_wins, streak)
        else:
            streak = streak - 1 if streak < 0 else -1
            max_consec_losses = max(max_consec_losses, abs(streak))
    
    print('\n' + '=' * 60)
    print('📊 RESULTADOS DEL BACKTEST')
    print('=' * 60)
    print(f'\n📈 Total trades:          {total_trades}')
    print(f'   🟢 Ganadoras:           {win_count}')
    print(f'   🔴 Perdedoras:          {loss_count}')
    print(f'   🎯 Winrate:             {winrate:.1f}%')
    print(f'   💰 Profit Factor:       {profit_factor:.2f}x' if profit_factor != float('inf') else '   💰 Profit Factor:       ∞')
    print(f'   📊 Total PnL:           {total_pnl:+.2f}R')
    print(f'   📉 Max Drawdown:        {max_dd:.2f}R')
    print(f'   📊 Mejor racha wins:    {max_consec_wins}')
    print(f'   📊 Peor racha losses:   {max_consec_losses}')
    
    # Average trade performance
    if total_trades > 0:
        avg_r = total_pnl / total_trades
        print(f'   📊 R medio por trade:   {avg_r:+.3f}R')
        win_avg_r = (total_profit / win_count) if win_count > 0 else 0
        loss_avg_r = (-total_loss / loss_count) if loss_count > 0 else 0
        print(f'   📊 R medio ganadoras:   {win_avg_r:+.3f}R')
        print(f'   📊 R medio perdedoras:  {loss_avg_r:+.3f}R')
        expectancy = (winrate/100 * win_avg_r) + ((1-winrate/100) * loss_avg_r)
        print(f'   📊 Expectancy:          {expectancy:+.3f}R')
    
    print(f'\n   Periodo: últimos {DAYS} días · {INTERVAL}')
    print(f'   Regla: Comprar >= {BUY_THRESHOLD} score · Vender <= {SELL_THRESHOLD} score')
    
    # Save results to CSV
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sono_backtest_results.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'entry_time', 'entry_price', 'entry_score', 'entry_signal',
            'exit_time', 'exit_price', 'exit_score', 'exit_signal',
            'pnl_pct', 'pnl_r', 'result'
        ])
        writer.writeheader()
        for t in completed_trades:
            writer.writerow(t)
    
    print(f'\n💾 Resultados guardados en: sono_backtest_results.csv')
    print(f'   ({len(completed_trades)} trades registrados)')
    print('=' * 60)

if __name__ == '__main__':
    run_backtest()
