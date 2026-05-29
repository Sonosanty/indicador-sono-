import subprocess, os, shutil

DIR = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare'

# ── 1. Landing (/) ──────────────────────────────────────────
landing = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sono Pro — Trading Cuantitativo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060a12;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#0a1628;border:1px solid #1a2a40;border-radius:14px;padding:36px;max-width:480px;text-align:center}
h1{font-size:30px;font-weight:700;margin-bottom:10px;background:linear-gradient(135deg,#16a34a,#14b8a6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
p{color:#64748b;font-size:14px;line-height:1.7;margin-bottom:24px}
.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{display:inline-block;padding:10px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:13px}
.btn-p{background:#16a34a;color:#fff}.btn-s{background:#1a2a40;color:#e2e8f0}
.ft{color:#3d5570;font-size:11px;margin-top:24px}
</style>
</head>
<body>
<div class="card">
<h1>SONO PRO</h1>
<p>Terminal de trading cuantitativo en tiempo real. Datos en vivo desde Binance para BTC, ETH, SOL y XRP.</p>
<div class="btns">
<a href="/dashboard_sono/" class="btn btn-p">Dashboard</a>
<a href="/trades/" class="btn btn-s">Trades</a>
</div>
<div class="ft">v3.0 — Datos en vivo desde Binance</div>
</div>
</body>
</html>'''

# ── 2. Dashboard ────────────────────────────────────────────
dashboard = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sono Pro — Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060a12;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh}
#ov{position:fixed;inset:0;background:#060a12;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:16px}
#ov.h{display:none}
#app{opacity:0;transition:opacity .4s}
.sp{width:34px;height:34px;border:3px solid #1a2a40;border-top-color:#16a34a;border-radius:50%;animation:s .8s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.nav{display:flex;gap:6px;padding:14px 18px;background:#0a1628;border-bottom:1px solid #1a2a40;align-items:center;flex-wrap:wrap}
.nav .b{color:#e2e8f0;font-weight:700;font-size:14px;margin-right:20px}
.nav a{color:#64748b;text-decoration:none;padding:5px 16px;border-radius:999px;font-size:12px;font-weight:500}
.nav a.a{background:#16a34a20;color:#16a34a}
.r{display:flex;gap:12px;padding:12px 18px;flex-wrap:wrap}
.c{background:#0a1628;border:1px solid #1a2a40;border-radius:14px;padding:16px;flex:1;min-width:140px}
.c h3{color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;font-weight:500}
.c .v{font-size:22px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace}
.c .s{color:#64748b;font-size:11px;margin-top:4px}
.g{color:#16a34a}.r{color:#dc2626}.n{color:#64748b}
@media(max-width:600px){.c{min-width:calc(50% - 12px)}.r{padding:8px 10px;gap:8px}}
</style>
</head>
<body>
<div id="ov"><div class="sp"></div><div style="color:#64748b;font-size:13px">Cargando datos desde Binance...</div></div>
<div id="app">
<div class="nav"><span class="b">SONO PRO</span><a href="/">Macro</a><a href="/dashboard_sono/" class="a">Dashboard</a><a href="/trades/">Trades</a></div>
<div class="r" id="tr"></div>
<div class="r" id="mr"></div>
</div>
<script>
var A={BTC:{s:'BTCUSDT',d:2,c:'#F7931A'},ETH:{s:'ETHUSDT',d:2,c:'#627EEA'},SOL:{s:'SOLUSDT',d:3,c:'#9945FF'},XRP:{s:'XRPUSDT',d:4,c:'#00AAE4'}};
var U='https://api.binance.com/api/v3';
var T={};

function fn(n,d){if(n==null)return'--';return Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function g(id){return document.getElementById(id)}
function txt(id,t){var e=g(id);if(e)e.textContent=t}

async function lt(k){try{var r=await fetch(U+'/ticker/24hr?symbol='+A[k].s,{signal:AbortSignal.timeout(8e3)});var d=await r.json();T[k]={p:+d.lastPrice,c:+d.priceChangePercent}}catch(e){T[k]={p:null,c:null}}}

function rd(){var tr=g('tr');if(!tr)return;
tr.innerHTML=Object.keys(A).map(function(k){
  var t=T[k];if(!t||t.p==null)return'<div class="c" style="min-width:100px"><h3>'+k+'</h3><div class="v n">--</div><div class="s n">--</div></div>';
  var cl=t.c>=0?'g':'r';
  return'<div class="c" style="min-width:100px;border-left:3px solid '+A[k].c+'"><h3>'+k+'</h3><div class="v '+cl+'">$'+fn(t.p,A[k].d)+'</div><div class="s '+cl+'">'+(t.c>=0?'+':'')+t.c.toFixed(2)+'%</div></div>';
}).join('');
var mr=g('mr');if(!mr)return;
var n=0;Object.keys(T).forEach(function(k){if(T[k]&&T[k].p!=null)n++});
mr.innerHTML='<div class="c"><h3>ESTADO</h3><div class="v g">'+n+'/'+Object.keys(A).length+'</div><div class="s">'+(n===Object.keys(A).length?'Conectado a Binance':'Cargando...')+'</div></div>';
}

async function init(){await Promise.all(Object.keys(A).map(function(k){return lt(k).catch(function(){})}));rd();setTimeout(function(){g('ov').classList.add('h');g('app').style.opacity='1'},300)}
init();
</script>
</body>
</html>'''

# ── 3. Trades ───────────────────────────────────────────────
trades = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sono Pro — Trades</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060a12;color:#e2e8f0;font-family:system-ui,sans-serif;min-height:100vh}
#ov{position:fixed;inset:0;background:#060a12;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:16px}
#ov.h{display:none}
#app{opacity:0;transition:opacity .4s}
.sp{width:34px;height:34px;border:3px solid #1a2a40;border-top-color:#16a34a;border-radius:50%;animation:s .8s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.nav{display:flex;gap:6px;padding:14px 18px;background:#0a1628;border-bottom:1px solid #1a2a40;align-items:center;flex-wrap:wrap}
.nav .b{color:#e2e8f0;font-weight:700;font-size:14px;margin-right:20px}
.nav a{color:#64748b;text-decoration:none;padding:5px 16px;border-radius:999px;font-size:12px;font-weight:500}
.nav a.a{background:#16a34a20;color:#16a34a}
.r{display:flex;gap:12px;padding:12px 18px;flex-wrap:wrap}
.c{background:#0a1628;border:1px solid #1a2a40;border-radius:14px;padding:16px;flex:1;min-width:120px;text-align:center}
.c h3{color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:500}
.c .v{font-size:22px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace}
.c .s{color:#64748b;font-size:11px;margin-top:4px}
.g{color:#16a34a}.r{color:#dc2626}.n{color:#64748b}
</style>
</head>
<body>
<div id="ov"><div class="sp"></div><div style="color:#64748b;font-size:13px">Cargando datos desde Binance...</div></div>
<div id="app">
<div class="nav"><span class="b">SONO PRO</span><a href="/">Macro</a><a href="/dashboard_sono/">Dashboard</a><a href="/trades/" class="a">Trades</a></div>
<div class="r" id="tr"></div>
<div class="r"><div class="c"><h3>ABIERTOS</h3><div class="v g" id="oc">0</div></div><div class="c"><h3>CERRADOS</h3><div class="v n" id="cc">0</div></div></div>
</div>
<script>
var A={BTC:{s:'BTCUSDT',d:2},ETH:{s:'ETHUSDT',d:2},SOL:{s:'SOLUSDT',d:3},XRP:{s:'XRPUSDT',d:4}};
var U='https://api.binance.com/api/v3';
var T={};

function fn(n,d){if(n==null)return'--';return Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}

async function lt(k){try{var r=await fetch(U+'/ticker/24hr?symbol='+A[k].s,{signal:AbortSignal.timeout(8e3)});var d=await r.json();T[k]={p:+d.lastPrice,c:+d.priceChangePercent}}catch(e){}}

function rd(){var tr=document.getElementById('tr');if(!tr)return;
tr.innerHTML=Object.keys(A).map(function(k){
  var t=T[k];if(!t||t.p==null)return'';
  var cl=t.c>=0?'g':'r';
  return'<div class="c" style="min-width:90px"><h3>'+k+'</h3><div class="v '+cl+'">$'+fn(t.p,A[k].d)+'</div><div class="s '+cl+'">'+(t.c>=0?'+':'')+t.c.toFixed(2)+'%</div></div>';
}).filter(Boolean).join('');
}

async function init(){await Promise.all(Object.keys(A).map(function(k){return lt(k).catch(function(){})}));rd();document.getElementById('ov').classList.add('h');document.getElementById('app').style.opacity='1'}
init();
</script>
</body>
</html>'''

# ── Verify and write all ─────────────────────────────────────
files = {
    'index.html': landing,
    'dashboard_sono/index.html': dashboard,
    'trades/index.html': trades
}

all_ok = True
for path, content in files.items():
    full_path = os.path.join(DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    # Verify JS syntax if script tag exists
    start = content.find('<script>')
    if start >= 0:
        end = content.find('</script>', start)
        js = content[start+8:end]
        tmp = r'C:\Users\sparreno\AppData\Local\Temp\check_js.js'
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(js)
        r = subprocess.run(
            'node -e "try{new Function(require(\'fs\').readFileSync(\'C:/Users/sparreno/AppData/Local/Temp/check_js.js\',\'utf-8\'));console.log(\'OK\')}catch(e){console.log(\'FAIL:\'+e.message.split(\'\\n\')[0])}"',
            capture_output=True, text=True, shell=True
        )
        result = r.stdout.strip()
        if 'OK' in result:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'  OK  {path} ({len(content)}b) JS verified')
        else:
            print(f'  FAIL {path}: {result}')
            all_ok = False
    else:
        # No JS, write directly
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  OK  {path} ({len(content)}b) (no JS)')

if all_ok:
    print('\nAll files written and verified. Ready to deploy.')
