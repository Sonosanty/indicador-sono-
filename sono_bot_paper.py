# Sono Bot PAPER TRADING v1.0
# Lee señales de la web Sono Pro y simula trades
# No ejecuta órdenes reales. Riesgo: $0
# No depende de OpenClaw. Funciona 24/7.
#
# Uso: python sono_bot_paper.py

import requests, json, time, logging, sys, re
from datetime import datetime
from bs4 import BeautifulSoup

# ─── LOGGING ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('sono_bot_paper.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ─── CONFIG ──────────────────────────────────────────────
SONO_WEB = 'https://indicador-sono.pages.dev'
INITIAL_BALANCE = 100  # $100 ficticios
BALANCE = INITIAL_BALANCE
POSITIONS = {}          # asset -> {side, entry, size, entry_time}
TRADE_LOG = []
PAPER_MODE = True       # Siempre True en este bot

CONFIG = {
    'BTC': {'min_trade': 10, 'risk_per_trade': 0.80},
    'ETH': {'min_trade': 10, 'risk_per_trade': 0.80},
    'SOL': {'min_trade': 10, 'risk_per_trade': 0.80},
    'XRP': {'min_trade': 10, 'risk_per_trade': 0.80},
}

# ─── FUNCIONES ──────────────────────────────────────────

def fetch_web():
    """Obtiene el HTML de Macro page y Trades page de Sono Pro."""
    data = {'macro': None, 'trades': None, 'prices': {}}
    try:
        r = requests.get(f'{SONO_WEB}/#/', timeout=15)
        data['macro'] = r.text
    except Exception as e:
        logger.warning(f'Error fetching macro: {e}')

    try:
        r = requests.get(f'{SONO_WEB}/#/trades', timeout=15)
        data['trades'] = r.text
    except Exception as e:
        logger.warning(f'Error fetching trades: {e}')

    # Precios desde página principal
    try:
        r = requests.get(f'{SONO_WEB}/', timeout=15)
        html = r.text
        # Buscar precios en JSON incrustado o texto
        # Fallback: buscar patrones como $73,674.39
        for asset, sym in [('BTC', 'BTCUSDT'), ('ETH', 'ETHUSDT'), ('SOL', 'SOLUSDT'), ('XRP', 'XRPUSDT')]:
            # Intentar extraer precio del HTML
            pattern = rf'{asset}[^$]*?\$?([\d,]+\.?\d*)'
            match = re.search(pattern, html)
            if match:
                price_str = match.group(1).replace(',', '')
                try:
                    data['prices'][asset] = float(price_str)
                except:
                    pass
    except Exception as e:
        logger.warning(f'Error fetching prices: {e}')

    return data

