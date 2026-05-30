"""
telegram_alerts.py — Módulo de alertas Telegram para Sono Pro Ecosystem
Integración directa con la Telegram Bot API vía HTTP.
No requiere dependencias adicionales (solo requests).

Uso:
    from telegram_alerts import send_alert, format_score_alert, format_trade_alert
    send_alert("Hola mundo")
    alert = format_score_alert("BTC", score_dict)
"""

import json
import logging
import os
import time
import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ── Config — lee de .env (fallback a telegram_config.json) ─────
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'telegram_config.json')

def _load_config():
    """Carga credenciales desde .env primero, fallback telegram_config.json."""
    load_dotenv(r'C:\Users\sparreno\.openclaw\workspace\.env')
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    if token and chat_id:
        return token, chat_id
    # Fallback a JSON legacy
    try:
        with open(_CONFIG_PATH) as f:
            cfg = json.load(f)
        return cfg.get('telegram_bot_token'), str(cfg.get('telegram_chat_id', ''))
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f'Error cargando telegram_config.json: {e}')
        return None, None

BOT_TOKEN, CHAT_ID = _load_config()
API_BASE = f'https://api.telegram.org/bot{BOT_TOKEN}' if BOT_TOKEN else None

# ── Emojis por categoría ────────────────────────────────────────
SCORE_EMOJIS = {
    'COMPRA FUERTE': '🟢',
    'COMPRA':        '🟢',
    'ACUMULACIÓN':   '🔵',
    'NEUTRAL':       '⚪',
    'DISTRIBUCIÓN':  '🟡',
    'VENTA':         '🔴',
    'CAPITULACIÓN':  '⛔',
}

SIGNAL_ICONS = {
    'COMPRA FUERTE': '🚀',
    'COMPRA':        '📈',
    'ACUMULACIÓN':   '💊',
    'NEUTRAL':       '➖',
    'DISTRIBUCIÓN':  '📉',
    'VENTA':         '🚨',
    'CAPITULACIÓN':  '💀',
}

# ── Rate Limiting ───────────────────────────────────────────────
_last_sent = 0.0
_MIN_INTERVAL = 1.0  # segundos entre mensajes


# ═══════════════════════════════════════════════════════════════
# FUNCIONES PÚBLICAS
# ═══════════════════════════════════════════════════════════════

def send_alert(message, parse_mode='HTML', disable_notification=False):
    """Envía un mensaje al chat de Telegram configurado.

    Args:
        message: Texto del mensaje (máx 4096 chars, se trunca)
        parse_mode: 'HTML' o 'MarkdownV2' o None
        disable_notification: True = sin notificación sonora

    Returns:
        bool: True si se envió correctamente
    """
    global _last_sent

    if not API_BASE or not CHAT_ID:
        logger.warning('Telegram no configurado: falta token o chat_id')
        return False

    # Rate limiting
    elapsed = time.time() - _last_sent
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)

    # Truncar mensajes largos (límite Telegram: 4096 chars)
    if len(message) > 4000:
        message = message[:3997] + '...'

    payload = {
        'chat_id': CHAT_ID,
        'text': message,
        'parse_mode': parse_mode,
        'disable_notification': disable_notification,
    }

    try:
        resp = requests.post(f'{API_BASE}/sendMessage', json=payload, timeout=10)
        _last_sent = time.time()
        if resp.status_code == 429:
            retry_after = resp.json().get('parameters', {}).get('retry_after', 5)
            logger.warning(f'Telegram rate limit: esperando {retry_after}s')
            time.sleep(retry_after)
            resp = requests.post(f'{API_BASE}/sendMessage', json=payload, timeout=10)
        if not resp.ok:
            logger.error(f'Telegram error {resp.status_code}: {resp.text[:200]}')
            return False
        return True
    except requests.exceptions.Timeout:
        logger.warning('Telegram timeout')
        return False
    except Exception as e:
        logger.error(f'Telegram exception: {e}')
        return False


def send_batch(alerts, parse_mode='HTML'):
    """Envía múltiples alertas respetando rate limiting.

    Args:
        alerts: Lista de strings de mensajes
        parse_mode: Formato de parseo
    """
    if not alerts:
        return
    for alert in alerts[:10]:  # Máximo 10 por batch
        send_alert(alert, parse_mode=parse_mode)
        time.sleep(0.5)


