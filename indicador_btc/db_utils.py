import sqlite3
import json
from datetime import datetime

DB_PATH = "indicador_btc/data/db/indicador_btc.sqlite"

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_latest_snapshot():
    """Obtiene el ultimo snapshot de la tabla macro_snapshots"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT raw_json FROM macro_snapshots ORDER BY id DESC LIMIT 1;")
        row = cursor.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception as e:
        print(f"[DB ERROR] Error al obtener el ultimo snapshot: {e}")
    return None

def get_historical_snapshots(limit=100):
    """Obtiene los ultimos N snapshots para visualizacion de historicos"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, fecha, btc_usd, btc_eur, btc_change_24h, fear_greed_value, fear_greed_label, vix, btc_dominance, rsi_3d, macro_score, macro_state FROM macro_snapshots ORDER BY id DESC LIMIT ?;", (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        snapshots = []
        for r in rows:
            snapshots.append({
                "id": r[0],
                "fecha": r[1],
                "btc_usd": r[2],
                "btc_eur": r[3],
                "btc_change_24h": r[4],
                "fear_greed_value": r[5],
                "fear_greed_label": r[6],
                "vix": r[7],
                "btc_dominance": r[8],
                "rsi_3d": r[9],
                "macro_score": r[10],
                "macro_state": r[11]
            })
        return snapshots
    except Exception as e:
        print(f"[DB ERROR] Error al obtener historicos: {e}")
        return []

def save_snapshot(data):
    """Guarda un nuevo snapshot en la tabla macro_snapshots"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Extraer campos clave
        fecha = data.get("fecha", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        btc_usd = data.get("btc_price", {}).get("usd", 0.0)
        btc_eur = data.get("btc_price", {}).get("eur", 0.0)
        btc_change_24h = data.get("btc_price", {}).get("change_24h", 0.0)
        
        fg_val = float(data.get("fear_greed", {}).get("value", 50))
        fg_label = data.get("fear_greed", {}).get("label", "Neutral")
        
        vix = data.get("vix", 18.0)
        btc_dominance = data.get("btc_dominance", 58.0)
        rsi_3d = data.get("rsi_btc", 50.0)
        
        macro_score = float(data.get("score", 5))
        macro_state = data.get("estado", "NEUTRAL")
        
        raw_json = json.dumps(data)
        
        cursor.execute("""
            INSERT INTO macro_snapshots (
                fecha, btc_usd, btc_eur, btc_change_24h, fear_greed_value, fear_greed_label, vix, btc_dominance, rsi_3d, macro_score, macro_state, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (fecha, btc_usd, btc_eur, btc_change_24h, fg_val, fg_label, vix, btc_dominance, rsi_3d, macro_score, macro_state, raw_json))
        
        conn.commit()
        conn.close()
        print(f"[DB SUCCESS] Nuevo snapshot guardado en DB para la fecha: {fecha}")
        return True
    except Exception as e:
        print(f"[DB ERROR] Error al guardar snapshot: {e}")
        return False
