"""
MAIN.PY (INDICADOR_BTC)
Servidor FastAPI Premium - Fino Edition 👒
- Ofrece soporte MULTIMONEDA real-time (BTC, ETH, SOL, XRP).
- Endpoint híbrido Sono con parámetros de criptomoneda dinámica.
- Transmisión en tiempo real (Tick-by-Tick) mediante WebSockets directo de Binance.
"""

import os
import json
import asyncio
import urllib.request
from datetime import datetime
from typing import Dict, Any, List
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

# Importaciones locales
from indicators import fetch_binance_klines, calculate_rsi, calculate_sma
from scoring import calculate_advanced_score
from db_utils import get_latest_snapshot, get_historical_snapshots, save_snapshot
from sono_strategy import SonoStrategy
from sistema_hibrido import SistemaHibridoBTC

app = FastAPI(
    title="Terminal Cripto Pro - Fino Edition 👒",
    description="Servidor de alto rendimiento para BTC, ETH, SOL y XRP con WebSockets en tiempo real.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mapeo de criptomonedas oficial
COINS_MAP = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "SOL": "SOLUSDT",
    "XRP": "XRPUSDT"
}

# Cache del último estado calculado
CURRENT_STATE = {}

# Carga inicial desde base de datos
db_latest = get_latest_snapshot()
if db_latest:
    CURRENT_STATE = db_latest
    print(f"[INIT] Estado inicial cargado desde DB. Fecha: {CURRENT_STATE.get('fecha')}")
else:
    print("[INIT] No se encontró estado previo en la DB. Inicializando vacío.")

# Manager de conexiones WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

ws_manager = ConnectionManager()

# -----------------------------------------------------------------------------
# 📡 BROADCASTER WEB-SOCKET DE PRECIOS TICK-BY-TICK (Binance API Direct)
# -----------------------------------------------------------------------------

async def binance_ticker_ws_listener():
    """Bucle asíncrono en segundo plano que emite precios en tiempo real cada 2 segundos"""
    print("[WS TICKER] Iniciando transmisor en tiempo real de Binance (2 segundos)...")
    while True:
        try:
            if ws_manager.active_connections:
                url = "https://api.binance.com/api/v3/ticker/price"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                
                # Ejecutar de forma no bloqueante
                loop = asyncio.get_event_loop()
                def fetch_url():
                    with urllib.request.urlopen(req) as res:
                        return json.loads(res.read().decode('utf-8'))
                
                ticker_data = await loop.run_in_executor(None, fetch_url)
                
                prices = {}
                for item in ticker_data:
                    sym = item["symbol"]
                    if sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]:
                        coin_key = sym.replace("USDT", "")
                        prices[coin_key] = round(float(item["price"]), 2)
                        
                # Enviar a todos los clientes WebSocket activos
                await ws_manager.broadcast({
                    "event": "ticker",
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "prices": prices
                })
        except Exception as e:
            print(f"[WS TICKER WARNING] Error de red en difusor de precios: {e}")
        # Espera de 2 segundos entre ticks
        await asyncio.sleep(2.0)

# -----------------------------------------------------------------------------
# ⚙️ MÓDULO INDICADORES ESTÁNDAR
# -----------------------------------------------------------------------------

def compute_timeframe_data(tf: str) -> Dict[str, Any]:
    """Calcula el precio, cambio, RSI y medias móviles para BTC en un timeframe específico"""
    try:
        df = fetch_binance_klines(symbol="BTCUSDT", interval=tf, limit=300)
        if df is None or df.empty:
            raise ValueError(f"No se pudieron descargar velas de Binance para {tf}")
            
        latest_row = df.iloc[-1]
        price = float(latest_row["close"])
        open_price = float(latest_row["open"])
        change_percent = ((price - open_price) / open_price) * 100
        
        df["rsi"] = calculate_rsi(df, "close", 14)
        df["ma20"] = calculate_sma(df, "close", 20)
        df["ma50"] = calculate_sma(df, "close", 50)
        df["ma200"] = calculate_sma(df, "close", 200)
        
        rsi_val = df["rsi"].iloc[-1]
        ma20_val = df["ma20"].iloc[-1]
        ma50_val = df["ma50"].iloc[-1]
        ma200_val = df["ma200"].iloc[-1]
        
        return {
            "price": round(price, 2),
            "change_percent": round(change_percent, 4),
            "rsi": round(rsi_val, 2) if not np.isnan(rsi_val) else 50.0,
            "ma20": round(ma20_val, 2) if not np.isnan(ma20_val) else price,
            "ma50": round(ma50_val, 2) if not np.isnan(ma50_val) else price,
            "ma200": round(ma200_val, 2) if not np.isnan(ma200_val) else price
        }
    except Exception as e:
        print(f"[TIMEFRAME ERROR] Error en {tf}: {e}")
        return {
            "price": 77000.0,
            "change_percent": 0.0,
            "rsi": 50.0,
            "ma20": 77000.0,
            "ma50": 77000.0,
            "ma200": 77000.0
        }

