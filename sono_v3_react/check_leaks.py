import requests

urls = [
    'https://indicador-sono.pages.dev/pionex_credentials.json',
    'https://indicador-sono.pages.dev/.env',
    'https://indicador-sono.pages.dev/config.json',
    'https://indicador-sono.pages.dev/.git/config',
    'https://indicador-sono.pages.dev/package.json',
    'https://indicador-sono.pages.dev/sono_bot.py',
    'https://indicador-sono.pages.dev/sono_bot.log',
]

for u in urls:
    r = requests.get(u, timeout=10)
    is_leak = r.status_code == 200 and len(r.text) > 50 and '404' not in r.text[:200].lower()
    print(f'{u.split("/")[-1]:30s} {r.status_code:3d} | {"LEAK!" if is_leak else "safe":>5} | {len(r.text):>4} chars')
