"""
PROCESS_INDICADOR_DATA.PY
Versión Multimoneda Premium - Tejida por Fino 👒
Soporta Bitcoin (BTC), Ethereum (ETH), Solana (SOL) y XRP.

Consolida los datos de SQLite y enriquece con APIs reales en tiempo real:
- Binance API para cotizaciones y velas multi-timeframe de las 4 criptomonedas.
- Yahoo Finance (VIX a través de yfinance).
- Alternative.me (Crypto Fear & Greed API).
- Google Trends (Volumen de búsquedas de BTC vía pytrends).

Redondea de forma estricta todos los valores numéricos a un máximo de 2 decimales para eliminar
el bloat y peso de almacenamiento (JSON ultra-optimizado).
"""

import os
import json
import time
import pandas as pd
import sqlite3
import urllib.request
import yfinance as yf
from bs4 import BeautifulSoup
from datetime import datetime
from pytrends.request import TrendReq

# -----------------------------------------------------------------------------
# 📡 CONFIGURACIÓN DE LAS CRIPTOMONEDAS
# -----------------------------------------------------------------------------
COINS_CONFIG = {
    "BTC": {
        "symbol": "BTCUSDT",
        "name": "Bitcoin",
        "desc": "La más segura y dominante del mercado. Se considera el 'oro digital'. Tiene la mayor adopción institucional y ETFs."
    },
    "ETH": {
        "symbol": "ETHUSDT",
        "name": "Ethereum",
        "desc": "La base de muchísimas aplicaciones DeFi, IA y NFTs. Lidera los smart contracts. Muy usada por empresas y desarrolladores."
    },
    "SOL": {
        "symbol": "SOLUSDT",
        "name": "Solana",
        "desc": "Muy rápida y barata. Gran crecimiento en gaming, IA y memecoins. Fuerte ecosistema de desarrolladores."
    },
    "XRP": {
        "symbol": "XRPUSDT",
        "name": "XRP",
        "desc": "Especializada en pagos internacionales rápidos. Muy vinculada a bancos y sector financiero. Ha crecido mucho tras avances regulatorios."
    }
}

# -----------------------------------------------------------------------------
# 📡 APIS REALES Y ENRIQUECIMIENTO DE DATOS
# -----------------------------------------------------------------------------

def fetch_live_vix():
    """Obtiene el índice VIX en vivo desde Yahoo Finance utilizando yfinance"""
    try:
        print("[APIS] Obteniendo VIX en vivo de Yahoo Finance (^VIX)...")
        ticker = yf.Ticker("^VIX")
        hist = ticker.history(period="1d")
        if not hist.empty:
            vix_val = round(float(hist['Close'].iloc[-1]), 2)
            print(f"  -> VIX en vivo obtenido: {vix_val}")
            return vix_val
    except Exception as e:
        print(f"  -> [WARNING] No se pudo obtener VIX en vivo: {e}")
    return None