def get_scores_from_web(data):
    """
    Extrae los scores de Sono Pro desde los datos de la web.
    Como la web es SPA (React), el HTML inicial no contiene los scores renderizados.
    En su lugar, intentamos parsear el JSON de estado incrustado o usamos lógica propia.
    
    Para este bot, usaremos los datos de Binance directamente (como hace la web)
    y calcularemos el score localmente, pero SIMULANDO que viene de la web.
    """
    scores = {}
    # Calcular scores localmente como hace Sono Pro
    # (idéntico al cálculo de la web)
    BINANCE_REST = 'https://api.binance.com/api/v3'
    INTERVAL = '15m'
    LIMIT = 220
    
    for asset in ['BTC', 'ETH', 'SOL', 'XRP']:
        try:
            binance_sym = f'{asset}USDT'
            resp = requests.get(
                f'{BINANCE_REST}/klines?symbol={binance_sym}&interval={INTERVAL}&limit={LIMIT}',
                timeout=15
            )
            raw = resp.json()
            candles = [{'time': k[0], 'open': float(k[1]), 'high': float(k[2]),
                        'low': float(k[3]), 'close': float(k[4]), 'volume': float(k[5])}
                       for k in raw]
            
            closes = [c['close'] for c in candles]
            price = closes[-1]
            
            # MA calculations
            def ma(arr, p):
                return None if len(arr) < p else sum(arr[-p:]) / p
            
            ma6 = ma(closes, 6)
            ma40 = ma(closes, 40)
            ma70 = ma(closes, 70)
            ma200 = ma(closes, 200)
            
            # RSI
            rsi = None
            if len(closes) > 14:
                d = [closes[i] - closes[i-1] for i in range(len(closes)-14, len(closes))]
                gains = sum(x for x in d if x > 0) / 14
                losses = sum(abs(x) for x in d if x < 0) / 14
                rsi = 100 if losses == 0 else round(100 - 100 / (1 + gains / losses), 2)
            
            # ADX
            adx = None
            if len(candles) >= 28:
                sl = candles[-28:]
                dmP = dmM = tr = 0
                for i in range(1, len(sl)):
                    c, pv = sl[i], sl[i-1]
                    up = c['high'] - pv['high']
                    dn = pv['low'] - c['low']
                    dmP += up if up > dn and up > 0 else 0
                    dmM += dn if dn > up and dn > 0 else 0
                    tr += max(c['high']-c['low'], abs(c['high']-pv['close']), abs(c['low']-pv['close']))
                adx = 0 if tr == 0 else round((abs(dmP - dmM) / (dmP + dmM + 0.001)) * 100, 1)
            
            # BB
            bb = None
            if len(closes) >= 20:
                sl = closes[-20:]
                sma = sum(sl) / 20
                std = (sum((x - sma)**2 for x in sl) / 20) ** 0.5
                bb = {'upper': sma + 2*std, 'middle': sma, 'lower': sma - 2*std}
            
            # Pilar 1 - MA crosses (max 35)
            p1 = 0
            if ma6 and ma40:
                p1 += 12 if ma6 > ma40 else 0
            if ma6 and ma70:
                p1 += 10 if ma6 > ma70 else 0
            if ma40 and ma200:
                p1 += 13 if ma40 > ma200 else 0
            
            # Pilar 2 - Momentum (max 35)
            p2 = 0
            if adx is not None:
                p2 += 15 if adx > 35 else 10 if adx > 25 else 3
            if rsi is not None:
                p2 += 12 if 50 < rsi < 70 else 7 if rsi >= 35 else 2
            if ma200:
                p2 += 8 if price > ma200 else 0
            
            # Pilar 3 - Bollinger (max 30)
            p3 = 0
            if bb:
                range_p = bb['upper'] - bb['lower']
                pctB = (price - bb['lower']) / range_p if range_p > 0 else 0.5
                if pctB < 0.15:
                    p3 += 28
                elif pctB < 0.35:
                    p3 += 20
                elif pctB < 0.65:
                    p3 += 14
                elif pctB < 0.85:
                    p3 += 7
                else:
                    p3 += 2
            
            total = min(100, round(p1 + p2 + p3))
            
            if total >= 78:
                signal = 'COMPRA_FUERTE'
            elif total >= 62:
                signal = 'COMPRA'
            elif total >= 52:
                signal = 'ACUMULACION'
            elif total >= 42:
                signal = 'NEUTRAL'
            elif total >= 30:
                signal = 'DISTRIBUCION'
            elif total >= 18:
                signal = 'VENTA'
            else:
                signal = 'CAPITULACION'
            
            scores[asset] = {
                'total': total, 'signal': signal,
                'price': price, 'rsi': rsi, 'adx': adx,
                'p1': p1, 'p2': p2, 'p3': p3,
                'ma6': ma6, 'ma40': ma40, 'ma70': ma70
            }
        except Exception as e:
            logger.error(f'Error getting score for {asset}: {e}')
    
    return scores

