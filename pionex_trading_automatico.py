"""
PIONEX_TRADING_AUTOMATICO.PY
Bot de Trading Autónomo Método Sono - Fino Edition Pro 👒

Ejecuta un bucle continuo de análisis y operativa real en Pionex:
- Corre el procesador de datos para recabar el Score de Confluencia y señales del mercado.
- Toma decisiones de compra (Market Buy) o venta de emergencia (Market Sell) según la señal de Sono.
- Sincroniza dinámicamente los datos de mercado y balances en producción (Cloudflare Pages).
- Monitorea posiciones, limpia órdenes límites colgadas y protege el capital.
- Tiene programada una hora de parada (domingo 24 de mayo de 2026, 12:00 PM) para liquidar posiciones y generar el informe.
"""

import os
import json
import time
import subprocess
from datetime import datetime
import math

try:
    from pionex_python.restful.Account import Account
    from pionex_python.restful.Orders import Orders
except ImportError:
    print("[BOT ERROR] No se encuentra la librería 'pionex_python'.")
    os.sys.exit(1)

# Configuración del bot
COINS = ["BTC", "ETH", "SOL", "XRP"]
CREDENTIALS_FILE = "pionex_credentials.json"
TRADE_LOG_FILE = "memory/pionex_trades.json"
STATUS_FILE = "memory/trading_automatico_status.json"
LIMIT_TIME = datetime(2026, 5, 24, 12, 0, 0) # Domingo 24 de Mayo 2026, 12:00 PM
LOOP_INTERVAL = 900 # Cada 15 minutos (900s)

# Límites de precisión de decimales para órdenes en Pionex (Size de Venta)
PRECISION_CONFIG = {
    "BTC": 6,
    "ETH": 5,
    "SOL": 4,
    "XRP": 4
}

def load_credentials():
    if not os.path.exists(CREDENTIALS_FILE):
        raise FileNotFoundError(f"Archivo de credenciales '{CREDENTIALS_FILE}' no encontrado.")
    with open(CREDENTIALS_FILE, 'r', encoding='utf-8') as f:
        creds = json.load(f)
        if not creds.get("api_key") or not creds.get("api_secret"):
            raise ValueError("Credenciales inválidas en el archivo JSON.")
        return creds["api_key"], creds["api_secret"]

def truncate_decimal(val, decimals):
    """Trunca un valor hacia abajo al número de decimales permitidos por el exchange"""
    factor = 10 ** decimals
    return math.floor(val * factor) / factor

def log_trade(trade_type, coin, price, amount_or_size, details=""):
    """Registra una operación ejecutada en el historial de logs"""
    os.makedirs("memory", exist_ok=True)
    trades = []
    if os.path.exists(TRADE_LOG_FILE):
        try:
            with open(TRADE_LOG_FILE, 'r', encoding='utf-8') as f:
                trades = json.load(f)
        except Exception:
            trades = []
            
    trade_entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "type": trade_type, # "BUY" o "SELL"
        "coin": coin,
        "price_usd": price,
        "amount_or_size": amount_or_size,
        "details": details
    }
    trades.append(trade_entry)
    
    with open(TRADE_LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(trades, f, indent=2, ensure_ascii=False)

def update_status_file(balances, active_positions, next_run_time):
    """Guarda una captura de estado del bot para auditorías rápidas"""
    os.makedirs("memory", exist_ok=True)
    status_data = {
        "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "bot_active": True,
        "next_run_scheduled": next_run_time.strftime("%Y-%m-%d %H:%M:%S"),
        "limit_time": LIMIT_TIME.strftime("%Y-%m-%d %H:%M:%S"),
        "balances": balances,
        "active_positions": active_positions
    }
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status_data, f, indent=2, ensure_ascii=False)

