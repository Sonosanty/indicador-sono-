import os
import json
import sys

try:
    from pionex_python.restful.Orders import Orders
except ImportError:
    print("[ERROR] 'pionex_python' no está instalado.")
    sys.exit(1)

CREDENTIALS_FILE = "pionex_credentials.json"

def get_exchange_rate_eur_usdt():
    import urllib.request
    try:
        url = "https://api.coinbase.com/v2/exchange-rates?currency=EUR"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            rates = data.get("data", {}).get("rates", {})
            usdt_rate = float(rates.get("USDT", 1.08))
            return usdt_rate
    except Exception as e:
        print(f"[WARNING] No se pudo obtener el tipo de cambio EUR/USDT en vivo ({e}). Usando tasa por defecto: 1.08")
        return 1.08

def main():
    if not os.path.exists(CREDENTIALS_FILE):
        print(f"[ERROR] Archivo de credenciales no encontrado.")
        sys.exit(1)

    try:
        with open(CREDENTIALS_FILE, 'r', encoding='utf-8') as f:
            credentials = json.load(f)
            api_key = credentials.get("api_key")
            api_secret = credentials.get("api_secret")
            
            if not api_key or not api_secret:
                print(f"[ERROR] Las credenciales en '{CREDENTIALS_FILE}' son inválidas.")
                sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Error al leer '{CREDENTIALS_FILE}': {e}")
        sys.exit(1)

    try:
        orders_client = Orders(api_key, api_secret)
    except Exception as e:
        print(f"[ERROR] Error al inicializar el cliente de Pionex: {e}")
        sys.exit(1)

    eur_to_usdt = get_exchange_rate_eur_usdt()
    euros_to_buy = 4.0
    usdt_amount = round(euros_to_buy * eur_to_usdt, 2)
    print(f"\n[LOG] Tipo de cambio EUR/USDT estimado: {eur_to_usdt}")
    print(f"[LOG] Monto de compra por moneda: {euros_to_buy} EUR => {usdt_amount} USDT\n")

    symbols = ["BTC_USDT", "ETH_USDT", "SOL_USDT", "XRP_USDT"]
    results = {}

    for sym in symbols:
        print(f"--> Colocando orden MARKET BUY para {sym} de {usdt_amount} USDT...")
        
        try:
            # Según la firma: (self, symbol: str, side: str, type: str, clientOrderId: str = None, size: str = None, price: str = None, amount: str = None, IOC: bool = None)
            # Para un Market Buy, la cantidad de USDT se pasa en el parámetro 'amount'.
            response = orders_client.new_order(
                symbol=sym,
                side="BUY",
                type="MARKET",
                amount=str(usdt_amount)
            )
            results[sym] = {
                "success": True,
                "response": response
            }
            print(f"[OK] Orden ejecutada con éxito para {sym}.")
            print(f"     ID de Orden: {response.get('data', {}).get('orderId', 'N/A')}")
        except Exception as e:
            results[sym] = {
                "success": False,
                "error": str(e)
            }
            print(f"[ERROR] No se pudo comprar {sym}: {e}")

    print("\n" + "="*50)
    print(" RESUMEN DE OPERACIONES PIONEX ")
    print("="*50)
    success_count = sum(1 for r in results.values() if r["success"])
    print(f"Total: {len(symbols)} monedas | Exitosas: {success_count} | Fallidas: {len(symbols) - success_count}")
    for sym, res in results.items():
        status = "EXITOSA" if res["success"] else f"FALLIDA ({res['error']})"
        print(f"- {sym}: {status}")
    print("="*50)

if __name__ == "__main__":
    main()
