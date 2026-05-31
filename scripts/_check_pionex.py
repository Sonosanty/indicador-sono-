import json, os
from pionex_python.restful.Account import Account

with open('pionex_credentials.json', 'r') as f:
    creds = json.load(f)

acc = Account(creds['api_key'], creds['api_secret'])
res = acc.get_balance()

if res.get('result'):
    raw = res.get('data', {}).get('balances', [])
    print("=== SALDOS PIONEX ===")
    coins_with_balance = []
    for b in raw:
        coin = b['coin']
        free = float(b['free'])
        frozen = float(b['frozen'])
        total_b = free + frozen
        if total_b > 0:
            print(f"  {coin}: {free:.8f} free | {frozen:.8f} frozen | Total: {total_b:.8f}")
            coins_with_balance.append(coin)
    print(f"\nMonedas con saldo ({len(coins_with_balance)}): {coins_with_balance}")
else:
    print("ERROR:", res)