# ═══════════════════════════════════════════════════════════════
# FORMATOS DE MENSAJE
# ═══════════════════════════════════════════════════════════════

def format_score_alert(asset, score):
    """Formatea alerta de score con emojis y datos clave.

    Args:
        asset: Símbolo del activo (BTC, ETH, etc.)
        score: Dict con total, signal, price, rsi, adx, etc.

    Returns:
        str: Mensaje HTML formateado
    """
    total = score.get('total', '?')
    signal = score.get('signal', 'NEUTRAL')
    price = score.get('price', 0)
    emoji = SCORE_EMOJIS.get(signal, '⚪')
    icon = SIGNAL_ICONS.get(signal, 'ℹ️')
    rsi = score.get('rsi', '?')
    adx = score.get('adx', '?')
    p1 = score.get('p1', 0)
    p2 = score.get('p2', 0)
    p3 = score.get('p3', 0)

    return (
        f'{emoji} <b>{signal}</b> {icon}\n'
        f'━━━━━━━━━━━━━━━━━━━━━\n'
        f'<b>{asset}</b> · Score: {total}/100\n'
        f'Precio: <code>${price:,.2f}</code>\n'
        f'RSI: {rsi} · ADX: {adx}\n'
        f'P1:{p1} P2:{p2} P3:{p3}\n'
        f'<a href="https://indicador-sono.pages.dev">📊 Abrir Sono Pro</a>'
    )


def format_trade_alert(action, asset, price, size, pnl=None):
    """Formatea alerta de trade (compra/venta).

    Args:
        action: 'BUY' o 'SELL'
        asset: Símbolo del activo
        price: Precio de ejecución
        size: Cantidad
        pnl: Dict con 'pnl' y 'pnl_pct' (opcional, solo SELL)

    Returns:
        str: Mensaje HTML formateado
    """
    if action == 'BUY':
        emoji = '🟢'
        header = '📈 ORDEN DE COMPRA EJECUTADA'
    else:
        emoji = '🔴'
        header = '📉 ORDEN DE VENTA EJECUTADA'

    msg = (
        f'{emoji} <b>{header}</b>\n'
        f'━━━━━━━━━━━━━━━━━━━━━\n'
        f'<b>{asset}</b>\n'
        f'Precio: <code>${price:,.2f}</code>\n'
        f'Cantidad: <code>{size:.6f}</code>\n'
        f'Total: <code>${price * size:,.2f}</code>'
    )

    if pnl:
        emoji_pnl = '🟢' if pnl.get('pnl', 0) >= 0 else '🔴'
        msg += (
            f'\n\n{emoji_pnl} <b>PnL:</b> '
            f'<code>${pnl.get("pnl", 0):+.2f}</code> '
            f'(<code>{pnl.get("pnl_pct", 0):+.2f}%</code>)'
        )

    return msg


def format_daily_summary(scores, balances, trades):
    """Formatea resumen diario del bot.

    Args:
        scores: Dict {asset: score_dict}
        balances: Dict {coin: balance}
        trades: Lista de trades recientes

    Returns:
        str: Mensaje HTML formateado
    """
    lines = [
        '📊 <b>RESUMEN DIARIO SONO BOT</b>',
        f'━━━━━━━━━━━━━━━━━━━━━',
        f'📅 {time.strftime("%d/%m/%Y %H:%M")}',
        '',
        '<b>📈 Scores:</b>',
    ]

    for asset, score in sorted(scores.items()):
        if not score:
            continue
        emoji = SCORE_EMOJIS.get(score.get('signal', ''), '⚪')
        lines.append(
            f'{emoji} {asset}: {score.get("total", "?")}/100 '
            f'({score.get("signal", "?")})'
        )

    lines.extend(['', '<b>💰 Balances:</b>'])
    for coin, bal in sorted(balances.items()):
        if float(bal) > 0:
            if coin in ('BTC', 'ETH', 'SOL', 'XRP'):
                lines.append(f'  {coin}: {float(bal):.6f}')
            else:
                lines.append(f'  {coin}: ${float(bal):.2f}')

    lines.extend(['', '<b>📋 Últimos trades:</b>'])
    for t in trades[-5:]:
        action = '🟢BUY' if t.get('type') == 'BUY' else '🔴SELL'
        asset = t.get('asset', '?')
        price = t.get('price', 0)
        pnl = t.get('pnl')
        if pnl is not None:
            lines.append(f'  {action} {asset} @ ${price:,.2f} | PnL: ${pnl:+.2f}')
        else:
            lines.append(f'  {action} {asset} @ ${price:,.2f}')

    return '\n'.join(lines)


