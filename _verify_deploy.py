import sys, urllib.request, json
sys.stdout.reconfigure(encoding='utf-8')

pages = [
    ('/', 'Dashboard - index.html'),
    ('/rangos', 'Rangos - range_explorer.html'),
    ('/metodo', 'Metodo - metodo.html'),
    ('/trades', 'Trades - trades_explorer.html'),
]

base = 'https://indicador-sono.pages.dev'

print("=== PAGE VERIFICATION ===")
print()

for path, name in pages:
    url = base + path
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
            status = resp.status
            size = len(html)
            
            # Check CSS assets
            has_tokens = 'tokens.css' in html
            has_components = 'components.css' in html
            has_base = 'base.css' in html
            has_layout = 'layout.css' in html
            has_appjs = '/app.js' in html
            
            # Title
            title = ''
            if '<title>' in html:
                tstart = html.find('<title>') + 7
                tend = html.find('</title>')
                title = html[tstart:tend]
            
            # Old inline CSS check
            has_old_inline = bool('--bg:#080c14' in html or '--bg-base' not in html if path in ('/', '/metodo') else False)
            
            total_css = sum([has_tokens, has_components, has_base, has_layout])
            
            print(f"[{status}] {path:20s} {size:6d} bytes")
            print(f"       {name}")
            print(f"       CSS modules: {total_css}/4 (tokens={int(has_tokens)}, base={int(has_base)}, layout={int(has_layout)}, comp={int(has_components)})")
            print(f"       app.js: {int(has_appjs)} | Title: {title}")
            print()
    except Exception as e:
        print(f"[ERR] {path}: {e}")
        print()

print("=== CSS ASSETS ===")
print()
for css in ['/assets/css/tokens.css', '/assets/css/base.css', '/assets/css/layout.css', '/assets/css/components.css']:
    url = base + css
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            print(f"[{resp.status}] {css:35s} {len(data):6d} bytes")
    except Exception as e:
        print(f"[ERR] {css:35s} {e}")

print()
print("=== app.js SCORE VERIFICATION ===")
print()
try:
    req = urllib.request.Request(base + '/app.js')
    with urllib.request.urlopen(req, timeout=10) as resp:
        js = resp.read().decode('utf-8')
        print(f"Size: {len(js)} bytes")
        
        checks_list = [
            ("SCORE_CFG var", "var SCORE_CFG"),
            ("loadScoreConfig", "loadScoreConfig"),
            ("hashArr function", "function hashArr"),
            ("P1: MA6>MA40=12", "m6>m40?12:0"),
            ("P1: MA40>MA200=13", "m40>m2?13:0"),
            ("P2: ADX>35=15", "a>35?15:a>25?10:3"),
            ("P2: RSI>=50=12", "r>=50&&r<70?12"),
            ("P3: BB pctB<0.15=28", "b<0.15"),
            ("computeRsi3d", "computeRsi3d"),
            ("RSI 3D cache", "_rsi3dCache"),
            ("classify (sl)", "function sl(s)"),
        ]
        
        for check_name, pattern in checks_list:
            found = pattern in js
            mark = "OK" if found else "--"
            print(f"  [{mark}] {check_name}")
        
        # Verify P1 is NOT old weights
        old_p1 = "m6>m70?15:0" in js
        if old_p1:
            print("  [!!] STILL HAS OLD P1 WEIGHTS (m6>m70?15)")
        else:
            print("  [OK] Old P1 weights removed")
            
except Exception as e:
    print(f"ERROR: {e}")