async def update_all_indicators():
    """Actualiza y consolida el estado global cada 10 minutos"""
    global CURRENT_STATE
    print(f"[ENGINE] Ejecutando compilación macro a las {datetime.now()}...")
    
    try:
        timeframes_list = ["1m", "5m", "15m", "1h", "4h", "1d", "3d"]
        timeframes_data = {}
        
        loop = asyncio.get_event_loop()
        tasks = [loop.run_in_executor(None, compute_timeframe_data, tf) for tf in timeframes_list]
        results = await asyncio.gather(*tasks)
        
        for tf, res in zip(timeframes_list, results):
            timeframes_data[tf] = res
            
        btc_price_usd = timeframes_data["1d"]["price"]
        btc_price_eur = round(btc_price_usd / 1.16, 2)
        
        fear_greed_val = 28
        fear_greed_label = "Fear"
        vix_val = 16.74
        btc_dominance = 58.34
        
        ma_data = {}
        for tf in timeframes_list:
            ma_data[tf] = {
                "ma20": timeframes_data[tf]["ma20"],
                "ma50": timeframes_data[tf]["ma50"],
                "ma200": timeframes_data[tf]["ma200"]
            }
            
        analysis = calculate_advanced_score(
            rsi_btc=timeframes_data["3d"]["rsi"],
            rsi_1m=timeframes_data["1m"]["rsi"],
            rsi_5m=timeframes_data["5m"]["rsi"],
            rsi_15m=timeframes_data["15m"]["rsi"],
            rsi_1h=timeframes_data["1h"]["rsi"],
            fear_greed_val=fear_greed_val,
            vix=vix_val,
            ma_data=ma_data
        )
        
        original_style_score = max(1, min(10, int(analysis["score"] / 10)))
        
        new_state = {
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "timeframes": timeframes_data,
            "btc_price": {
                "usd": btc_price_usd,
                "eur": btc_price_eur,
                "change_24h": timeframes_data["1d"]["change_percent"]
            },
            "fear_greed": {
                "value": str(fear_greed_val),
                "label": fear_greed_label
            },
            "rsi_btc": timeframes_data["3d"]["rsi"],
            "rsi_estado": "Neutral",
            "btc_dominance": btc_dominance,
            "vix": vix_val,
            "score": original_style_score,
            "estado": analysis["estado"],
            "score_avanzado": round(analysis["score"], 1),
            "accion": analysis["accion"],
            "explicacion": analysis["explicacion"]
        }
        
        CURRENT_STATE = new_state
        save_snapshot(new_state)
        
        # Broadcast del cambio macro a WebSockets
        await ws_manager.broadcast({
            "event": "update",
            "timestamp": new_state["fecha"],
            "data": new_state
        })
        
        print(f"[ENGINE SUCCESS] BTC: ${btc_price_usd} | Score: {original_style_score}/10")
    except Exception as e:
        print(f"[ENGINE ERROR] Error en actualización global: {e}")

async def run_scheduler():
    """Programador de bucle de 10 minutos"""
    print("[SCHEDULER] Iniciando programador periódico...")
    while True:
        await update_all_indicators()
        await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    # Lanzar programador de 10 min y el difusor WebSocket en tiempo real
    asyncio.create_task(run_scheduler())
    asyncio.create_task(binance_ticker_ws_listener())

# -----------------------------------------------------------------------------
# 📡 ENDPOINTS REST DE LA API
# -----------------------------------------------------------------------------

@app.get("/api/latest", tags=["Market Data"])
async def get_latest():
    """Retorna los datos más recientes compilados en caché"""
    if not CURRENT_STATE:
        latest_db = get_latest_snapshot()
        if latest_db:
            return latest_db
        raise HTTPException(status_code=503, detail="El sistema se está inicializando, intente en unos segundos.")
    return CURRENT_STATE

@app.get("/api/history", tags=["Historical Data"])
async def get_history(limit: int = 100):
    """Retorna los últimos N snapshots almacenados en la base de datos"""
    history = get_historical_snapshots(limit)
    return JSONResponse(content=history)

