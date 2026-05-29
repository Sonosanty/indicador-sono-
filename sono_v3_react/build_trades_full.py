import subprocess, os

DST = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades'

# Read the backup JS for reference patterns
back = r'C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\trades'
with open(os.path.join(back, 'app.js'), 'r', encoding='utf-8') as f:
    ref_js = f.read()

# Build complete trades page - inline JS, no external deps
html = r'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sono Pro — Trades y Rendimiento</title>
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
.c{background:#0a1628;border:1px solid #1a2a40;border-radius:14px;padding:16px;flex:1;min-width:130px}
.c h3{color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;font-weight:500}
.c .v{font-size:22px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace}
.c .s{color:#64748b;font-size:11px;margin-top:4px}
.g{color:#16a34a}.r{color:#dc2626}.n{color:#64748b}
.ta{width:100%;border-collapse:collapse;font-size:11px}
.ta th{color:#64748b;font-weight:500;padding:6px 8px;text-align:right;border-bottom:1px solid #1a2a40;text-transform:uppercase;font-size:9px;letter-spacing:1px}
.ta th:first-child,.ta td:first-child{text-align:left}
.ta td{padding:4px 8px;text-align:right;font-family:'JetBrains Mono',Consolas,monospace;border-bottom:0.5px solid #1a2a4050}
.tb{display:flex;gap:4px;margin-bottom:8px}
.tb button{background:#0a1628;border:1px solid #1a2a40;border-radius:8px;padding:6px 16px;color:#64748b;font-size:11px;font-weight:500;cursor:pointer}
.tb button.on{background:#16a34a20;border-color:#16a34a;color:#16a34a}
.em{color:#64748b;text-align:center;padding:20px;font-size:12px}
@media(max-width:600px){.c{min-width:calc(50% - 12px)}.r{padding:8px 10px;gap:8px}.ta{font-size:9px}.ta th,.ta td{padding:3px 4px}}
</style>
</head>
<body>
<div id="ov"><div class="sp"></div><div style="color:#64748b;font-size:13px">Conectando con Binance...</div></div>
<div id="app">
<div class="nav"><span class="b">SONO PRO</span><a href="/">Macro</a><a href="/dashboard_sono/">Dashboard</a><a href="/trades/" class="a">Trades</a></div>
<div class="r" id="tr"></div>
<div class="r" id="sr"></div>
<div class="r">
<div class="c"><h3>ABIERTOS</h3><div class="v g" id="oc">0</div></div>
<div class="c"><h3>CERRADOS</h3><div class="v n" id="cc">0</div></div>
<div class="c"><h3>WINRATE</h3><div class="v" id="wr" style="color:#64748b">--</div></div>
<div class="c"><h3>R TOTAL</h3><div class="v" id="rt" style="color:#64748b">--</div></div>
</div>
<div class="tb" id="tb"><button class="on" data-t="open">ABIERTOS <span id="oc2">0</span></button><button data-t="closed">CERRADOS <span id="cc2">0</span></button></div>
<div id="openP"><table class="ta"><thead><tr><th>ID</th><th>Side</th><th>Entry</th><th>SL</th><th>TP</th><th>MFE</th><th>MAE</th><th>Dur.</th><th>R</th><th>Precio</th></tr></thead><tbody id="ob"></tbody></table><div class="em" id="oe">Esperando trades...</div></div>
<div id="closedP" style="display:none"><table class="ta"><thead><tr><th>ID</th><th>Res.</th><th>Side</th><th>Entry</th><th>Close</th><th>MFE</th><th>MAE</th><th>Dur.</th><th>R</th><th>PnL</th></tr></thead><tbody id="cb"></tbody></table><div class="em" id="ce">Esperando trades...</div></div>
</div>
<script>
var A={BTC:{s:'BTCUSDT',d:2,c:'#F7931A'},ETH:{s:'ETHUSDT',d:2,c:'#627EEA'},SOL:{s:'SOLUSDT',d:3,c:'#9945FF'},XRP:{s:'XRPUSDT',d:4,c:'#00AAE4'}};
var U='https://api.binance.com/api/v3';
var T={},realTrades=[],tid=0;

function fn(n,d){if(n==null)return'--';return Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function g(id){return document.getElementById(id)}
function txt(id,t){var e=g(id);if(e)e.textContent=t}

async function lt(k){try{var r=await fetch(U+'/ticker/24hr?symbol='+A[k].s,{signal:AbortSignal.timeout(8e3)});var d=await r.json();T[k]={p:+d.lastPrice,c:+d.priceChangePercent}}catch(e){}}

function renderTickers(){var tr=g('tr');if(!tr)return;
tr.innerHTML=Object.keys(A).map(function(k){
  var t=T[k];if(!t||t.p==null)return'<div class="c" style="min-width:90px"><h3>'+k+'</h3><div class="v n">--</div></div>';
  var cl=t.c>=0?'g':'r';
  return'<div class="c" style="min-width:90px;border-left:3px solid '+A[k].c+'"><h3>'+k+'</h3><div class="v '+cl+'">$'+fn(t.p,A[k].d)+'</div><div class="s '+cl+'">'+(t.c>=0?'+':'')+t.c.toFixed(2)+'%</div></div>';
}).join('');}

function renderStats(){var mr=g('sr');if(!mr)return;
var n=0;Object.keys(T).forEach(function(k){if(T[k]&&T[k].p!=null)n++});
mr.innerHTML='<div class="c"><h3>ESTADO</h3><div class="v g">'+n+'/'+Object.keys(A).length+'</div><div class="s">'+(n===Object.keys(A).length?'Conectado a Binance':'Cargando...')+'</div></div>';}

function renderTrades(){var open=realTrades.filter(function(t){return t.estado==='OPEN'});var closed=realTrades.filter(function(t){return t.estado==='CLOSED'});
txt('oc',open.length);txt('cc',closed.length);txt('oc2',open.length);txt('cc2',closed.length);
var w=closed.filter(function(t){return t.rGest>0}).length;var l=closed.filter(function(t){return t.rGest<=0}).length;
var wr=closed.length>0?(w/closed.length*100):null;var rTot=closed.reduce(function(s,t){return s+(t.rGest||0)},0);
var wrEl=g('wr');if(wrEl){wrEl.textContent=wr!=null?wr.toFixed(1)+'%':'--';wrEl.style.color=wr!=null&&wr>=50?'#16a34a':'#dc2626'}
var rtEl=g('rt');if(rtEl){rtEl.textContent=rTot!==0?(rTot>0?'+':'')+rTot.toFixed(2)+'R':'0.00R';rtEl.style.color=rTot>=0?'#16a34a':'#dc2626'}
var ob=g('ob');var oe=g('oe');
if(ob&&oe){if(open.length){ob.style.display='';oe.style.display='none';ob.innerHTML=open.map(function(t){return'<tr><td>'+t.id+'</td><td style="color:'+(t.side==='LONG'?'#16a34a':'#dc2626')+'">'+t.side+'</td><td>$'+fn(t.entry,A[t.asset||'BTC'].d)+'</td><td style="color:#dc2626">$'+fn(t.sl,A[t.asset||'BTC'].d)+'</td><td style="color:#16a34a">$'+fn(t.tp,A[t.asset||'BTC'].d)+'</td><td style="color:#16a34a">+'+((t.high-t.entry)/Math.abs(t.entry-t.sl)*(t.side==='LONG'?1:-1)).toFixed(2)+'R</td><td style="color:#dc2626">'+((t.low-t.entry)/Math.abs(t.entry-t.sl)*(t.side==='LONG'?1:-1)).toFixed(2)+'R</td><td style="color:#64748b">'+t.duration+'</td><td style="font-weight:600;color:'+(t.rActual>=0?'#16a34a':'#dc2626')+'">'+(t.rActual>=0?'+':'')+t.rActual.toFixed(2)+'R</td><td>$'+fn(t.price||t.entry,A[t.asset||'BTC'].d)+'</td></tr>'}).join('');}else{ob.style.display='none';oe.style.display='block'}}
var cb=g('cb');var ce=g('ce');
if(cb&&ce){if(closed.length){cb.style.display='';ce.style.display='none';cb.innerHTML=closed.map(function(t){return'<tr><td>'+t.id+'</td><td><span style="background:rgba('+(t.resultado==='TP'?'22,163,74':'220,38,38')+',0.15);color:'+(t.resultado==='TP'?'#16a34a':'#dc2626')+';padding:1px 8px;border-radius:999px;font-size:9px;font-weight:600">'+t.resultado+'</span></td><td style="color:'+(t.side==='LONG'?'#16a34a':'#dc2626')+'">'+t.side+'</td><td>$'+fn(t.entry,A[t.asset||'BTC'].d)+'</td><td>$'+fn(t.closePrice||t.price,A[t.asset||'BTC'].d)+'</td><td style="color:#16a34a">+'+((t.high-t.entry)/Math.abs(t.entry-t.sl)*(t.side==='LONG'?1:-1)).toFixed(2)+'R</td><td style="color:#dc2626">'+((t.low-t.entry)/Math.abs(t.entry-t.sl)*(t.side==='LONG'?1:-1)).toFixed(2)+'R</td><td style="color:#64748b">'+t.duration+'</td><td style="font-weight:600;color:'+((t.rGest||0)>=0?'#16a34a':'#dc2626')+'">'+((t.rGest||0)>=0?'+':'')+(t.rGest||0).toFixed(2)+'R</td><td style="font-weight:600;color:'+((t.pnlPct||0)>=0?'#16a34a':'#dc2626')+'">'+((t.pnlPct||0)>=0?'+':'')+(t.pnlPct||0).toFixed(2)+'%</td></tr>'}).join('');}else{cb.style.display='none';ce.style.display='block'}}}

function addTrade(price,side,signal,asset){var dPrice=price;var sl=side==='LONG'?dPrice*0.98:dPrice*1.02;var tp=side==='LONG'?dPrice*1.03:dPrice*0.97;realTrades.unshift({id:'T'+(++tid),estado:'OPEN',side:side,entry:dPrice,price:dPrice,sl:sl,tp:tp,low:dPrice,high:dPrice,openTime:new Date().toISOString(),duration:'0m',asset:asset||'BTC',signal:signal||'',rActual:0});renderTrades()}

function updateTrades(){var now=Date.now();realTrades.forEach(function(t){if(t.estado!=='OPEN')return;var ticker=T[t.asset||'BTC'];var cp=ticker&&ticker.p?ticker.p:null;if(!cp)return;t.price=cp;if(cp>t.high)t.high=cp;if(cp<t.low)t.low=cp;var elapsed=Math.floor((now-new Date(t.openTime).getTime())/60000);t.duration=elapsed<60?elapsed+'m':Math.floor(elapsed/60)+'h '+elapsed%60+'m';var rd=Math.abs(t.entry-t.sl);if(rd>0)t.rActual=((cp-t.entry)/rd)*(t.side==='LONG'?1:-1);var hitSL=t.side==='LONG'?cp<=t.sl:cp>=t.sl;var hitTP=t.side==='LONG'?cp>=t.tp:cp<=t.tp;if(hitTP){t.estado='CLOSED';t.resultado='TP';t.closePrice=cp;t.closeTime=new Date().toISOString();var move=(t.closePrice-t.entry)*(t.side==='LONG'?1:-1);t.rGest=rd>0?move/rd:0;t.pnlPct=(move/t.entry)*100}else if(hitSL){t.estado='CLOSED';t.resultado='SL';t.closePrice=cp;t.closeTime=new Date().toISOString();var move2=(t.closePrice-t.entry)*(t.side==='LONG'?1:-1);t.rGest=rd>0?move2/rd:0;t.pnlPct=(move2/t.entry)*100}});renderTrades()}

// Tab switching
setTimeout(function(){var btns=document.querySelectorAll('#tb button');btns.forEach(function(b){b.addEventListener('click',function(){btns.forEach(function(x){x.classList.remove('on')});b.classList.add('on');var t=b.dataset.t;g('openP').style.display=t==='open'?'block':'none';g('closedP').style.display=t==='closed'?'block':'none'})})},2000);

// Load saved trades
try{var s=localStorage.getItem('sono_trades');if(s){realTrades=JSON.parse(s);tid=realTrades.reduce(function(m,t){return Math.max(m,parseInt(t.id.replace('T',''))||0)},100)}renderTrades()}catch(e){}

// Save trades every 10s
setInterval(function(){try{localStorage.setItem('sono_trades',JSON.stringify(realTrades))}catch(e){}},10000);
setInterval(updateTrades,3000);

// Demo trades for testing
setTimeout(function(){if(realTrades.length===0){addTrade(75000,'LONG','SAMPLE','BTC');addTrade(2050,'SHORT','SAMPLE','ETH')}},5000);

async function init(){await Promise.all(Object.keys(A).map(function(k){return lt(k).catch(function(){})}));renderTickers();renderStats();renderTrades();setTimeout(function(){g('ov').classList.add('h');g('app').style.opacity='1'},300)}
init();
</script>
</body>
</html>'''

# Extract JS and verify
start = html.index('<script>') + 8
end = html.index('</script>', start)
js = html[start:end]

tmp = r'C:\Users\sparreno\AppData\Local\Temp\trades_check.js'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(js)

r = subprocess.run(
    'node -e "try{new Function(require(\'fs\').readFileSync(\'C:/Users/sparreno/AppData/Local/Temp/trades_check.js\',\'utf-8\'));console.log(\'OK\')}catch(e){console.log(\'FAIL:\'+e.message.split(\'\\n\')[0]);process.exit(1)}"',
    capture_output=True, text=True, shell=True
)
print('Verify:', r.stdout.strip())

if 'OK' in r.stdout:
    with open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    # Remove app.js if exists
    app_js_path = os.path.join(DST, 'app.js')
    if os.path.exists(app_js_path):
        os.remove(app_js_path)
        print('Removed app.js')
    print(f'Written: {len(html)} bytes')
    print(f'JS: {len(js)} bytes')
else:
    print('ERROR:', r.stderr if r.stderr else '')
