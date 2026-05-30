"""
db_utils.py — Almacenamiento de snapshots (JSON file).
"""
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'indicador_data.json')


def save_snapshot(data):
    """Guarda snapshot en JSON."""
    try:
        existing = []
        if os.path.exists(DB_PATH):
            with open(DB_PATH) as f:
                existing = json.load(f)
        existing.append({
            'timestamp': datetime.now().isoformat(),
            'data': data
        })
        if len(existing) > 1000:
            existing = existing[-1000:]
        with open(DB_PATH, 'w') as f:
            json.dump(existing, f, indent=2)
    except Exception as e:
        print(f'[db_utils] Error save_snapshot: {e}')


def get_latest_snapshot():
    """Obtiene ultimo snapshot."""
    try:
        if os.path.exists(DB_PATH):
            with open(DB_PATH) as f:
                data = json.load(f)
            if data:
                return data[-1].get('data')
    except Exception as e:
        print(f'[db_utils] Error get_latest_snapshot: {e}')
    return None


def get_historical_snapshots(limit=100):
    """Obtiene historial de snapshots."""
    try:
        if os.path.exists(DB_PATH):
            with open(DB_PATH) as f:
                data = json.load(f)
            return [d.get('data') for d in data[-limit:]]
    except Exception as e:
        print(f'[db_utils] Error get_historical_snapshots: {e}')
    return []