def send_daily_summary(scores, balances, trades):
    """Envía resumen diario al chat de Telegram."""
    summary = format_daily_summary(scores, balances, trades)
    return send_alert(summary)


def format_score_cross_alert(asset, old_score, new_score):
    """Alerta cuando el score cruza de categoría.

    Args:
        asset: Símbolo del activo
        old_score: Dict del score anterior
        new_score: Dict del score actual

    Returns:
        str: Mensaje formateado
    """
    old_signal = old_score.get('signal', 'NEUTRAL')
    new_signal = new_score.get('signal', 'NEUTRAL')
    new_emoji = SCORE_EMOJIS.get(new_signal, '⚪')
    old_emoji = SCORE_EMOJIS.get(old_signal, '⚪')

    # Determinar si es mejora o empeoramiento
    level_map = {
        'CAPITULACIÓN': 0, 'VENTA': 1, 'DISTRIBUCIÓN': 2,
        'NEUTRAL': 3, 'ACUMULACIÓN': 4, 'COMPRA': 5, 'COMPRA FUERTE': 6,
    }
    direction = '📈 MEJORA' if level_map.get(new_signal, 3) > level_map.get(old_signal, 3) else '📉 EMPEORA'

    price = new_score.get('price', 0)
    return (
        f'{new_emoji} <b>CAMBIO DE SEÑAL: {asset}</b>\n'
        f'━━━━━━━━━━━━━━━━━━━━━\n'
        f'{direction}\n'
        f'{old_emoji} {old_signal} → {new_emoji} {new_signal}\n'
        f'Score: {old_score.get("total", "?")} → {new_score.get("total", "?")}/100\n'
        f'Precio: <code>${price:,.2f}</code>\n'
        f'<a href="https://indicador-sono.pages.dev">📊 Abrir Sono Pro</a>'
    )


# ═══════════════════════════════════════════════════════════════
# AUTO-VERIFICACIÓN
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    # Test de formato (sin enviar)
    print('=== Test telegram_alerts.py ===')
    print(f'Token configurado: {"SÍ" if BOT_TOKEN else "NO"}')
    print(f'Chat ID: {CHAT_ID}')
    print()

    # Test format_score_alert
    test_score = {
        'total': 84,
        'signal': 'COMPRA FUERTE',
        'price': 73654.23,
        'rsi': 65.2,
        'adx': 32.1,
        'p1': 35,
        'p2': 30,
        'p3': 19,
    }
    print(format_score_alert('BTC', test_score))
    print()

    # Test format_trade_alert
    print(format_trade_alert('BUY', 'SOL', 145.30, 0.344))
    print()
    print(format_trade_alert('SELL', 'SOL', 148.50, 0.344, {'pnl': 1.10, 'pnl_pct': 2.2}))
    print()

    # Test format_daily_summary
    test_scores = {
        'BTC': {'total': 84, 'signal': 'COMPRA FUERTE'},
        'ETH': {'total': 65, 'signal': 'COMPRA'},
        'SOL': {'total': 42, 'signal': 'DISTRIBUCIÓN'},
    }
    test_balances = {'USDT': 45.50, 'SOL': 0.344}
    test_trades = [
        {'type': 'BUY', 'asset': 'SOL', 'price': 145.30},
        {'type': 'SELL', 'asset': 'SOL', 'price': 148.50, 'pnl': 1.10},
    ]
    print(format_daily_summary(test_scores, test_balances, test_trades))
    print()
    print('✅ telegram_alerts.py — Formato verificado')