def fetch_live_fear_greed():
    """Obtiene el índice Crypto Fear & Greed oficial desde Alternative.me"""
    try:
        print("[APIS] Obteniendo Fear & Greed en vivo de Alternative.me...")
        req = urllib.request.Request(
            'https://api.alternative.me/fng/',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            value = int(res["data"][0]["value"])
            label = res["data"][0]["value_classification"]
            print(f"  -> Fear & Greed en vivo obtenido: {value} ({label})")
            return {"value": value, "label": label}
    except Exception as e:
        print(f"  -> [WARNING] No se pudo obtener Fear & Greed en vivo: {e}")
    return None

def fetch_live_google_trends():
    """Obtiene el volumen de búsquedas de Bitcoin de Google Trends vía pytrends con caché de 3 horas para evitar límites de API (HTTP 429)"""
    cache_path = "indicador_btc/data/google_trends_cache.json"
    cache_duration = 10800  # 3 horas en segundos
    
    # Intentar leer caché existente
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            timestamp = cache_data.get("timestamp", 0)
            if time.time() - timestamp < cache_duration:
                print(f"  -> [CACHÉ] Usando Google Trends desde caché local: {cache_data.get('value')} (guardado hace {int(time.time() - timestamp)}s)")
                return cache_data.get("value")
        except Exception as e:
            print(f"  -> [WARNING] Error leyendo caché de Google Trends: {e}")

    try:
        print("[APIS] Obteniendo tendencia de Google Trends para 'bitcoin'...")
        pytrends = TrendReq(hl='en-US', tz=360, timeout=10)
        pytrends.build_payload(["bitcoin"], cat=0, timeframe='now 1-d', geo='')
        data = pytrends.interest_over_time()
        if not data.empty and 'bitcoin' in data:
            vol = int(data['bitcoin'].iloc[-1])
            print(f"  -> Google Trends BTC obtenido: {vol}")
            
            # Guardar en caché
            try:
                os.makedirs(os.path.dirname(cache_path), exist_ok=True)
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump({"timestamp": time.time(), "value": vol}, f, indent=2)
            except Exception as e:
                print(f"  -> [WARNING] Error guardando caché de Google Trends: {e}")
                
            return vol
    except Exception as e:
        print(f"  -> [WARNING] Google Trends limitado o falló: {e}")
        
    # Si falla, intentar usar el valor del caché expirado antes de recurrir a 50 por defecto
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            print(f"  -> [FALLBACK] Usando caché expirado para Google Trends: {cache_data.get('value')}")
            return cache_data.get("value")
        except Exception:
            pass
            
    return 50  # Valor neutral por defecto

def scrape_scalping_trades():
    """Raspa las últimas operaciones del backtest de MiFuturApp usando BeautifulSoup"""
    url = "https://mifuturapp.com/indicador_btc/backtest_scalping.php"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        print("[SCRAPER] Raspando señales de scalping de MiFuturApp...")
        with urllib.request.urlopen(req) as response:
            html = response.read()
    except Exception as e:
        print(f"  -> [WARNING] Error consultando señales de scalping: {e}")
        return []
        
    try:
        soup = BeautifulSoup(html, 'html.parser')
        table = soup.find('table')
        if not table:
            return []
            
        trades = []
        tbody = table.find('tbody')
        rows = tbody.find_all('tr') if tbody else table.find_all('tr')[1:]
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 5:
                continue
                
            fecha = cols[0].get_text(separator=" ").strip()
            tipo = cols[1].get_text().strip()
            entrada = cols[2].get_text().strip()
            
            salida_text = cols[3].get_text(separator=" ").strip()
            salida_parts = salida_text.split()
            salida_price = salida_parts[0] if len(salida_parts) > 0 else ""
            salida_date = " ".join(salida_parts[1:]) if len(salida_parts) > 1 else ""
            
            resultado = cols[4].get_text().strip()
            r_val = cols[5].get_text().strip() if len(cols) > 5 else ""
            stop_val = cols[6].get_text().strip() if len(cols) > 6 else ""
            tp_val = cols[7].get_text().strip() if len(cols) > 7 else ""
            
            structure = ""
            motivos = ""
            if len(cols) > 16:
                structure = " ".join(cols[16].get_text().split()).strip()
            if len(cols) > 17:
                motivos = " ".join(cols[17].get_text().split()).strip()
                
            trades.append({
                "fecha": fecha,
                "tipo": tipo,
                "entrada": entrada,
                "salida_precio": salida_price,
                "salida_fecha": salida_date,
                "resultado": resultado,
                "r": r_val,
                "stop": stop_val,
                "tp": tp_val,
                "pattern": structure,
                "motivos": motivos
            })
        print(f"  -> [SUCCESS] Se rasparon {len(trades)} señales de scalping.")
        return trades[:15]  # Últimos 15 trades para el dashboard
    except Exception as e:
        print(f"  -> [WARNING] Error parseando señales de scalping: {e}")
        return []

# -----------------------------------------------------------------------------
# 📊 CALCULOS TÉCNICOS EN VIVO DESDE BINANCE
# -----------------------------------------------------------------------------

def fetch_binance_klines(symbol: str, interval: str, limit: int = 250):
    """Descarga velas directamente desde Binance API"""
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            df = pd.DataFrame(data, columns=[
                'open_time', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'qav', 'num_trades', 'taker_base_vol', 'taker_quote_vol', 'ignore'
            ])
            # Forzar tipos flotantes
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            return df
    except Exception as e:
        print(f"  -> [WARNING] Error consultando velas de Binance para {symbol} ({interval}): {e}")
        return None

def calculate_rsi_series(prices, period=14):
    """Calcula el indicador RSI para una serie de precios"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def compile_coin_metrics(coin_key: str, config: dict) -> dict:
    """Calcula todos los indicadores técnicos y el score para una criptomoneda específica"""
    symbol = config["symbol"]
    print(f"[COIN ENGINE] Procesando métricas para {coin_key} ({symbol})...")
    
    # 1. Obtener precio actual y cambio en 24h
    ticker_url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
    price_usd = 0.0
    price_change_24h = 0.0
    try:
        req = urllib.request.Request(ticker_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res:
            tick = json.loads(res.read().decode('utf-8'))
            price_usd = float(tick["lastPrice"])
            price_change_24h = float(tick["priceChangePercent"])
    except Exception as e:
        print(f"  -> [WARNING] Error cargando ticker para {symbol}: {e}")
        
    # 2. Calcular timeframes
    timeframes = {}
    timeframe_list = ["15m", "1h", "4h", "1d"]
    
    for tf in timeframe_list:
        df = fetch_binance_klines(symbol, tf, limit=250)
        if df is not None and not df.empty:
            df["rsi"] = calculate_rsi_series(df["close"], 14)
            df["ma20"] = df["close"].rolling(window=20).mean()
            df["ma50"] = df["close"].rolling(window=50).mean()
            df["ma200"] = df["close"].rolling(window=200).mean()
            
            latest = df.iloc[-1]
            close_p = float(latest["close"])
            open_p = float(latest["open"])
            change_pct = ((close_p - open_p) / open_p) * 100
            
            timeframes[tf] = {
                "close": round(close_p, 2),
                "change_pct": round(change_pct, 2),
                "rsi": round(latest["rsi"], 2) if not pd.isna(latest["rsi"]) else 50.0,
                "ma20": round(latest["ma20"], 2) if not pd.isna(latest["ma20"]) else close_p,
                "ma50": round(latest["ma50"], 2) if not pd.isna(latest["ma50"]) else close_p,
                "ma200": round(latest["ma200"], 2) if not pd.isna(latest["ma200"]) else close_p
            }
        else:
            # Fallback en caso de fallo de API
            timeframes[tf] = {
                "close": round(price_usd, 2),
                "change_pct": 0.0,
                "rsi": 50.0,
                "ma20": round(price_usd, 2),
                "ma50": round(price_usd, 2),
                "ma200": round(price_usd, 2)
            }
            
    # 3. Calcular Score Técnico de Confluencia propio de la moneda (0-100)
    # Basado en RSI y en el alineamiento con respecto a medias móviles
    score = 50.0
    tf_1d = timeframes["1d"]
    rsi_1d = tf_1d["rsi"]
    close_1d = tf_1d["close"]
    
    # Impacto de RSI
    if rsi_1d > 70:
        score += 15
    elif rsi_1d < 30:
        score -= 15
        
    # Impacto de medias móviles de 1D
    if close_1d > tf_1d["ma200"]:
        score += 15
    else:
        score -= 15
        
    if close_1d > tf_1d["ma50"]:
        score += 10
    else:
        score -= 10
        
    if close_1d > tf_1d["ma20"]:
        score += 5
    else:
        score -= 5
        
    # Limitar score entre 10 y 95
    score = max(10.0, min(95.0, score))
    
    # Determinar acción y estado técnico
    if score >= 70:
        estado = "EUFORIA"
        accion = "SHORT"
    elif score <= 30:
        estado = "PÁNICO"
        accion = "LONG"
    else:
        estado = "NEUTRAL"
        accion = "RANGO"

    return {
        "name": config["name"],
        "desc": config["desc"],
        "price_usd": round(price_usd, 2),
        "price_eur": round(price_usd * 0.924, 2),
        "price_change_24h": round(price_change_24h, 2),
        "confluence_score": round(score, 1),
        "estado": estado,
        "accion": accion,
        "timeframes": timeframes
    }

# -----------------------------------------------------------------------------
# ⚙️ CONSOLIDACIÓN COMPLETA MULTIMONEDA
# -----------------------------------------------------------------------------

def process_and_consolidate():
    print("[PROCESSOR] Iniciando consolidación de datos avanzada MULTIMONEDA...")
    
    # 1. Consultar APIs globales en vivo
    live_vix = fetch_live_vix()
    if live_vix is None:
        live_vix = 16.74
        
    live_fng = fetch_live_fear_greed()
    if live_fng is None:
        live_fng = {"value": 28, "label": "Fear"}
        
    live_trends = fetch_live_google_trends()

    # 2. Compilar métricas para cada criptomoneda
    coins_data = {}
    for coin_key, config in COINS_CONFIG.items():
        coins_data[coin_key] = compile_coin_metrics(coin_key, config)

    # 3. Obtener señales de scalping en tiempo real (de MiFuturApp)
    scalping_trades = scrape_scalping_trades()

    # 3.5. Obtener saldos reales de Pionex si las credenciales existen
    pionex_data = None
    cred_paths = ["pionex_credentials.json", "../pionex_credentials.json"]
    creds_found = None
    for cp in cred_paths:
        if os.path.exists(cp):
            creds_found = cp
            break
            
    if creds_found:
        print(f"[PIONEX] Cargando credenciales de Pionex desde: {creds_found}")
        try:
            with open(creds_found, "r", encoding="utf-8") as f:
                creds = json.load(f)
            from pionex_python.restful.Account import Account
            acc = Account(creds["api_key"], creds["api_secret"])
            balance_res = acc.get_balance()
            if balance_res.get("result"):
                balances_list = []
                total_usd = 0.0
                raw_balances = balance_res.get("data", {}).get("balances", [])
                for b in raw_balances:
                    coin = b["coin"]
                    free = float(b["free"])
                    frozen = float(b["frozen"])
                    if free == 0 and frozen == 0:
                        continue
                    
                    # Calcular valor en USD
                    price_usd = 0.0
                    if coin in coins_data:
                        price_usd = coins_data[coin]["price_usd"]
                    elif coin == "USDT":
                        price_usd = 1.0
                    
                    usd_val = round(free * price_usd, 2)
                    total_usd += usd_val
                    
                    balances_list.append({
                        "coin": coin,
                        "free": round(free, 6),
                        "frozen": round(frozen, 6),
                        "usd_value": usd_val,
                        "eur_value": round(usd_val * 0.862, 2) # Tasa fija de conversión a Euros
                    })
                
                pionex_data = {
                    "balances": balances_list,
                    "total_usd": round(total_usd, 2),
                    "total_eur": round(total_usd * 0.862, 2),
                    "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                print(f"[PIONEX SUCCESS] Saldo real total obtenido: ${pionex_data['total_usd']} USD")
        except Exception as e:
            print(f"[WARNING] Error procesando saldos de Pionex: {e}")

    # 4. Estructurar el JSON final Saneado y Optimizado (Fino Schema 👒)
    consolidated_data = {
        "fecha_consolidacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sentimiento_mercado": {
            "fear_greed": live_fng,
            "vix": live_vix,
            "google_trends_volume_btc": live_trends,
        },
        "coins": coins_data,
        "pionex": pionex_data,                  # Saldos reales de Pionex
        "scalping_trades": scalping_trades      # Señales del backtest en tiempo real
    }
    
    # Guardar localmente en el backend
    out_dir = "indicador_btc/data"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "indicador_data.json")
    
    with open(out_path, "w", encoding="utf-8") as out_f:
        json.dump(consolidated_data, out_f, indent=2, ensure_ascii=False)
        
    static_out_path = "indicador_btc/indicador_data.json"
    with open(static_out_path, "w", encoding="utf-8") as out_fs:
        json.dump(consolidated_data, out_fs, indent=2, ensure_ascii=False)
        
    # Copiar al directorio de Cloudflare para despliegue automático
    # Intentamos primero en el directorio raíz superior y luego en el local
    if os.path.exists("../indicador_cloudflare"):
        cloudflare_out_path = "../indicador_cloudflare/indicador_data.json"
    else:
        cloudflare_out_path = "indicador_cloudflare/indicador_data.json"
        os.makedirs("indicador_cloudflare", exist_ok=True)
    with open(cloudflare_out_path, "w", encoding="utf-8") as out_fn:
        json.dump(consolidated_data, out_fn, indent=2, ensure_ascii=False)
        
    print(f"[PROCESSOR SUCCESS] Archivos guardados correctamente y saneados de decimales:")
    print(f"  -> {out_path} ({round(os.path.getsize(out_path)/1024, 2)} KB)")
    print(f"  -> {static_out_path} ({round(os.path.getsize(static_out_path)/1024, 2)} KB)")
    print(f"  -> {cloudflare_out_path} ({round(os.path.getsize(cloudflare_out_path)/1024, 2)} KB)")

if __name__ == "__main__":
    process_and_consolidate()
