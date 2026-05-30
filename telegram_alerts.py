#!/usr/bin/env python3
"""Telegram alerts system for Sono Bot."""
import os
import logging
import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load env vars
load_dotenv()

DISABLED = os.environ.get('TELEGRAM_DISABLED', '0') == '1'
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

if DISABLED:
    logger.info('Telegram alerts DISABLED (TELEGRAM_DISABLED=1)')


def send_alert(message):
    """Send alert to Telegram."""
    if DISABLED or not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        logger.debug(f'[Telegram disabled] Would send: {message[:80]}...')
        return False
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage'
        r = requests.post(url, json={
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'Markdown'
        }, timeout=10)
        if not r.ok:
            logger.error(f'Telegram error {r.status_code}: {r.text}')
            return False
        return True
    except Exception as e:
        logger.error(f'Telegram send failed: {e}')
        return False


def format_score_alert(asset, score, price=None, action=''):
    """Formatea alerta de score. Llamada desde sono_bot."""
    if DISABLED:
        return ''
    price_str = f' | ${price:,.2f}' if price else ''
    if score >= 70:
        emoji = '🟢'
    elif score >= 50:
        emoji = '🟡'
    else:
        emoji = '🔴'
    return f'{emoji} *{asset}* Score: {score}/100{price_str} | {action}'


def format_trade_alert(action, asset, price, size, reason='', pnl=None):
    """Formatea alerta de trade."""
    if DISABLED:
        return ''
    side = '✅ BUY' if action == 'BUY' else '❌ SELL'
    pnl_str = ''
    if pnl:
        pnl_str = f' | PnL: ${pnl:.2f}' if isinstance(pnl, (int, float)) else ''
    return f'{side} *{asset}* ${price:,.2f} | Size: {size:.6f} | {reason}{pnl_str}'


def format_score_cross_alert(asset, old_score, new_score, price):
    """Formatea alerta de cruce de score."""
    if DISABLED:
        return ''
    direction = '🟢' if new_score > old_score else '🔴'
    return f'{direction} *{asset}* Score {old_score}→{new_score} @ ${price:,.2f}'