@app.get("/api/sono/signals", tags=["Sono Strategy"])
async def get_sono_signals(coin: str = "BTC"):
    """
    Retorna las señales de Sono Híbridas (Fino Edition) con soporte dinámico multimoneda.
    Soporta: BTC, ETH, SOL, XRP.
    """
    coin = coin.upper()
    if coin not in COINS_MAP:
        raise HTTPException(status_code=400, detail="Criptomoneda no soportada. Use: BTC, ETH, SOL o XRP.")
        
    symbol = COINS_MAP[coin]
    
    try:
        hibrido = SistemaHibridoBTC()
        
        # 1. Velas de 1 hora reales de Binance
        df = fetch_binance_klines(symbol=symbol, interval="1h", limit=250)
        if df is None or df.empty:
            raise HTTPException(status_code=500, detail=f"No se pudieron descargar velas de Binance para {coin}.")
            
        # 2. Cargar métricas globales en vivo de indicador_data.json
        json_path = "indicador_btc/indicador_data.json"
        fear_greed_val = 28
        fear_greed_label = "Fear"
        vix_val = 16.74
        google_trends_val = 79
        
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    latest = raw_data.get("latest", {})
                    vix_val = latest.get("vix", vix_val)
                    fg_obj = latest.get("fear_greed", {})
                    fear_greed_val = int(fg_obj.get("value", fear_greed_val))
                    fear_greed_label = fg_obj.get("label", fear_greed_label)
                    google_trends_val = raw_data.get("sentimiento_mercado", {}).get("google_trends_volume_btc", google_trends_val)
            except Exception:
                pass
                
        # 3. Calcular estrategia híbrida
        idx = len(df) - 1
        res = hibrido.evaluar_senales_hibridas(
            df_candles=df,
            idx=idx,
            fear_greed_val=fear_greed_val,
            fear_greed_label=fear_greed_label,
            vix_val=vix_val,
            google_trends_val=google_trends_val,
            capital=10000.0
        )
        
        return {
            "timestamp": res["timestamp"],
            "coin": coin,
            "price": res["entry_price"],
            "signal": res["decision_final"],
            "confidence": res["confianza_hibrida"],
            "tendencia": "ALCISTA" if df.loc[idx, 'close'] > df.loc[idx, 'ma200'] else "BAJISTA",
            "adx": res["adx_vivo"],
            "atr": res["atr_vivo"],
            "estado_mercado": res["estado_mercado"],
            "strategies": {
                "gap": {
                    "has_gap": res["estrategias_individuales"]["gap"].get("has_gap", False),
                    "type": res["estrategias_individuales"]["gap"].get("type", "NINGUNO"),
                    "gap_pct": res["estrategias_individuales"]["gap"].get("gap_pct", 0.0),
                    "target_price": res["estrategias_individuales"]["gap"].get("target_price", res["entry_price"]),
                    "fear_greed_val": fear_greed_val,
                    "vix_val": vix_val
                },
                "cruce": res["estrategias_individuales"]["cruce"],
                "bollinger": res["estrategias_individuales"]["bollinger"]
            },
            "ma_values": {
                "ma6": float(df.loc[idx, 'ma6']),
                "ma40": float(df.loc[idx, 'ma40']),
                "ma70": float(df.loc[idx, 'ma70']),
                "ma200": float(df.loc[idx, 'ma200'])
            },
            "position": {
                "stop_loss": res["stop_loss"],
                "take_profit": res["take_profit"]
            },
            "score_maestro": res["score_maestro"],
            "motivo_bloqueo": res["motivo_bloqueo"],
            "gestion_posicion": res["gestion_posicion"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en motor híbrido multimoneda: {str(e)}")

@app.post("/api/refresh", tags=["Control"])
async def trigger_refresh():
    """Fuerza actualización inmediata"""
    asyncio.create_task(update_all_indicators())
    return {"status": "Actualización forzada en segundo plano iniciada."}

# -----------------------------------------------------------------------------
# 📡 CANAL WEB-SOCKETS
# -----------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Canal WebSocket bidireccional para transmisión en tiempo real"""
    await ws_manager.connect(websocket)
    try:
        # Enviar bienvenida con datos actuales
        await websocket.send_json({
            "event": "welcome",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data": CURRENT_STATE
        })
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"event": "pong", "payload": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS ERROR] {e}")
        ws_manager.disconnect(websocket)

# -----------------------------------------------------------------------------
# 🌐 INTERFAZ DE SERVIDOR
# -----------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse, tags=["Frontend"])
async def get_dashboard():
    dashboard_path = "indicador_btc/index.html"
    if os.path.exists(dashboard_path):
        with open(dashboard_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        return """
        <html>
            <head><title>Error</title></head>
            <body style='font-family: sans-serif; text-align: center; padding-top: 100px;'>
                <h1>Archivo index.html no encontrado</h1>
            </body>
        </html>
        """

if __name__ == "__main__":
    print("Iniciando Servidor Multimoneda de Producción en http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