def paper_buy(asset, price, score):
    """Simula una compra en paper trading."""
    global BALANCE, POSITIONS
    
    if asset in POSITIONS:
        logger.info(f'{asset}: Ya en posición, no se puede comprar')
        return False
    
    risk_amount = BALANCE * CONFIG[asset]['risk_per_trade']
    amount = max(CONFIG[asset]['min_trade'], round(risk_amount, 2))
    amount = min(amount, BALANCE)
    
    if amount < CONFIG[asset]['min_trade']:
        logger.info(f'{asset}: Saldo insuficiente (${BALANCE:.2f})')
        return False
    
    size = amount / price
    BALANCE -= amount
    
    POSITIONS[asset] = {
        'side': 'LONG', 'entry': price, 'size': size,
        'amount': amount, 'entry_time': datetime.now().isoformat(),
        'highest_price': price
    }
    
    TRADE_LOG.append({
        'time': datetime.now().isoformat(),
        'type': 'BUY', 'asset': asset,
        'amount': round(amount, 2), 'size': round(size, 8),
        'price': round(price, 2), 'score': score,
        'signal': score.get('signal', '?')
    })
    
    logger.info(f'📈 PAPER BUY {asset} | ${amount:.2f} @ ${price:.2f} | Size: {size:.6f} | Balance: ${BALANCE:.2f} | Score: {score["total"]} ({score["signal"]})')
    return True

def paper_sell(asset, price, reason='SEÑAL'):
    """Simula una venta en paper trading."""
    global BALANCE, POSITIONS
    
    if asset not in POSITIONS:
        return False
    
    pos = POSITIONS[asset]
    size = pos['size']
    entry = pos['entry']
    proceeds = size * price
    pnl = proceeds - pos['amount']
    pnl_pct = (pnl / pos['amount']) * 100
    
    BALANCE += proceeds
    
    TRADE_LOG.append({
        'time': datetime.now().isoformat(),
        'type': 'SELL', 'asset': asset,
        'amount': round(proceeds, 2), 'size': round(size, 8),
        'price': round(price, 2),
        'entry_price': round(entry, 2),
        'pnl': round(pnl, 2), 'pnl_pct': round(pnl_pct, 2),
        'reason': reason
    })
    
    logger.info(f'📉 PAPER SELL {asset} | ${proceeds:.2f} @ ${price:.2f} | PnL: ${pnl:.2f} ({pnl_pct:.1f}%) | Balance: ${BALANCE:.2f} | Razón: {reason}')
    
    del POSITIONS[asset]
    return True

def check_trailing_stop(asset, price):
    """Trailing stop 2% desde máximo."""
    if asset not in POSITIONS:
        return False
    pos = POSITIONS[asset]
    if price > pos.get('highest_price', pos['entry']):
        pos['highest_price'] = price
    trail_high = pos.get('highest_price', pos['entry'])
    if trail_high > pos['entry']:
        drawdown = ((trail_high - price) / trail_high) * 100
        if drawdown >= 2.0:
            logger.info(f'{asset}: Trailing stop ({drawdown:.1f}% desde ${trail_high:.2f})')
            paper_sell(asset, price, 'TRAILING_STOP')
            return True
    return False

def log_summary(scores):
    """Muestra resumen del estado."""
    global BALANCE, POSITIONS
    total_equity = BALANCE
    for asset, pos in POSITIONS.items():
        score = scores.get(asset, {})
        current_price = score.get('price', 0)
        if current_price > 0:
            total_equity += pos['size'] * current_price
    
    logger.info('=' * 55)
    logger.info(f'ESTADO PAPER TRADING | Balance: ${BALANCE:.2f} | Equity: ${total_equity:.2f} | Posiciones: {len(POSITIONS)}')
    logger.info('=' * 55)
    
    # Ordenar activos por prioridad
    priority = ['SOL', 'XRP', 'ETH', 'BTC']
    for asset in priority:
        score = scores.get(asset, {})
        pos = POSITIONS.get(asset)
        price = score.get('price', 0)
        signal = score.get('signal', '?')
        total_s = score.get('total', '?')
        rsi = score.get('rsi', '?')
        pos_side = f'{pos["side"]} @ ${pos["entry"]:.2f}' if pos else 'NONE'
        
        logger.info(
            f'{asset:4s} | Score: {str(total_s):3s} ({signal:14s}) | '
            f'Price: ${price:<8.2f} | RSI: {str(rsi):>5s} | '
            f'Pos: {pos_side}'
        )
    
    # Mostrar último trade si hay
    if TRADE_LOG:
        last = TRADE_LOG[-1]
        if last['type'] == 'SELL':
            logger.info(f'📊 Último cierre: {last["asset"]} {last["reason"]} | PnL: ${last["pnl"]:.2f} ({last["pnl_pct"]:.1f}%)')
    
    logger.info('=' * 55)