def run_market_processor():
    """Ejecuta el procesador de datos técnico para refrescar señales de mercado"""
    print("[BOT] Corriendo process_indicador_data.py para recopilar datos del mercado en vivo...")
    try:
        subprocess.run(["python", "indicador_btc/process_indicador_data.py"], check=True)
        # Sincronizar el JSON resultante con la carpeta de Cloudflare
        if os.path.exists("indicador_btc/indicador_data.json"):
            # Copiar a la carpeta de Cloudflare Pages
            import shutil
            shutil.copyfile("indicador_btc/indicador_data.json", "indicador_cloudflare/indicador_data.json")
            print("[BOT] Datos de mercado refrescados y copiados a indicador_cloudflare.")
            
            # Lanzar despliegue a Cloudflare Pages de forma asíncrona
            print("[BOT] Lanzando sincronización de datos de Cloudflare Pages...")
            subprocess.Popen(["npx", "wrangler", "pages", "deploy", "indicador_cloudflare", "--project-name=indicador-sono"], shell=True)
    except Exception as e:
        print(f"[BOT WARNING] Error al correr el procesador de datos: {e}")

def force_emergency_liquidation(orders_client, account_client):
    """Cierra a mercado absolutamente todas las posiciones abiertas al llegar al límite de tiempo"""
    print("\n" + "="*60)
    print(" [ALERTA] HORA LIMITE ALCANZADA - INICIANDO LIQUIDACION DE SEGURIDAD")
    print("="*60)
    
    try:
        balance_res = account_client.get_balance()
        if not balance_res.get("result"):
            print("[BOT ERROR] No se pudieron obtener los saldos para liquidar.")
            return
            
        raw_balances = balance_res.get("data", {}).get("balances", [])
        
        # Primero leer el JSON para conocer los precios actuales de referencia
        prices = {}
        if os.path.exists("indicador_btc/indicador_data.json"):
            try:
                with open("indicador_btc/indicador_data.json", 'r', encoding='utf-8') as jf:
                    mdata = json.load(jf)
                    for c, cinfo in mdata.get("coins", {}).items():
                        prices[c] = cinfo.get("price_usd", 0.0)
            except Exception:
                pass

        for b in raw_balances:
            coin = b["coin"]
            if coin in COINS:
                free_qty = float(b["free"])
                if free_qty > 0.0:
                    precision = PRECISION_CONFIG.get(coin, 4)
                    rounded_qty = truncate_decimal(free_qty, precision)
                    
                    if rounded_qty > 0.0:
                        symbol = f"{coin}_USDT"
                        print(f"--> [EMERGENCIA] Vendiendo el 100% de {coin} ({rounded_qty} unidades) a mercado...")
                        try:
                            response = orders_client.new_order(
                                symbol=symbol,
                                side="SELL",
                                type="MARKET",
                                size=str(rounded_qty)
                            )
                            current_price = prices.get(coin, 0.0)
                            log_trade("SELL", coin, current_price, rounded_qty, "LIQUIDACIÓN DE EMERGENCIA POR TIEMPO LÍMITE")
                            print(f"[OK] Posición de {coin} liquidada con éxito.")
                        except Exception as ex:
                            print(f"[BOT ERROR] Falló liquidación de {coin}: {ex}")
    except Exception as e:
        print(f"[BOT ERROR] Error crítico en la liquidación: {e}")
    print("="*60)

