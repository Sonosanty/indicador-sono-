from db_utils import get_latest_snapshot, get_historical_snapshots

print("Probando get_latest_snapshot():")
latest = get_latest_snapshot()
if latest:
    print(f"Ultima fecha: {latest.get('fecha')}")
    print(f"Precio BTC USD: {latest.get('btc_price', {}).get('usd')}")
    print(f"Fear & Greed: {latest.get('fear_greed', {}).get('value')}")
    print(f"Score: {latest.get('score')}")
    print(f"Estado: {latest.get('estado')}")
else:
    print("No se pudo obtener el ultimo snapshot.")

print("\nProbando get_historical_snapshots():")
history = get_historical_snapshots(limit=5)
for item in history:
    print(f"ID: {item['id']} | {item['fecha']} | Price: ${item['btc_usd']} | Score: {item['macro_score']} | State: {item['macro_state']}")
