import sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def check(name, url, is_js=False):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            txt = data.decode('utf-8')
            mark = "OK" if resp.status == 200 else "--"
            print(f"  [{mark}] {name:35s} {resp.status} {len(data):6d}b")
            return txt
    except Exception as e:
        print(f"  [--] {name:35s} ERROR: {e}")
        return None

print("=== MODULES VERIFICATION ===")
print()

modules = [
    ("js/core/cache.js", "/js/core/cache.js"),
    ("js/data/adapters.js", "/js/data/adapters.js"),
    ("js/data/binance.js", "/js/data/binance.js"),
    ("js/data/kucoin.js", "/js/data/kucoin.js"),
    ("js/data/coingecko.js", "/js/data/coingecko.js"),
    ("js/data/alternative.js", "/js/data/alternative.js"),
    ("js/data/vix.js", "/js/data/vix.js"),
    ("js/data/sonobot.js", "/js/data/sonobot.js"),
]

base = "https://indicador-sono.pages.dev"
for name, path in modules:
    check(name, base + path)

print()
print("=== CONTENT CHECKS ===")
for name, path in modules:
    txt = check(name + " (test)", base + path)
    if txt:
        # Check key exports
        if 'export' in txt:
            print(f"         -> Has ES module exports")
        # specific checks
        if 'cache' in path:
            print(f"         -> fetchWithTimeout: {'fetchWithTimeout' in txt}")
            print(f"         -> createSWRCache: {'createSWRCache' in txt}")
        if 'adapters' in path:
            print(f"         -> fetchMarketData: {'fetchMarketData' in txt}")
            print(f"         -> fetchMacroOnly: {'fetchMacroOnly' in txt}")
        if 'binance' in path:
            print(f"         -> fetchKlines: {'fetchKlines' in txt}")
            print(f"         -> fetchTicker: {'fetchTicker' in txt}")
        if 'kucoin' in path:
            print(f"         -> fetchKlines: {'fetchKlines' in txt}")
            print(f"         -> mapper defensivo: {'closeVal >= openVal' in txt}")
        if 'coingecko' in path:
            print(f"         -> fetchGlobal: {'fetchGlobal' in txt}")
        if 'alternative' in path:
            print(f"         -> fetchFearGreed: {'fetchFearGreed' in txt}")
        if 'vix' in path:
            print(f"         -> fetchVix: {'fetchVix' in txt}")
            print(f"         -> fetchGlobal: {'fetchGlobal' in txt}")
        if 'sonobot' in path:
            print(f"         -> fetchStatus: {'fetchStatus' in txt}")

print()
print("=== PAGES VERIFICATION ===")
for path, name in [
    ("/", "Dashboard"),
    ("/rangos", "Rangos"),
    ("/metodo", "Metodo"),
    ("/trades", "Trades"),
]:
    html = check(name, base + path)
    if html:
        css_ok = all(x in html for x in ["tokens.css", "base.css", "layout.css", "components.css"])
        print(f"         -> CSS modules: {'OK' if css_ok else '--'}")

print()
print("=== DONE ===")
