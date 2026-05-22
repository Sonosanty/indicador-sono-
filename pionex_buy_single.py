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
    euros_to_buy = 10.0  # Compramos 10 Euros para superar los 10 USDT de mínimo
    usdt_amount = round(euros_to_buy * eur_to_usdt, 2)
    
    print(f"\n[LOG] Tipo de cambio EUR/USDT estimado: {eur_to_usdt}")
    print(f"[LOG] Monto de compra: {euros_to_buy} EUR => {usdt_amount} USDT")

    # Permite especificar el símbolo deseado o usar "SOL_USDT" por defecto
    symbol = sys.argv[1] if len(sys.argv) > 1 else "SOL_USDT"
    print(f"--> Colocando orden MARKET BUY para {symbol} de {usdt_amount} USDT...")
    
    try:
        response = orders_client.new_order(
            symbol=symbol,
            side="BUY",
            type="MARKET",
            amount=str(usdt_amount)
        )
        print(f"[OK] Orden ejecutada con éxito para {symbol}.")
        print(f"     ID de Orden: {response.get('data', {}).get('orderId', 'N/A')}")
        print(f"     Respuesta completa de la API: {json.dumps(response, indent=2)}")
    except Exception as e:
        print(f"[ERROR] No se pudo comprar {symbol}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
