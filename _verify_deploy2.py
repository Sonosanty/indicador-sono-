import sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def check(name, url, is_css=False, is_js=False):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            html = data.decode('utf-8')
            if is_css:
                print(f"  [OK] {name:35s} {resp.status} {len(data)}b")
                return html
            elif is_js:
                print(f"  [OK] {name:35s} {resp.status} {len(data)}b")
                return html
            else:
                css_tokens = int("tokens.css" in html)
                css_comp = int("components.css" in html)
                css_base = int("base.css" in html)
                css_layout = int("layout.css" in html)
                has_appjs = int("/app.js" in html)
                inline_count = html.count("<style>")
                print(f"  [OK] {name:30s} {resp.status} | {len(data):6d}b | CSS: tokens={css_tokens} base={css_base} layout={css_layout} comp={css_comp} | appjs={has_appjs} | inline=<style>x{inline_count}")
                return html
    except Exception as e:
        print(f"  [ERR] {name:30s} {e}")
        return None

print("=== PAGE VERIFICATION ===")
for path, name in [("/", "Dashboard"), ("/rangos", "Rangos"), ("/metodo", "Metodo"), ("/trades", "Trades")]:
    print()
    url = "https://indicador-sono.pages.dev" + path
    check(name, url)

print()
print("=== CSS ASSETS ===")
for css in ["tokens.css", "base.css", "layout.css", "components.css"]:
    url = "https://indicador-sono.pages.dev/assets/css/" + css
    check(css, url, is_css=True)

print()
print("=== app.js VERIFICATION ===")
js = check("app.js", "https://indicador-sono.pages.dev/app.js", is_js=True)
if js:
    checks = [
        ("SCORE_CFG var", "SCORE_CFG" in js),
        ("loadScoreConfig()", "loadScoreConfig" in js),
        ("hashArr function", "function hashArr" in js),
        ("P1: MA6>MA40=12", "m6>m40?12:0" in js),
        ("P1: MA40>MA200=13", "m40>m2?13:0" in js),
        ("P2: ADX>35=15", "a>35?15:a>25?10:3" in js),
        ("P2: RSI>=50=12", "r>=50&&r<70?12" in js),
        ("P2: Price>MA200=8", "p>m2?8:0" in js),
        ("P3: BB<0.15=28", "b<0.15" in js),
        ("P3: BB<0.35=20", "b<0.35" in js),
        ("RSI 3D real", "computeRsi3d" in js),
        ("RSI 3D cache", "_rsi3dCache" in js),
        ("Timeout 20s", "20000" in js),
        ("Skeleton error handler", "querySelectorAll" in js and "skeleton" in js),
        ("MA_CACHE hash", "MA_CACHE[k6]" in js),
        ("sl() uses SCORE_CFG", "SCORE_CFG.barreras" in js),
    ]
    for name, result in checks:
        mark = "OK" if result else "--"
        print(f"  [{mark}] {name}")
    
    # Verify old weights are GONE
    if "m6>m70?15:0" not in js:
        print("  [OK] Old P1 weights (m6>m70?15) removed")
    if "r>55?20" not in js:
        print("  [OK] Old P2 weights (r>55?20) removed")
    # Check P3 is ALIGNED with Python
    has_old_p3 = "b>0.8||b<0?5" in js
    print(f"  [{'OK' if not has_old_p3 else '--'}] Old P3 weights (b>0.8||b<0?5) removed")