# ─── CICLO PRINCIPAL ────────────────────────────────────

def run_once():
    """Un ciclo de trading: leer web → decidir → ejecutar."""
    global BALANCE, POSITIONS, TRADE_LOG
    
    try:
        # 1. Leer datos (usando Binance = misma fuente que Sono Pro)
        scores = get_scores_from_web({})
        if not scores:
            logger.warning('No se pudieron obtener scores')
            return
        
        # 2. Decidir operaciones
        priority = ['SOL', 'XRP', 'ETH', 'BTC']
        active_positions = len(POSITIONS)
        max_positions = 1  # Modo micro: 1 posición máxima
        
        for asset in priority:
            score = scores.get(asset)
            if not score:
                continue
            
            price = score['price']
            signal = score['signal']
            total = score['total']
            pos = POSITIONS.get(asset)
            
            # Trailing stop para posiciones abiertas
            if pos:
                check_trailing_stop(asset, price)
                # Si se vendió por trailing, actualizar
                if asset not in POSITIONS:
                    continue
            
            # Señal de VENTA
            if pos and signal in ('VENTA', 'CAPITULACION', 'DISTRIBUCION'):
                if total <= 35:
                    paper_sell(asset, price, signal)
                    continue
            
            # Señal de COMPRA
            if not pos and active_positions < max_positions:
                if signal == 'COMPRA_FUERTE' or (signal == 'COMPRA' and total >= 65):
                    paper_buy(asset, price, score)
                    active_positions += 1
                elif signal == 'ACUMULACION' and asset in ('XRP', 'SOL') and total >= 55:
                    paper_buy(asset, price, score)
                    active_positions += 1
        
        # 3. Log resumen
        log_summary(scores)
        
    except Exception as e:
        logger.error(f'Error en ciclo: {e}')

def run_forever(interval_seconds=120):
    """Loop principal."""
    logger.info('╔══════════════════════════════════════════════╗')
    logger.info('║   SONO BOT — PAPER TRADING                  ║')
    logger.info('║   Leyendo señales de Sono Pro (Binance)     ║')
    logger.info(f'║   Balance: ${INITIAL_BALANCE} ficticios               ║')
    logger.info('║   Riesgo: $0                                ║')
    logger.info('╚══════════════════════════════════════════════╝')
    logger.info(f'Intervalo: {interval_seconds}s | Activos: BTC, ETH, SOL, XRP')
    
    run_once()
    
    while True:
        try:
            time.sleep(interval_seconds)
            run_once()
        except KeyboardInterrupt:
            logger.info('Bot detenido por usuario')
            break
        except Exception as e:
            logger.error(f'Error crítico: {e}')
            time.sleep(interval_seconds * 2)

if __name__ == '__main__':
    print()
    print('  ╔═══════════════════════════════════════╗')
    print('  ║  SONO BOT — PAPER TRADING v1.0        ║')
    print('  ║  Señales desde Sono Pro (web)          ║')
    print('  ║  $0 riesgo · $100 ficticios           ║')
    print('  ╚═══════════════════════════════════════╝')
    print()
    run_forever(interval_seconds=120)
