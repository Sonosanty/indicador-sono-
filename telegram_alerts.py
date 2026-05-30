"""
telegram_alerts.py — Alertas a Telegram para Sono Bot.

Dependencias: requests
Token y chat_id desde variables de entorno (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
Carga desde .env via python-dotenv si esta disponible.

Para desactivar: TELEGRAM_DISABLED=1 en .env o variable de entorno
"""
import sys, os, logging, json
from datetime import datetime

# Cargar .env si existe
try:
    from dotenv import load_dotenv
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
except ImportError:
    pass

# Configuracion
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
DISABLED = os.getenv('TELEGRAM_DISABLED', '0') == '1'

# Si no hay token, desactivado
if not BOT_TOKEN:
    DISABLED = True

logger = logging.getLogger(__name__)

import requests

TELEGRAM_API = f'https://api.telegram.org/bot{BOT_TOKEN}'


def send_alert(message, chat_id=None):
    """Envia mensaje a Telegram."""
    if DISABLED:
        return False
    cid = chat_id or CHAT_ID
    if not cid:
        return False
    try:
        r = requests.post(f'{TELEGRAM_API}/sendMessage', json={
            'chat_id': cid,
            'text': message,
            'parse_mode': 'Markdown'
        }, timeout=10)
        if r.status_code != 200:
            logger.error(f'Telegram error {r.status_code}: {r.text}')
            return False
        return True
    except Exception as e:
        logger.error(f'Telegram send failed: {e}')
        return False


def format_score_alert(balances, score, price, asset, action=''):
    """Formatea alerta de score."""
    if DISABLED:
        return ''
    emoji = '🟢' if score >= 70 else '🟡' if score >= 50 else '🔴'
    return f'{emoji} *{asset}* Score: {score}/100 | ${price:,.2f} | {action}'


def format_trade_alert(action, asset, price, size, reason=''):
    """Formatea alerta de trade."""
    if DISABLED:
        return ''
    side = '🟢 BUY' if action == 'BUY' else '🔴 SELL'
    return f'{side} *{asset}* ${price:,.2f} | Size: {size:.6f} | {reason}'


def format_score_cross_alert(asset, old_score, new_score, price):
    """Formatea alerta de cruce de score."""
    if DISABLED:
        return ''
    direction = '⬆️' if new_score > old_score else '⬇️'
    return f'{direction} *{asset}* Score {old_score}→{new_score} @ ${price:,.2f}'