def main():
    print("="*60)
    print(" === BOT DE TRADING AUTONOMO METODO SONO - INICIADO ===")
    print(f"  Iniciado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Fecha de Parada: {LIMIT_TIME.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Frecuencia: Comprobación cada {LOOP_INTERVAL / 60} minutes")
    print("="*60)
    
    try:
        api_key, api_secret = load_credentials()
        account_client = Account(api_key, api_secret)
        orders_client = Orders(api_key, api_secret)
    except Exception as err:
        print(f"[BOT CRITICAL ERROR] Falló la carga de credenciales / inicialización: {err}")
        return
        
    while True:
        now = datetime.now()
        
        # 1. Comprobación del límite de tiempo (Domingo al mediodía)
        if now >= LIMIT_TIME:
            print(f"\n[BOT] Hora límite superada ({now.strftime('%Y-%m-%d %H:%M:%S')}). Apagando sistema de forma segura...")
            force_emergency_liquidation(orders_client, account_client)
            # Desactivar estado del bot
            if os.path.exists(STATUS_FILE):
                try:
                    with open(STATUS_FILE, 'r', encoding='utf-8') as sf:
                        sdata = json.load(sf)
                    sdata["bot_active"] = False
                    sdata["balances"] = {}
                    sdata["active_positions"] = {}
                    with open(STATUS_FILE, 'w', encoding='utf-8') as sf_out:
                        json.dump(sdata, sf_out, indent=2, ensure_ascii=False)
                except Exception:
                    pass
            print("[BOT] Sistema apagado ordenadamente. ¡Hasta pronto! 👒")
            break
            
        print(f"\n[BOT CYCLE] Iniciando revisión a las: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # A. Actualizar datos técnicos de mercado y subir a producción
        run_market_processor()
        
        # B. Leer las señales resultantes
        signals_data = {}
        if os.path.exists("indicador_btc/indicador_data.json"):
            try:
                with open("indicador_btc/indicador_data.json", "r", encoding="utf-8") as f:
                    signals_data = json.load(f)
            except Exception as e:
                print(f"[BOT ERROR] Error leyendo indicador_data.json: {e}")
                
        # C. Consultar balances en Pionex
        balances_map = {}
        free_usdt = 0.0
        try:
            balance_res = account_client.get_balance()
            if balance_res.get("result"):
                for b in balance_res.get("data", {}).get("balances", []):
                    coin = b["coin"]
                    free_val = float(b["free"])
                    frozen_val = float(b["frozen"])
                    total_val = free_val + frozen_val
                    
                    if coin == "USDT":
                        free_usdt = free_val
                        
                    if total_val > 0.0 or coin == "USDT":
                        balances_map[coin] = {
                            "free": free_val,
                            "frozen": frozen_val,
                            "total": total_val
                        }
        except Exception as e:
            print(f"[BOT WARNING] Error consultando balance en Pionex: {e}")
            # Continuamos el ciclo con el mapa vacío o de respaldo
            
        # D. Evaluación de Operaciones
        active_positions = {}
        
        if signals_data and balances_map:
            coins_data = signals_data.get("coins", {})
            
            for coin in COINS:
                coin_info = coins_data.get(coin)
                if not coin_info:
                    continue
                    
                current_price = coin_info.get("price_usd", 0.0)
                signal = coin_info.get("accion", "NEUTRAL")
                
                # Calcular valor estimado en USD de las tenencias
                coin_balance = balances_map.get(coin, {"free": 0.0, "frozen": 0.0, "total": 0.0})
                free_qty = coin_balance["free"]
                total_qty = coin_balance["total"]
                position_usd_value = total_qty * current_price
                
                # Decidir si hay una posición activa abierta
                has_active_position = position_usd_value > 4.0 # Filtro: posición superior a $4 USD
                
                if has_active_position:
                    active_positions[coin] = {
                        "qty": total_qty,
                        "usd_val": round(position_usd_value, 2),
                        "entry_price": round(current_price, 2) # Estimado a precio actual
                    }
                
                print(f"  [{coin}] Precio: ${current_price} | Senal: {signal} | Tenencia: {total_qty} (${position_usd_value:.2f} USD) | Posicion Activa: {has_active_position}")
                
                # --- OPERATIVA REGLA 1: ENTRAR LONG ---
                if signal == "LONG" and not has_active_position:
                    # Comprobamos si hay USDT suficiente libre (> $11.00 USDT)
                    if free_usdt >= 11.0:
                        usdt_to_spend = 11.00 # Tamaño estándar de posición para balance de $36 USD
                        print(f"    [COMPRA] Senal LONG para {coin} detectada. Abriendo posicion de ${usdt_to_spend} USDT...")
                        try:
                            response = orders_client.new_order(
                                symbol=f"{coin}_USDT",
                                side="BUY",
                                type="MARKET",
                                amount=str(usdt_to_spend)
                            )
                            print(f"      [SUCCESS] Compra ejecutada. ID Orden: {response.get('data', {}).get('orderId', 'N/A')}")
                            log_trade("BUY", coin, current_price, usdt_to_spend, "Orden Market Buy de confluencia Metodo Sono")
                            # Descontar del saldo simulado para evitar compras duplicadas de otras monedas en este mismo ciclo
                            free_usdt -= usdt_to_spend
                        except Exception as err_buy:
                            print(f"      [ERROR COMPRA] No se pudo comprar {coin}: {err_buy}")
                    else:
                        print(f"    [AVISO] Senal LONG detectada para {coin}, pero saldo de USDT insuficiente (${free_usdt:.2f} USDT).")
                
                # --- OPERATIVA REGLA 2: VENTA ESTRATEGICA / CIERRE ---
                elif signal in ["NEUTRAL", "SHORT"] and has_active_position:
                    # La señal de Sono cambió a Neutral/Short, cerramos posición intradía de inmediato
                    precision = PRECISION_CONFIG.get(coin, 4)
                    rounded_qty = truncate_decimal(free_qty, precision)
                    
                    if rounded_qty > 0.0:
                        print(f"    [VENTA ESTRATEGICA] Senal de Sono es {signal} para {coin}. Liquidando tenencias de {rounded_qty} {coin}...")
                        try:
                            response = orders_client.new_order(
                                symbol=f"{coin}_USDT",
                                side="SELL",
                                type="MARKET",
                                size=str(rounded_qty)
                            )
                            print(f"      [SUCCESS] Venta ejecutada. ID Orden: {response.get('data', {}).get('orderId', 'N/A')}")
                            log_trade("SELL", coin, current_price, rounded_qty, f"Venta estrategica por senal {signal}")
                        except Exception as err_sell:
                            print(f"      [ERROR VENTA] No se pudo vender {coin}: {err_sell}")
                    else:
                        print(f"    [AVISO] Se requiere venta estrategica para {coin}, pero el balance libre es insuficiente o inferior al minimo ({free_qty}).")

        # E. Monitoreo y Cancelación de órdenes viejas
        print("[BOT] Monitoreando si hay órdenes colgadas para limpiar...")
        try:
            for coin in COINS:
                open_orders = orders_client.get_open_orders(symbol=f"{coin}_USDT")
                if open_orders.get("result"):
                    orders_list = open_orders.get("data", {}).get("orders", [])
                    for o in orders_list:
                        order_id = o.get("orderId")
                        # Cancelar cualquier orden colgada antigua para mantener el portafolio limpio
                        print(f"  -> [LIMPIEZA] Cancelando orden pendiente antigua {order_id} de {coin}_USDT...")
                        orders_client.cancel_order(symbol=f"{coin}_USDT", orderId=order_id)
        except Exception as e_clean:
            print(f"[BOT WARNING] No se pudo limpiar órdenes pendientes: {e_clean}")

        # F. Registrar estado en caliente
        next_run = datetime.now() + time.timedelta(seconds=LOOP_INTERVAL) if "timedelta" in dir(time) else datetime.now()
        # Fallback sencillo de tiempo
        try:
            import datetime as dt_lib
            next_run = datetime.now() + dt_lib.timedelta(seconds=LOOP_INTERVAL)
        except Exception:
            pass
            
        update_status_file(balances_map, active_positions, next_run)
        
        print(f"[BOT CYCLE COMPLETE] Durmiendo durante {LOOP_INTERVAL / 60} minutos. Próxima corrida: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()