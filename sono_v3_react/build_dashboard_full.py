import subprocess, os, re

DST = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono'

# Build the complete dashboard HTML with ALL features
html = r'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sono Pro — Dashboard Cuantitativo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060a12;color:#e2e8f0;font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
#ov{position:fixed;inset:0;background:#060a12;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:16px}
#ov.h{display:none}
#app{opacity:0;transition:opacity .4s}
.sp{width:34px;height:34px;border:3px solid #1a2a40;border-top:3px solid #16a34a;border-radius:50%;animation:s .8s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.nav{display:flex;gap:6px;padding:14px 18px;background:#0a1628;border-bottom:1px solid #1a2a40;align-items:center;flex-wrap:wrap}
.nav .b{color:#e2e8f0;font-weight:700;font-size:14px;margin-right:20px}
.nav a{color:#64748b;text-decoration:none;padding:5px 16px;border-radius:999px;font-size:12px;font-weight:500;transition:all .15s}
.nav a.a{background:#16a34a20;color:#16a34a}
.r{display:flex;gap:12px;padding:12px 18px;flex-wrap:wrap}
.c{background:#0a1628;border:1px solid #1a2a40;border-radius:12px;padding:16px;flex:1;min-width:140px}
.c h3{color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-weight:500}
.c .v{font-size:24px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace;font-variant-numeric:tabular-nums}
.c .s{color:#64748b;font-size:11px;margin-top:4px}
.g{color:#16a34a}.r{color:#dc2626}.n{color:#64748b}.y{color:#eab308}
.b{color:#14b8a6}
.gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:12px 18px}
.gr2{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:12px 18px}
.ga{background:#0a1628;border:1px solid #1a2a40;border-radius:12px;padding:16px}
.ga h3{color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-weight:500}
.ga .v{font-size:20px;font-weight:600;font-family:'JetBrains Mono',Consolas,monospace;font-variant-numeric:tabular-nums}
.gbar{height:4px;border-radius:2px;margin-top:6px;background:#1a2a40;overflow:hidden}
.gbar_f{height:100%;border-radius:2px;transition:width .4s}
.guage{display:flex;align-items:center;gap:8px;margin:4px 0}
.guage .lbl{color:#64748b;font-size:10px;min-width:70px}
.guage .bar{flex:1;height:4px;border-radius:2px;background:#1a2a40;overflow:hidden}
.guage .bar_f{height:100%;border-radius:2px}
.guage .val{font-family:'JetBrains Mono',monospace;font-size:11px;min-width:40px;text-align:right}
.tf_grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.tf_card{background:#0d1a2e;border:1px solid #1a2a40;border-radius:10px;padding:12px}
.tf_card h4{color:#64748b;font-size:8px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.tf_card .v{font-size:16px;font-weight:600;font-family:'JetBrains Mono',monospace}
.tl{max-height:200px;overflow-y:auto;margin-top:8px}
.tl_item{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5px solid #1a2a4050;font-size:11px}
.tl_time{color:#64748b;font-family:'JetBrains Mono',monospace;min-width:55px;font-size:10px}
.tl_sig{font-weight:600;min-width:90px;font-size:10px}
.tl_score{font-family:'JetBrains Mono',monospace;font-weight:600;min-width:30px;text-align:right;font-size:11px}
.tl_price{color:#64748b;font-family:'JetBrains Mono',monospace;font-size:10px;margin-left:auto}
.tl_empty{color:#64748b;text-align:center;padding:16px;font-size:11px}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:9px;font-weight:600}
.sec_label{color:#94a3b8;font-size:11px;font-weight:500;padding:8px 18px 0;letter-spacing:0.5px}
#scoreRing{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace}
@media(max-width:600px){.r,.gr,.gr2{padding:8px 10px;gap:8px}.c{min-width:calc(50% - 12px)}.tf_grid{grid-template-columns:1fr}.nav{padding:10px 12px}.c .v{font-size:20px}}
@media(min-width:900px){.gr{grid-template-columns:repeat(4,1fr)}.gr2{grid-template-columns:repeat(3,1fr)}}
</style>
</head>
<body>
<div id="ov"><div class="sp"></div><div style="color:#64748b;font-size:13px">Cargando datos desde Binance...</div></div>
<div id="app">
<div class="nav"><span class="b">SONO PRO</span><a href="/">Macro</a><a href="/dashboard_sono/" class="a">Dashboard</a><a href="/trades/">Trades</a></div>

<!-- Tickers -->
<div class="r" id="tr"></div>

<!-- Score Maestro -->
<div class="sec_label">SCORE MAESTRO</div>
<div class="r">
<div class="c" style="min-width:180px;text-align:center"><div id="scoreRing" style="background:rgba(100,116,139,0.1)">--</div><div class="s" id="scoreLabel">Cargando datos...</div></div>
<div class="c"><h3>SEÑAL</h3><div class="v" id="signalTxt" style="font-size:16px">--</div><div class="s" id="signalAction">--</div></div>
<div class="c"><h3>RSI (14)</h3><div class="v" id="rsiVal">--</div><div class="s" id="rsiLabel">--</div></div>
<div class="c"><h3>ADX (14)</h3><div class="v" id="adxVal">--</div><div class="s" id="adxLabel">--</div></div>
</div>
<div class="gr">
<div class="ga"><h3>TREND</h3><div class="v" id="trendVal" style="font-size:14px">--</div><div class="guage" style="margin-top:8px"><span class="lbl">MA6</span><div class="bar"><div class="bar_f" id="ma6bar" style="width:0%;background:#16a34a"></div></div><span class="val" id="ma6Val">--</span></div><div class="guage"><span class="lbl">MA40</span><div class="bar"><div class="bar_f" id="ma40bar" style="width:0%;background:#eab308"></div></div><span class="val" id="ma40Val">--</span></div><div class="guage"><span class="lbl">MA70</span><div class="bar"><div class="bar_f" id="ma70bar" style="width:0%;background:#14b8a6"></div></div><span class="val" id="ma70Val">--</span></div></div>
<div class="ga"><h3>PILARES</h3><div id="pilares"><div class="guage"><span class="lbl">Tendencia</span><div class="bar"><div class="bar_f" id="pb1" style="width:0%;background:#16a34a"></div></div><span class="val" id="pv1">--/45</span></div><div class="guage"><span class="lbl">M. Interno</span><div class="bar"><div class="bar_f" id="pb2" style="width:0%;background:#eab308"></div></div><span class="val" id="pv2">--/30</span></div><div class="guage"><span class="lbl">Precio</span><div class="bar"><div class="bar_f" id="pb3" style="width:0%;background:#f59e0b"></div></div><span class="val" id="pv3">--/35</span></div></div></div>
<div class="ga"><h3>RANGO</h3><div class="v" id="rangeZone" style="font-size:14px;color:#64748b">--</div><div class="s" style="margin-top:6px">Zona: <span id="rangeLabel">--</span></div><div class="s">Sweeps: <span id="sweepCount" style="font-family:'JetBrains Mono',monospace">0</span></div></div>
</div>

<!-- Range Intelligence Multi-TF -->
<div class="sec_label">RANGE INTELLIGENCE</div>
<div class="gr2" id="tfGrid"></div>

<!-- Timeline -->
<div class="sec_label">TIMELINE DE SEÑALES</div>
<div class="r"><div class="c" style="flex:3;min-width:280px"><div class="tl" id="timeline"><div class="tl_empty">Esperando primera señal…</div></div></div></div>
</div>

<script>
var A={BTC:{s:'BTCUSDT',d:2,c:'#F7931A'},ETH:{s:'ETHUSDT',d:2,c:'#627EEA'},SOL:{s:'SOLUSDT',d:3,c:'#9945FF'},XRP:{s:'XRPUSDT',d:4,c:'#00AAE4'}};
var U='https://api.binance.com/api/v3';
var T={},active='BTC',sigLog=[],tfIntervals=['1m','3m','5m','15m'],tfData={},scanTimer=null;

function fn(n,d){if(n==null)return'--';return Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function g(id){return document.getElementById(id)}
function txt(id,t){var e=g(id);if(e)e.textContent=t}
function htm(id,h){var e=g(id);if(e)e.innerHTML=h}

function calcMA(arr,p){if(!arr||arr.length<p)return null;var s=0;for(var i=arr.length-p;i<arr.length;i++)s+=arr[i];return s/p}
function calcRSI(closes,p){if(!p)p=14;if(!closes||closes.length<=p)return null;var g=0,l=0;for(var i=closes.length-p;i<closes.length;i++){var d=closes[i]-closes[i-1];if(d>0)g+=d;else l-=d}var ag=g/p,al=l/p;if(al===0)return 100;return Math.round((100-100/(1+ag/al))*100)/100}
function calcBB(closes,p,m){if(!p)p=20;if(!m)m=2;if(!closes||closes.length<p)return null;var sl=closes.slice(-p),ma=sl.reduce(function(s,v){return s+v},0)/p,std=Math.sqrt(sl.reduce(function(s,v){return s+(v-ma)**2},0)/p);return{u:ma+m*std,m:ma,l:ma-m*std}}
function calcATR(candles,p){if(!p)p=14;if(!candles||candles.length<p+1)return null;var sl=candles.slice(-(p+1)),sum=0;for(var i=1;i<sl.length;i++){var c=sl[i],pv=sl[i-1];sum+=Math.max(c.high-c.low,Math.abs(c.high-pv.close),Math.abs(c.low-pv.close))}return sum/p}
function calcADX(candles,p){if(!p)p=14;if(!candles||candles.length<p*2)return null;var sl=candles.slice(-(p*2)),dmP=0,dmM=0,tr=0;for(var i=1;i<sl.length;i++){var c=sl[i],pv=sl[i-1],up=c.high-pv.high,dn=pv.low-c.low;dmP+=up>dn&&up>0?up:0;dmM+=dn>up&&dn>0?dn:0;tr+=Math.max(c.high-c.low,Math.abs(c.high-pv.close),Math.abs(c.low-pv.close))}if(tr===0)return 0;var diP=(dmP/tr)*100,diM=(dmM/tr)*100;return Math.round(Math.abs(diP-diM)/(diP+diM+0.001)*1000)/10}

function computeScore(candles){
  if(!candles||candles.length<210)return null;
  var closes=candles.map(function(c){return c.close}),price=closes[closes.length-1];
  var ma6=calcMA(closes,6),ma40=calcMA(closes,40),ma70=calcMA(closes,70),ma200=calcMA(closes,200);
  var bb=calcBB(closes,20),adx=calcADX(candles,14),atr=calcATR(candles,14),rsi=calcRSI(closes,14);
  var p1=0;
  if(ma6!==null&&ma40!==null&&ma70!==null){
    if(ma6>ma40){p1=25;if(ma40>ma70)p1=35;if(ma6>ma70)p1=45}else{p1=5;if(ma40<ma70)p1=0}
  }
  var p2=10;
  if(adx!==null&&rsi!==null){var trend=adx>25?1:0;p2=trend?(rsi>55?30:rsi<45?5:20):(rsi>55?20:rsi<45?10:15)}
  var p3=10;
  if(bb!==null&&price!==null){var pctB=(price-bb.l)/(bb.u-bb.l);p3=pctB<0.2?35:pctB<0.4?25:pctB<0.6?15:pctB<0.8?10:5}
  var total=Math.min(100,Math.max(0,p1+p2+p3));
  var signal='NEUTRAL',decision='ESPERAR';
  if(total>=78){signal='COMPRA FUERTE';decision='LONG'}else if(total>=62){signal='COMPRA';decision='LONG'}else if(total>=52){signal='ACUMULACION';decision='LONG DEBIL'}else if(total>=42){signal='NEUTRAL';decision='ESPERAR'}else if(total>=30){signal='DISTRIBUCION';decision='SHORT DEBIL'}else if(total>=18){signal='VENTA';decision='SHORT'}else{signal='CAPITULACION';decision='SHORT'}
  if(rsi!==null&&rsi<28&&total<52){signal='CAPITULACION';decision='SHORT'}
  if(rsi!==null&&rsi>72&&total>=62){signal='COMPRA FUERTE';decision='LONG'}
  return{total:Math.round(total),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),ma6:ma6,ma40:ma40,ma70:ma70,ma200:ma200,rsi:rsi,adx:adx,atr:atr,bb:bb,signal:signal,decision:decision,price:price}
}

function rangeAnal(candles,tf){
  if(!candles||candles.length<50)return null;
  var closes=candles.map(function(c){return c.close});
  var highs=candles.map(function(c){return c.high});
  var lows=candles.map(function(c){return c.low});
  var price=closes[closes.length-1];
  var hi=Math.max.apply(null,highs.slice(-50));
  var lo=Math.min.apply(null,lows.slice(-50));
  var rng=hi-lo;
  if(rng===0)return{zone:'MID',pct:50,hi:hi,lo:lo,rng:rng,vol:0,pressure:'NEUTRAL',sweeps:0};
  var pct=((price-lo)/rng)*100;
  var zone=pct>80?'HIGH':pct<20?'LOW':'MID';
  var vol=candles.slice(-20).reduce(function(s,c){return s+c.volume},0)/20;
  var volChg=vol>0?candles.slice(-20).reduce(function(s,c){return s+c.volume},0)/candles.slice(-40,-20).reduce(function(s,c){return s+c.volume||0.001},0):1;
  var pressure=volChg>1.5?'ALTA VOL':'NORMAL';
  if(pct<20&&volChg>1.3)pressure='LIQUIDEZ BAJA';
  if(pct>80&&volChg>1.3)pressure='LIQUIDEZ ALTA';
  var sweeps=0;
  for(var i=Math.max(0,candles.length-50);i<candles.length;i++){
    if(candles[i].low<lo+candles[i].low*0.001||candles[i].high>hi-candles[i].high*0.001)sweeps++
  }
  return{zone:zone,pct:pct,hi:hi,lo:lo,rng:rng,vol:vol,pressure:pressure,sweeps:sweeps,price:price}
}

async function lt(k){try{var r=await fetch(U+'/ticker/24hr?symbol='+A[k].s,{signal:AbortSignal.timeout(8e3)});var d=await r.json();T[k]={p:+d.lastPrice,c:+d.priceChangePercent}}catch(e){}}

async function lc(k){try{var r=await fetch(U+'/klines?symbol='+A[k].s+'&interval=3m&limit=400',{signal:AbortSignal.timeout(10e3)});var raw=await r.json();return raw.map(function(kk){return{time:+kk[0],open:+kk[1],high:+kk[2],low:+kk[3],close:+kk[4],volume:+kk[5]}})}catch(e){return null}}

async function lcTF(k,tf){try{var r=await fetch(U+'/klines?symbol='+A[k].s+'&interval='+tf+'&limit=80',{signal:AbortSignal.timeout(8e3)});var raw=await r.json();return raw.map(function(kk){return{time:+kk[0],open:+kk[1],high:+kk[2],low:+kk[3],close:+kk[4],volume:+kk[5]}})}catch(e){return null}}

function renderTickers(){var tr=g('tr');if(!tr)return;
tr.innerHTML=Object.keys(A).map(function(k){
  var t=T[k];if(!t||t.p==null)return'<div class="c" style="min-width:100px"><h3>'+k+'</h3><div class="v n">--</div><div class="s n">--</div></div>';
  var cl=t.c>=0?'g':'r';
  return'<div class="c" style="min-width:100px;border-left:3px solid '+A[k].c+'"><h3>'+k+'</h3><div class="v '+cl+'">$'+fn(t.p,A[k].d)+'</div><div class="s '+cl+'">'+(t.c>=0?'+':'')+t.c.toFixed(2)+'%</div></div>';
}).join('');}

function renderScore(score){
  if(!score){g('scoreRing').textContent='--';g('scoreRing').style.background='rgba(100,116,139,0.1)';txt('scoreLabel','Cargando...');txt('signalTxt','--');txt('signalAction','--');txt('rsiVal','--');txt('rsiLabel','--');txt('adxVal','--');txt('adxLabel','--');return}
  var scCol=score.total>=78?'#16a34a':score.total>=62?'#22c55e':score.total>=52?'#eab308':score.total>=42?'#eab308':score.total>=30?'#dc2626':'#b91c1c';
  var ring=g('scoreRing');ring.textContent=score.total;ring.style.background='radial-gradient(circle at center, #0a1628 55%, transparent 60%), conic-gradient('+scCol+' 0%, '+scCol+' '+(score.total*3.6)+'deg, #1a2a40 '+(score.total*3.6)+'deg)';
  txt('scoreLabel','Score Maestro');
  txt('signalTxt',score.signal);g('signalTxt').style.color=scCol;
  txt('signalAction',score.decision);
  txt('rsiVal',score.rsi!=null?score.rsi:'--');var rEl=g('rsiLabel');if(rEl){rEl.textContent=score.rsi!=null?(score.rsi>70?'SOBRECOMPRA':score.rsi<30?'SOBREVENTA':'NEUTRAL'):'--';rEl.style.color=score.rsi!=null?(score.rsi>70?'#dc2626':score.rsi<30?'#16a34a':'#64748b'):'#64748b'}
  txt('adxVal',score.adx!=null?score.adx:'--');var aEl=g('adxLabel');if(aEl){aEl.textContent=score.adx!=null?(score.adx>25?'TREND':'RANGO'):'--';aEl.style.color=score.adx!=null?(score.adx>25?'#eab308':'#64748b'):'#64748b'}
  // Trend bars
  if(score.ma6!=null&&score.ma40!=null){var p6=score.ma6/score.ma40*100;var p40=100;var p70=score.ma70!=null?score.ma70/score.ma40*100:100;var maxP=Math.max(p6,p40,p70);p6=(p6/maxP)*100;p40=(p40/maxP)*100;p70=(p70/maxP)*100;g('ma6bar').style.width=p6+'%';g('ma40bar').style.width=p40+'%';g('ma70bar').style.width=p70+'%';var bar6=g('ma6bar');bar6.style.background=score.ma6>score.ma40?'#16a34a':'#dc2626'}else{g('ma6bar').style.width='0%';g('ma40bar').style.width='0%';g('ma70bar').style.width='0%'}
  txt('ma6Val',score.ma6!=null?'$'+fn(score.ma6,2):'--');txt('ma40Val',score.ma40!=null?'$'+fn(score.ma40,2):'--');txt('ma70Val',score.ma70!=null?'$'+fn(score.ma70,2):'--')
  // Pilares
  g('pb1').style.width=(score.p1/45*100)+'%';txt('pv1',score.p1+'/45');g('pb2').style.width=(score.p2/30*100)+'%';txt('pv2',score.p2+'/30');g('pb3').style.width=(score.p3/35*100)+'%';txt('pv3',score.p3+'/35')
  // Trend text
  txt('trendVal',score.ma6!=null&&score.ma40!=null?(score.ma6>score.ma40?'ALCISTA':'BAJISTA'):'--');g('trendVal').style.color=score.ma6!=null?(score.ma6>score.ma40?'#16a34a':'#dc2626'):'#64748b'
}

function renderRange(candles){
  var ra=rangeAnal(candles,'3m');
  if(!ra){txt('rangeZone','--');txt('rangeLabel','--');txt('sweepCount','0');return}
  txt('rangeZone',ra.zone+' ('+Math.round(ra.pct)+'%)');
  txt('rangeLabel',ra.pressure);
  txt('sweepCount',ra.sweeps);
  g('rangeZone').style.color=ra.zone==='HIGH'?'#dc2626':ra.zone==='LOW'?'#16a34a':'#64748b'
}

async function renderTFGrid(){
  var grid=g('tfGrid');if(!grid)return;
  var html='';
  for(var i=0;i<tfIntervals.length;i++){
    var tf=tfIntervals[i];
    var cdl=tfData[tf];
    var ra=cdl?rangeAnal(cdl,tf):null;
    var sc=cdl?computeScore(cdl):null;
    html+='<div class="ga"><h3>'+tf+'</h3>';
    if(ra){
      var zc=ra.zone==='HIGH'?'#dc2626':ra.zone==='LOW'?'#16a34a':'#64748b';
      html+='<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
      html+='<span class="v" style="font-size:14px;color:'+zc+'">Zona '+ra.zone+'</span>';
      html+='<span class="v" style="font-size:14px">'+Math.round(ra.pct)+'%</span></div>';
      html+='<div class="guage"><span class="lbl">Presión</span><span class="val" style="color:'+(ra.pressure==='ALTA VOL'?'#eab308':ra.pressure==='LIQUIDEZ BAJA'||ra.pressure==='LIQUIDEZ ALTA'?'#dc2626':'#64748b')+'">'+ra.pressure+'</span></div>';
      html+='<div class="guage"><span class="lbl">Sweeps</span><span class="val">'+ra.sweeps+'</span></div>';
      if(sc)html+='<div class="guage"><span class="lbl">Score</span><span class="val" style="font-weight:600;color:'+(sc.total>=62?'#16a34a':sc.total<=30?'#dc2626':'#eab308')+'">'+sc.total+' ('+sc.signal.substring(0,8)+')</span></div>';
    }else{html+='<div class="tl_empty" style="padding:8px">Cargando...</div>'}
    html+='</div>'
  }
  htm('tfGrid',html);
}

function addSignal(score){
  if(!score)return;
  var sig={id:Date.now(),time:new Date(),asset:active,signal:score.signal,decision:score.decision,score:score.total,price:score.price};
  sigLog=[sig].concat(sigLog).slice(0,50);
  try{localStorage.setItem('sono_signals',JSON.stringify(sigLog))}catch(e){}
  renderTimeline()
}

function renderTimeline(){
  var tl=g('timeline');if(!tl)return;
  if(!sigLog.length){htm('timeline','<div class="tl_empty">Esperando primera señal...</div>');return}
  htm('timeline',sigLog.map(function(s,i){
    var c=s.signal.includes('COMPRA')||s.signal.includes('ACUMU')?'#16a34a':s.signal.includes('VENTA')||s.signal.includes('CAPIT')||s.signal.includes('DIST')?'#dc2626':'#64748b';
    var t=new Date(s.time).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    var p=s.price?'$'+fn(s.price,A[s.asset]?.d||2):'';
    return'<div class="tl_item" style="border-left:2px solid '+c+';padding-left:6px"><span class="tl_time">'+t+'</span><span class="tl_sig" style="color:'+c+'">'+s.signal+'</span><span class="tl_score" style="color:'+c+'">'+s.score+'</span><span class="tl_price">'+p+'</span></div>'
  }).join(''))
}

async function scan(){
  var candles3m=await lc(active);
  if(candles3m){
    var score=computeScore(candles3m);
    renderScore(score);
    renderRange(candles3m);
    if(score&&(!window.lastSig||window.lastSig.signal!==score.signal)){window.lastSig=score;addSignal(score)}
  }
  // Load TF data
  for(var i=0;i<tfIntervals.length;i++){
    var tf=tfIntervals[i];
    var cdl=await lcTF(active,tf);
    if(cdl)tfData[tf]=cdl
  }
  renderTFGrid()
}

async function init(){
  await Promise.all(Object.keys(A).map(function(k){return lt(k).catch(function(){})}));
  renderTickers();
  // Load saved signals
  try{var s=localStorage.getItem('sono_signals');if(s){sigLog=JSON.parse(s);renderTimeline()}}catch(e){}
  // First scan
  await scan();
  // Periodic scan every 30s
  scanTimer=setInterval(scan,30000);
  setTimeout(function(){g('ov').classList.add('h');g('app').style.opacity='1'},300)
}
init();
</script>
</body>
</html>'''

# Verify JS syntax
start = html.index('<script>') + 8
end = html.index('</script>', start)
js = html[start:end]

tmp = r'C:\Users\sparreno\AppData\Local\Temp\dashboard_full.js'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(js)

r = subprocess.run(
    'node -e "try{new Function(require(\'fs\').readFileSync(\'C:/Users/sparreno/AppData/Local/Temp/dashboard_full.js\',\'utf-8\'));console.log(\'OK\')}catch(e){console.log(\'FAIL:\'+e.message.split(\'\\n\')[0]);process.exit(1)}"',
    capture_output=True, text=True, shell=True
)
print('Verify:', r.stdout.strip())

if 'OK' in r.stdout:
    with open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Written: {len(html)} bytes, JS: {len(js)} bytes')
else:
    print('ERROR:', r.stderr if r.stderr else '')
    # Show first 500 chars of JS around error
    js_file = r'C:\Users\sparreno\AppData\Local\Temp\dashboard_full.js'
    with open(js_file, 'r') as f: content = f.read()
    print('JS first 80:', repr(content[:80]))
