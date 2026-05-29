import subprocess, json, os

# Build HTML
html = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Metodo Sono Pro — Dashboard Hibrido</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060a12;color:#e2e8f0;font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh}
#loadOverlay{position:fixed;inset:0;background:#060a12;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:16px;font-family:system-ui,sans-serif}
#loadOverlay.hidden{display:none}
#app{opacity:0;transition:opacity .5s}
.spinner{width:36px;height:36px;border:3px solid #1a2a40;border-top-color:#16a34a;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.nav{display:flex;gap:6px;padding:14px 18px;background:#0a1628;border-bottom:1px solid #1a2a40;align-items:center;flex-wrap:wrap}
.nav .brand{color:#e2e8f0;font-weight:700;font-size:14px;margin-right:20px}
.nav a{color:#64748b;text-decoration:none;padding:5px 16px;border-radius:999px;font-size:12px;font-weight:500;transition:all .2s}
.nav a.active{background:#16a34a18;color:#16a34a}
.row{display:flex;gap:12px;padding:12px 18px;flex-wrap:wrap}
.card{background:#0a1628;border:1px solid #1a2a40;border-radius:14px;padding:16px 18px;flex:1;min-width:150px}
.card h3{color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;font-weight:500}
.card .val{font-size:22px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace}
.card .sub{color:#64748b;font-size:11px;margin-top:4px}
.card .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:600;margin-top:6px}
.green{color:#16a34a}.red{color:#dc2626}.gold{color:#c9a84c}
.neutral{color:#64748b}.teal{color:#14b8a6}
@media(max-width:600px){.card{min-width:calc(50% - 12px)}.row{padding:8px 10px;gap:8px}.nav{padding:10px 12px}}
</style>
</head>
<body>
<div id="loadOverlay"><div class="spinner"></div><div style="color:#64748b;font-size:13px">Cargando datos desde Binance...</div></div>
<div id="app">
<div class="nav"><span class="brand">SONO PRO</span><a href="/">Macro</a><a href="/dashboard_sono/" class="active">Dashboard</a><a href="/trades/">Trades</a></div>
<div class="row" id="tickerRow"></div>
<div class="row" id="macroRow"></div>
</div>
<script>
var ASSETS_CFG={BTC:{sym:'BTCUSDT',dec:2,col:'#F7931A'},ETH:{sym:'ETHUSDT',dec:2,col:'#627EEA'},SOL:{sym:'SOLUSDT',dec:3,col:'#9945FF'},XRP:{sym:'XRPUSDT',dec:4,col:'#00AAE4'}};
var API='https://api.binance.com/api/v3';
var tickers={},activeAsset='BTC';

function fmt(n,d){if(n==null)return'--';return Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function el(id,txt){var e=document.getElementById(id);if(e)e.textContent=txt}
function elH(id,html){var e=document.getElementById(id);if(e)e.innerHTML=html}

var calcMA=function(arr,p){if(arr.length<p)return null;var s=0;for(var i=arr.length-p;i<arr.length;i++)s+=arr[i];return s/p};
var calcRSI=function(closes,p){if(!p)p=14;if(closes.length<=p)return null;var gains=0,losses=0;for(var i=closes.length-p;i<closes.length;i++){var d=closes[i]-closes[i-1];if(d>0)gains+=d;else losses-=d}var ag=gains/p,al=losses/p;if(al===0)return 100;return Math.round((100-100/(1+ag/al))*100)/100};
var calcBB=function(closes,p,m){if(!p)p=20;if(!m)m=2;if(closes.length<p)return null;var ma=calcMA(closes,p);var sum=0;for(var i=closes.length-p;i<closes.length;i++)sum+=(closes[i]-ma)*(closes[i]-ma);var std=Math.sqrt(sum/p);return{upper:ma+m*std,middle:ma,lower:ma-m*std}};
var calcATR=function(candles,p){if(!p)p=14;if(candles.length<p+1)return null;var sum=0;for(var i=candles.length-p;i<candles.length;i++){var c=candles[i],pr=candles[i-1];sum+=Math.max(c.high-c.low,Math.abs(c.high-pr.close),Math.abs(c.low-pr.close))}return sum/p};
var calcADX=function(candles,p){if(!p)p=14;if(candles.length<p*2)return null;var dmP=0,dmM=0,tr=0;for(var i=candles.length-p*2+1;i<candles.length;i++){var c=candles[i],pv=candles[i-1];var up=c.high-pv.high,dn=pv.low-c.low;dmP+=up>dn&&up>0?up:0;dmM+=dn>up&&dn>0?dn:0;tr+=Math.max(c.high-c.low,Math.abs(c.high-pv.close),Math.abs(c.low-pv.close))}if(tr===0)return 0;var diP=(dmP/tr)*100,diM=(dmM/tr)*100;return Math.round(Math.abs(diP-diM)/(diP+diM+0.001)*1000)/10};

var computeScore=function(candles){if(!candles||candles.length<210)return null;var closes=candles.map(function(c){return c.close}),price=closes[closes.length-1];var ma6=calcMA(closes,6),ma40=calcMA(closes,40),ma70=calcMA(closes,70),ma200=calcMA(closes,200);var bb=calcBB(closes,20),adx=calcADX(candles,14),atr=calcATR(candles,14),rsi=calcRSI(closes,14);var maCross=ma6!==null&&ma40!==null&&ma70!==null;var p1=0;if(maCross&&ma6>ma40){p1=25;if(ma40>ma70)p1=35;if(ma6>ma70)p1=45}else if(maCross&&ma6<ma40){p1=5;if(ma40<ma70)p1=0;if(ma6<ma70)p1=0}var p2=10;if(adx!==null&&rsi!==null){var trend=adx>25?1:0;p2=trend?(rsi>55?30:rsi<45?5:20):(rsi>55?20:rsi<45?10:15)}var p3=10;if(bb!==null&&price!==null){var pctB=(price-bb.lower)/(bb.upper-bb.lower);p3=pctB<0.2?35:pctB<0.4?25:pctB<0.6?15:pctB<0.8?10:5}var total=Math.min(100,Math.max(0,p1+p2+p3));var overbuy=rsi!==null&&rsi>72;var oversell=rsi!==null&&rsi<28;var signal='NEUTRAL',decision='ESPERAR';if(total>=78){signal='COMPRA FUERTE';decision='LONG'}else if(total>=62){signal='COMPRA';decision='LONG'}else if(total>=52){signal='ACUMULACION';decision='LONG DEBIL'}else if(total>=42){signal='NEUTRAL';decision='ESPERAR'}else if(total>=30){signal='DISTRIBUCION';decision='SHORT DEBIL'}else if(total>=18){signal='VENTA';decision='SHORT'}else{signal='CAPITULACION';decision='SHORT'}if(oversell&&total<52)signal='CAPITULACION';if(overbuy&&total>=62)signal='COMPRA FUERTE';return{total:Math.round(total),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),ma6:ma6,ma40:ma40,ma70:ma70,ma200:ma200,rsi:rsi,adx:adx,atr:atr,bb:bb,signal:signal,decision:decision,price:price}};

async function loadTicker(k){try{var r=await fetch(API+'/ticker/24hr?symbol='+ASSETS_CFG[k].sym,{signal:AbortSignal.timeout(8000)});var d=await r.json();tickers[k]={price:+d.lastPrice,change:+d.priceChangePercent,high:+d.highPrice,low:+d.lowPrice,vol:+d.quoteVolume}}catch(e){tickers[k]={price:null,change:null}}}
async function loadCandles(k){try{var r=await fetch(API+'/klines?symbol='+ASSETS_CFG[k].sym+'&interval=3m&limit=400',{signal:AbortSignal.timeout(10000)});var raw=await r.json();return raw.map(function(kk){return{time:+kk[0],open:+kk[1],high:+kk[2],low:+kk[3],close:+kk[4],volume:+kk[5]}})}catch(e){return null}}

function renderAll(){
  var row=document.getElementById('tickerRow');if(!row)return;
  row.innerHTML=Object.keys(ASSETS_CFG).map(function(k){
    var t=tickers[k];if(!t||t.price==null)return'<div class="card" style="min-width:100px"><h3>'+k+'</h3><div class="val neutral">--</div><div class="sub neutral">--</div></div>';
    var c=t.change>=0?'green':'red';
    return'<div class="card" style="min-width:100px;border-left:3px solid '+ASSETS_CFG[k].col+'"><h3>'+k+'</h3><div class="val '+c+'">$'+fmt(t.price,ASSETS_CFG[k].dec)+'</div><div class="sub '+c+'">'+(t.change>=0?'+':'')+t.change.toFixed(2)+'%</div></div>';
  }).join('');
  
  var mr=document.getElementById('macroRow');if(!mr)return;
  var loaded=0;Object.keys(tickers).forEach(function(k){if(tickers[k]&&tickers[k].price!=null)loaded++});
  mr.innerHTML='<div class="card" style="min-width:200px"><h3>ACTIVOS</h3><div class="val green">'+loaded+'/'+Object.keys(ASSETS_CFG).length+'</div><div class="sub">'+(loaded===Object.keys(ASSETS_CFG).length?'Conectado a Binance':'Cargando...')+'</div></div>';
}

async function init(){
  await Promise.all(Object.keys(ASSETS_CFG).map(function(k){return loadTicker(k).catch(function(){})}));
  renderAll();
  setTimeout(function(){
    document.getElementById('loadOverlay').classList.add('hidden');
    document.getElementById('app').style.opacity='1';
  },300);
}
init();
</script>
</body>
</html>
"""

# Extract JS and verify syntax
start = html.index('<script>') + 8
end = html.index('</script>', start)
js = html[start:end]

# Write temp file
with open(r'C:\Users\sparreno\AppData\Local\Temp\dash_verify.js', 'w', encoding='utf-8') as f:
    f.write(js)

# Verify with Node
result = subprocess.run(
    ['node', '-e', 'try{new Function(require("fs").readFileSync("C:/Users/sparreno/AppData/Local/Temp/dash_verify.js","utf-8"));console.log("OK");}catch(e){console.log("ERROR:"+e.message.split("\\n")[0]);process.exit(1);}'],
    capture_output=True, text=True, shell=True
)
print('JS verify:', result.stdout.strip())

if 'OK' in result.stdout:
    # Write final HTML
    with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Written:', len(html), 'bytes')
else:
    print('SYNTAX ERROR!')
    print(result.stdout)
    print(result.stderr)
    print('JS first 100 chars:', js[:100])
