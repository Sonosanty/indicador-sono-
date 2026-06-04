/* SONO PRO — SPA Controller + View Controllers */
"use strict";

// ============================================================
// SPA NAVIGATION
// ============================================================
window.SPA = (function() {
  var cp = null;
  function show(page, el) {
    if (cp === 'metodo') { if (window.cleanupMetodo) cleanupMetodo(); }
    else if (cp === 'rangos') { if (window.cleanupRangos) cleanupRangos(); }
    else if (cp === 'trades') { if (window.cleanupTrades) cleanupTrades(); }
    document.querySelectorAll('.page-panel').forEach(function(p){ p.classList.remove('active'); });
    var pn = document.getElementById('page-' + page);
    if (pn) pn.classList.add('active');
    document.querySelectorAll('.nav-links a').forEach(function(a){ a.classList.remove('active'); });
    if (el) el.classList.add('active');
    var f = document.getElementById('globalFooter');
    if (f) f.style.display = (page === 'dashboard') ? 'block' : 'none';
    cp = page;
    if (page === 'metodo' && window.initMetodo) { setTimeout(initMetodo, 50); }
    else if (page === 'rangos' && window.initRangos) { setTimeout(initRangos, 50); }
    else if (page === 'trades' && window.initTrades) { setTimeout(initTrades, 50); }
  }
  function changeAsset(asset, btn) {
    var abs = document.querySelectorAll('#rt .ab button');
    if (abs.length > 0) {
      abs.forEach(function(b){ if (b.getAttribute('data-a') === asset) b.click(); });
      return;
    }
    if (window.CA !== undefined) {
      window.CA = asset;
      document.querySelectorAll('.asset-tab').forEach(function(t){ t.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      if (window.fetchAll) fetchAll();
    }
  }
  return { show: show, changeAsset: changeAsset, getPage: function(){ return cp; } };
})();

// ============================================================
// METODO VIEW
// ============================================================
var METODO_INTERVAL = null;
var METODO_FETCHING = false;
var METODO = {};
(function() {
  var coin = 'BTC', tf = '3m', fng = 50, dom = 55;
  function $(id) { return document.getElementById(id); }
  function fmtP(n) { return n == null ? '--' : '$' + Number(n).toLocaleString('es-ES',{maximumFractionDigits:2}); }
  function fetchJ(url) { return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();}); }
  function smaLast(arr, p) { if (arr.length < p) return null; return arr.slice(-p).reduce(function(a,b){return a+b;},0)/p; }
  function rsiLast(cl, p) {
    if (cl.length < p+1) return null; var g=0,l=0;
    for (var i=cl.length-p; i<cl.length; i++) { var d=cl[i]-cl[i-1]; d>0 ? g+=d : l-=d; }
    return Math.round(100 - 100 / (1 + (g/p) / ((l/p)||0.001)));
  }
  function adxLast(hi, lo, cl, p) {
    if (cl.length < p+2) return null; var pd=0,md=0,tr=0;
    for (var i=cl.length-p; i<cl.length; i++) {
      var pH=hi[i]-hi[i-1], mL=lo[i-1]-lo[i];
      pd += (pH>mL&&pH>0?pH:0); md += (mL>pH&&mL>0?mL:0);
      tr += Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1]));
    }
    var pDI = 100*pd/(tr||1), mDI = 100*md/(tr||1);
    return Math.round(100*Math.abs(pDI-mDI)/((pDI+mDI)||1));
  }
  function bbLast(cl, p, k) {
    if (arguments.length<2) p=20; if (arguments.length<3) k=2;
    if (cl.length<p) return {pb:null,bw:null};
    var sl = cl.slice(-p), m = sl.reduce(function(a,b){return a+b;},0)/p;
    var sd = Math.sqrt(sl.reduce(function(a,b){return a+(b-m)*(b-m);},0)/p);
    var u = m+k*sd, d = m-k*sd;
    return {pb:+((cl[cl.length-1]-d)/((u-d)||1)).toFixed(3), bw:+((u-d)/m*100).toFixed(2)};
  }
  function computeScore(cl, hi, lo) {
    var price = cl[cl.length-1], ma6 = smaLast(cl,6), ma40=smaLast(cl,40), ma70=smaLast(cl,70), ma200=smaLast(cl,200);
    var p1=0, p2=0, p3=0;
    if (ma6!=null&&ma40!=null) p1 += ma6>ma40?12:0;
    if (ma6!=null&&ma70!=null) p1 += ma6>ma70?10:0;
    if (ma40!=null&&ma200!=null) p1 += ma40>ma200?13:0;
    var rv=rsiLast(cl), av=adxLast(hi,lo,cl);
    if (av!=null) p2 += av>35?15:av>25?10:3;
    if (rv!=null) p2 += rv>=50&&rv<70?12:rv>=35?7:2;
    if (ma200!=null) p2 += price>ma200?8:0;
    var bb=bbLast(cl);
    if (bb.pb!=null) { if (bb.pb<0.15) p3=28; else if (bb.pb<0.35) p3=20; else if (bb.pb<0.65) p3=14; else if (bb.pb<0.85) p3=7; else p3=2; }
    return {score:Math.min(100,Math.round(p1+p2+p3)), p1:Math.round(p1), p2:Math.round(p2), p3:Math.round(p3), ma6:ma6, ma40:ma40, ma70:ma70, ma200:ma200, price:price, rv:rv, av:av, pb:bb.pb};
  }
  function zoneColor(s) { return s>=78?'#4f8ef7':s>=62?'#22c55e':s>=52?'#86efac':s>=42?'#64748b':s>=30?'#f59e0b':s>=18?'#fca5a5':'#ef4444'; }
  function zoneLabel(s) { return s>=78?['Compra fuerte','LONG']:s>=62?['Compra','LONG prudente']:s>=52?['Acumular','Parcial']:s>=42?['Neutral','Esperar']:s>=30?['Venta','SHORT']:s>=18?['Venta fuerte','SHORT']:['Capitulacion','CASH']; }
  function renderScore(d) {
    var col=zoneColor(d.score), circ=408, arc=$( 'ringArc' );
    if (arc) { arc.style.strokeDashoffset=circ-circ*d.score/100; arc.style.stroke=col; }
    var sn=$( 'scoreNum' ); if(sn){ sn.textContent=d.score; sn.style.color=col; }
    var lbl=zoneLabel(d.score);
    var ss=$( 'scoreState' ); if(ss){ ss.textContent=lbl[0]; ss.style.color=col; }
    var sz=$( 'scoreZone' ); if(sz) sz.textContent=lbl[1];
    var p1=$( 'p1pts' ); if(p1) p1.textContent=d.p1+'/35'; var p1b=$( 'p1bar' ); if(p1b) p1b.style.width=(d.p1/35*100)+'%';
    var p2=$( 'p2pts' ); if(p2) p2.textContent=d.p2+'/35'; var p2b=$( 'p2bar' ); if(p2b) p2b.style.width=(d.p2/35*100)+'%';
    var p3=$( 'p3pts' ); if(p3) p3.textContent=d.p3+'/30'; var p3b=$( 'p3bar' ); if(p3b) p3b.style.width=(d.p3/30*100)+'%';
  }
  function renderSignals(d) {
    function s(id,ok){var e=$(id);if(e)e.style.background=ok?'var(--green)':'var(--dim)';}
    s('d_ma6x70',d.ma6!=null&&d.ma70!=null&&d.ma6>d.ma70);
    s('d_ma40',d.price!=null&&d.ma40!=null&&d.price>d.ma40);
    s('d_ma200',d.price!=null&&d.ma200!=null&&d.price>d.ma200);
    s('d_adx',d.av!=null&&d.av>25);
    s('d_rsi',d.rv!=null&&d.rv>50);
    s('d_bb',d.pb!=null&&d.pb>0.2&&d.pb<0.8);
  }
  function renderMacro(fv, dv) {
    if (fv!=null){fng=fv;dom=dv||dom;}
    var mf=$( 'mFNG' ); if(mf) mf.textContent=fng;
    var mfb=$( 'mFNGb' ); if(mfb) mfb.style.width=(fng/100*100)+'%';
    var md=$( 'mDOM' ); if(md) md.textContent=(dom||55).toFixed(1)+'%';
    var mdb=$( 'mDOMb' ); if(mdb) mdb.style.width=Math.min(dom||55,80)+'%';
  }
  function destroyCharts(){}
  function fetchAll() {
    if (METODO_FETCHING) return; METODO_FETCHING = true;
    var sym={'BTC':'BTCUSDT','ETH':'ETHUSDT','SOL':'SOLUSDT','XRP':'XRPUSDT'}[coin]||'BTCUSDT';
    var binInterval={'1':'1m','3':'3m','5':'5m','15':'15m','30':'30m','1h':'1h'};
    var limit = Math.max(201, tf==='1h'?300:220);
    var klinesData=null, fngData=null, globalData=null, tickerData=null;
    var chip = document.getElementById('apiChip');
    if (chip) { chip.textContent='FETCHING'; chip.className='api-chip chip-loading'; }
    Promise.allSettled([
      fetchJ('https://api.binance.com/api/v3/ticker/24hr?symbol='+sym).then(function(d){if(d&&d.lastPrice){tickerData=d;var p=+d.lastPrice,c=+d.priceChangePercent;var ph=document.getElementById('metodoPrice');if(ph)ph.textContent=fmtP(p);var pc=document.getElementById('metodoChg');if(pc){pc.textContent=(c>=0?'+':'')+c.toFixed(2)+'%';pc.className='price-chg '+(c>=0?'chg-up':'chg-dn');pc.style.display='inline';}}}).catch(function(){}),
      fetchJ('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+(binInterval[tf]||'15m')+'&limit='+limit).then(function(d){if(d&&d.length){klinesData=d.map(function(c){return[+c[0],+c[1],+c[2],+c[3],+c[4],+c[5],+c[6],+c[7],+c[8],+c[9],+c[10],+c[11]];});var eb=document.getElementById('metodoErr');if(eb)eb.style.display='none';}}).catch(function(){var eb=document.getElementById('metodoErr');if(eb)eb.style.display='block';}),
      fetchJ('https://api.alternative.me/fng/?limit=1').then(function(d){if(d&&d.data&&d.data[0])fngData=+d.data[0].value;}).catch(function(){}),
      fetchJ('https://sono-bot.sonosanty.workers.dev/api/status').then(function(d){if(d&&d.macro){var m=d.macro;if(m.dominance!=null)globalData={market_cap_percentage:{btc:m.dominance},total_market_cap:{usd:m.mcap||0}};if(m.fng!=null&&!fngData)fngData=m.fng;}}).catch(function(){})
    ]).then(function(){
      METODO_FETCHING=false;
      if(!klinesData){setTimeout(fetchAll,15000);if(chip){chip.textContent='ERROR';chip.className='api-chip chip-err';}return;}
      var cl=klinesData.map(function(k){return+k[4];}), hi=klinesData.map(function(k){return+k[2];}), lo=klinesData.map(function(k){return+k[3];});
      var sc=computeScore(cl,hi,lo);
      renderScore(sc); renderSignals(sc);
      renderMacro(fngData||fng, globalData?globalData.market_cap_percentage.btc:dom);
      if(chip){chip.textContent='LIVE';chip.className='api-chip chip-ok';}
    }).catch(function(){ METODO_FETCHING=false; if(chip){chip.textContent='ERROR';chip.className='api-chip chip-err';} setTimeout(fetchAll,15000); });
  }
  METODO.changeCoin = function(c) {
    coin=c; document.querySelectorAll('#page-metodo .btn-coin').forEach(function(b){b.classList.toggle('ac',b.dataset.coin===c);});
    var ct=document.getElementById('chartTitle'); if(ct)ct.textContent=c; METODO_FETCHING=false; fetchAll();
  };
  METODO.changeTF = function(t) {
    tf=t; document.querySelectorAll('#page-metodo .btn-tf').forEach(function(b){b.classList.toggle('ac',b.dataset.tf===t);});
    METODO_FETCHING=false; fetchAll();
  };
  window.initMetodo = function() {
    var pw=document.getElementById('metodoPanels');
    if (pw && !pw.children.length) {
      pw.innerHTML='<div class="panel-label">Precio · MA6 · MA40 · MA70 · MA200 · Bollinger</div><div class="panel"><div class="canvas-wrap" style="height:280px"><canvas id="cPrice"></canvas></div></div><div class="panel-sep"></div><div class="panel-label">RSI (14) — Sobrecompra &gt;70 · Sobreventa &lt;30</div><div class="panel"><div class="canvas-wrap" style="height:90px"><canvas id="cRSI"></canvas></div></div><div class="panel-sep"></div><div class="panel-label">ADX (14) — Tendencia fuerte &gt;25</div><div class="panel"><div class="canvas-wrap" style="height:80px"><canvas id="cADX"></canvas></div></div><div class="panel-sep"></div><div class="panel-label">Bollinger %B — Sobrecompra &gt;0.8 · Sobreventa &lt;0.2</div><div class="panel" style="padding-bottom:8px"><div class="canvas-wrap" style="height:80px"><canvas id="cBB"></canvas></div></div>';
    }
    METODO_FETCHING=false; fetchAll();
    if (METODO_INTERVAL) clearInterval(METODO_INTERVAL);
    METODO_INTERVAL = setInterval(fetchAll, 30000);
  };
  window.cleanupMetodo = function() {
    if (METODO_INTERVAL) { clearInterval(METODO_INTERVAL); METODO_INTERVAL=null; }
    METODO_FETCHING=false; destroyCharts();
  };
})();

// ============================================================

// ============================================================
// RANGOS VIEW
// ============================================================
var RANGOS_INTERVAL = null;
var RANGOS_WS = null;
var RANGOS_LIVE_PRICE = 73900;
var RANGOS_KLINES_CACHE = {};
var RANGOS_TFS = ['15m','5m','3m','1m'];
var RANGOS_CHART_INSTANCES = {};

(function() {
  function $(id) { return document.getElementById(id); }
  function fmtN(n,d) { if (arguments.length<2) d=2; return Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  
  function getModuleRSI() {
    try { if (window._moduleExports && window._moduleExports.rsi) return window._moduleExports.rsi; } catch(e) {}
    return null;
  }
  
  function calcRSI(closes, p) {
    p = p || 14;
    var mod = getModuleRSI();
    if (mod) {
      var result = new Array(closes.length).fill(null);
      for(var i=p; i<closes.length; i++) result[i] = mod(closes.slice(0,i+1), p);
      return result;
    }
    var out = new Array(closes.length).fill(0);
    var g=0,l=0;
    for(var i=1;i<=p;i++){var d=closes[i]-closes[i-1];d>0?g+=d:l-=d;}
    var ag=g/p, al=l/p;
    out[p]=al===0?100:100-100/(1+ag/al);
    for(var i=p+1;i<closes.length;i++){var d=closes[i]-closes[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;out[i]=al===0?100:100-100/(1+ag/al);}
    return out;
  }
  
  function fetchKlines(tf) {
    return fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval='+tf+'&limit=60',{cache:'no-store'})
      .then(function(r){return r.json();})
      .then(function(d){RANGOS_KLINES_CACHE[tf]=d.map(function(k){return{o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5]};});})
      .catch(function(){RANGOS_KLINES_CACHE[tf]=null;});
  }
  
  function fetchAllKlines() { return Promise.all(RANGOS_TFS.map(fetchKlines)); }
  
  function analyzeRange(tf) {
    var kl = RANGOS_KLINES_CACHE[tf], price = RANGOS_LIVE_PRICE;
    if (!kl || kl.length < 10) return buildFallback(tf, price);
    var slice = kl.slice(-30);
    var highs = slice.map(function(k){return k.h;}), lows = slice.map(function(k){return k.l;});
    var rHigh = Math.max.apply(null,highs), rLow = Math.min.apply(null,lows), rRange = rHigh - rLow;
    var pos = Math.max(0, Math.min(1, (price - rLow) / (rRange||1)));
    var res=[], sup=[];
    for(var i=2;i<slice.length-2;i++){
      var h=slice[i].h; if(h>slice[i-1].h&&h>slice[i-2].h&&h>slice[i+1].h&&h>slice[i+2].h&&h>price) res.push(h);
      var l=slice[i].l; if(l<slice[i-1].l&&l<slice[i-2].l&&l<slice[i+1].l&&l<slice[i+2].l&&l<price) sup.push(l);
    }
    var resSorted=[...new Set(res)].sort(function(a,b){return a-b}).slice(0,3);
    var supSorted=[...new Set(sup)].sort(function(a,b){return b-a}).slice(0,3);
    while(resSorted.length<3) resSorted.push(Math.round(price+rRange*0.1*(resSorted.length+1)));
    while(supSorted.length<3) supSorted.push(Math.round(price-rRange*0.1*(supSorted.length+1)));
    var closes=slice.map(function(k){return k.c;}), rsiArr=calcRSI(closes,14), rsi=rsiArr[rsiArr.length-1];
    var bias=rsi>55?'ALCISTA':rsi<45?'BAJISTA':'NEUTRO', biasNum=rsi>55?70:rsi<45?30:50, conf=Math.round(Math.abs(biasNum-50)*2+40);
    var zone, pressure, intensity, context, liquidity, sweep, reaction, note;
    if (pos>0.75) { zone='alta'; pressure='VENDEDORA'; intensity=pos>0.88?'FUERTE':'MEDIA'; context='Zona alta'; liquidity='Liquidez vendedora'; sweep='Posible barrido HH'; reaction='Esperar rechazo'; note='Precio en zona alta del rango.'; }
    else if (pos<0.25) { zone='baja'; pressure='COMPRADORA'; intensity=pos<0.12?'FUERTE':'MEDIA'; context='Zona baja'; liquidity='Liquidez compradora'; sweep='Posible barrido LL'; reaction='Vigilar rebote'; note='Precio en zona baja del rango.'; }
    else { zone='media'; pressure='COMPRESION'; intensity='NEUTRA'; context='Zona media'; liquidity='Sin ventaja clara'; sweep='Sin barrido claro'; reaction='Esperar confirmacion'; note='Precio en zona media del rango.'; }
    function strengthOf(p2) { var d=Math.abs(price-p2)/rRange; return d<0.05?'extreme':d<0.12?'strong':d<0.20?'medium':'weak'; }
    return {tf:tf, dominant:tf==='15m', pressure:pressure, intensity:intensity, zone:zone, context:context, liquidity:liquidity, sweep:sweep, reaction:reaction, note:note,
      res:resSorted.map(function(p2,i){return{label:'RES '+(i+1),price:p2,strength:strengthOf(p2)};}),
      sup:supSorted.map(function(p2,i){return{label:'SUP '+(i+1),price:p2,strength:strengthOf(p2)};}),
      price:price, rHigh:rHigh, rLow:rLow, rRange:rRange, gaugePos:Math.round(pos*100), bias:bias, biasNum:biasNum, conf:conf, rsi:rsi, candles:slice};
  }
  
  function buildFallback(tf, price) {
    var sp={'15m':200,'5m':110,'3m':70,'1m':45}[tf]||150;
    return {tf:tf, dominant:tf==='15m', pressure:'COMPRESION', intensity:'NEUTRA', zone:'media', context:'Zona media', liquidity:'Sin ventaja clara',
      sweep:'Sin barrido claro', reaction:'Esperar confirmacion', note:'Precio en zona media del rango.',
      res:[{label:'RES 1',price:price+sp,strength:'medium'},{label:'RES 2',price:price+sp*1.8,strength:'weak'},{label:'RES 3',price:price+sp*2.8,strength:'weak'}],
      sup:[{label:'SUP 1',price:price-sp,strength:'medium'},{label:'SUP 2',price:price-sp*1.8,strength:'weak'},{label:'SUP 3',price:price-sp*2.5,strength:'weak'}],
      price:price, rHigh:price+sp*3, rLow:price-sp*3, rRange:sp*6, gaugePos:50, bias:'NEUTRO', biasNum:50, conf:45, rsi:50, candles:[]};
  }
  
  function renderHero() {
    var d = analyzeRange('15m');
    var hero = document.getElementById('rangeHero');
    var hp = document.getElementById('heroPrice'); if(hp) hp.textContent = '$'+fmtN(d.price,2);
    var pill = document.getElementById('heroPill');
    if (hero) {
      if (d.zone==='alta') { if(pill){pill.textContent='DOWN ZONA ALTA - Presion vendedora';pill.className='range-status-pill bearish';} hero.className='range-hero bearish'; }
      else if (d.zone==='baja') { if(pill){pill.textContent='UP ZONA BAJA - Presion compradora';pill.className='range-status-pill bullish';} hero.className='range-hero bullish'; }
      else { if(pill){pill.textContent='- ZONA MEDIA - Sin ventaja clara';pill.className='range-status-pill';} hero.className='range-hero'; }
    }
    var hm = document.getElementById('heroMessage'); if(hm) hm.textContent = 'Precio en zona '+d.zone+' del rango. '+d.note;
    var b = document.getElementById('kpiBias'); if(b) b.innerHTML = '<span>Bias</span><strong style="color:'+(d.bias==='ALCISTA'?'#22c55e':d.bias==='BAJISTA'?'#ef4444':'#f59e0b')+'">'+d.bias+'</strong><small>RSI macro '+d.rsi.toFixed(1)+'</small>';
    var c = document.getElementById('kpiConf'); if(c) c.innerHTML = '<span>Confianza</span><strong>'+d.conf+'/100</strong><small>Score contextual</small>';
    var s = document.getElementById('kpiState'); if(s) s.innerHTML = '<span>Estado</span><strong>'+d.pressure+' '+d.intensity+'</strong><small>Confluencia MTF</small>';
  }
  
  function renderTFCards() {
    var grid = document.getElementById('range-timeframes');
    if (!grid) return;
    Object.values(RANGOS_CHART_INSTANCES).forEach(function(ch){ try{ch.destroy();}catch(e){} });
    RANGOS_CHART_INSTANCES = {};
    grid.innerHTML = '';
    RANGOS_TFS.forEach(function(tf) {
      var d = analyzeRange(tf);
      var cursorLeft = Math.max(5, Math.min(95, d.gaugePos))+'%';
      var resRows = d.res.slice().reverse().map(function(l){ return '<div class="range-level-row resistance '+l.strength+'"><span>'+l.label+'</span><strong>$'+fmtN(l.price,0)+'</strong><em>'+l.strength+'</em><div class="range-strength-row '+l.strength+'"><span>+'+fmtN(Math.abs(l.price-d.price),0)+'</span><div><i style="width:'+Math.min(100,Math.abs(l.price-d.price)/d.rRange*300)+'%"></i></div></div></div>'; }).join('');
      var supRows = d.sup.map(function(l){ return '<div class="range-level-row support '+l.strength+'"><span>'+l.label+'</span><strong>$'+fmtN(l.price,0)+'</strong><em>'+l.strength+'</em><div class="range-strength-row '+l.strength+'"><span>'+fmtN(d.price-l.price,0)+'</span><div><i style="width:'+Math.min(100,Math.abs(d.price-l.price)/d.rRange*300)+'%"></i></div></div></div>'; }).join('');
      var cardId = 'chart-'+tf;
      var card = document.createElement('div');
      card.className = 'range-spatial-card';
      card.innerHTML = 
        '<div class="range-spatial-head"><div class="range-spatial-title"><div class="range-card-header">'+tf+(d.dominant?' <span class="range-dominant-pill">DOMINANTE</span>':'')+'</div><div class="range-operational '+(d.bias==='ALCISTA'?'bullish':d.bias==='BAJISTA'?'bearish':'')+'">'+(d.zone==='media'?'RANGO / ESPERA':d.zone==='alta'?'ZONA ALTA / ESPERA':'ZONA BAJA / ESPERA')+'</div></div>'+
        '<div class="range-pressure-panel"><span>Presion del mercado</span><strong style="color:'+(d.zone==='alta'?'#ef4444':d.zone==='baja'?'#22c55e':'#f59e0b')+'">'+d.pressure+'</strong><small>'+d.intensity+'</small>'+
        '<div class="pressure-meter"><div class="pressure-meter-track"></div><div class="pressure-meter-dot" style="left:'+cursorLeft+'"></div></div>'+
        '<div class="pressure-labels"><span>VENTA</span><span>NEUTRO</span><span>COMPRA</span></div></div></div>'+
        '<div class="range-spatial-body"><div style="display:flex;flex-direction:column;gap:8px">'+
        '<div class="range-side-title resistance" style="font-size:10px;margin-bottom:4px">. RESISTENCIAS</div>'+resRows+
        '<div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)"><span style="color:#64748b;font-size:10px;font-weight:800">PRECIO LIVE</span><div style="font-size:20px;font-weight:900;font-family:var(--mono);letter-spacing:-.04em;color:#f8fafc">$'+fmtN(d.price,2)+'</div></div>'+
        '<div class="range-side-title support" style="font-size:10px;margin-bottom:4px">v SOPORTES</div>'+supRows+'</div>'+
        '<div class="range-bias-panel"><div class="range-bias-block"><label>Contexto</label><strong>'+d.context+'</strong></div><div class="range-bias-block"><label>Liquidez</label><strong>'+d.liquidity+'</strong></div><div class="range-bias-block"><label>Sweep</label><strong>'+d.sweep+'</strong></div><div class="range-bias-block"><label>Reaccion esperada</label><strong>'+d.reaction+'</strong></div></div>'+
        '<div class="range-spatial-chart"><canvas id="'+cardId+'" style="width:100%;height:80px"></canvas></div></div>'+
        '<div style="font-size:12px;color:#94a3b8;padding-top:4px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px">'+d.note+'</div>';
      grid.appendChild(card);
      if(d.candles && d.candles.length && window.Chart) {
        var ctx = document.getElementById(cardId);
        if (ctx) {
          var prices = d.candles.slice(-20).map(function(k){return k.c;});
          var col = d.zone==='alta'?'#ef4444':d.zone==='baja'?'#22c55e':'#58a6ff';
          RANGOS_CHART_INSTANCES[tf] = new Chart(ctx, {
            type:'line', data:{labels:prices.map(function(_,i){return i;}), datasets:[{data:prices, borderColor:col, backgroundColor:col.replace(')',',0.08)').replace('rgb','rgba'), borderWidth:1.5, pointRadius:0, tension:0.3, fill:true}]},
            options:{responsive:true, maintainAspectRatio:false, animation:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false}}}
          });
        }
      }
    });
  }
  
  window.initRangos = function() {
    // Fetch live price
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',{cache:'no-store'})
      .then(function(r){return r.json();})
      .then(function(d){RANGOS_LIVE_PRICE=+d.price;})
      .catch(function(){})
      .then(function(){
        fetchAllKlines().then(function(){
          renderHero();
          renderTFCards();
        });
      });
    // WS for live price
    try {
      RANGOS_WS = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
      RANGOS_WS.onmessage = function(e) {
        RANGOS_LIVE_PRICE = parseFloat(JSON.parse(e.data).p);
        var hp = document.getElementById('heroPrice');
        if (hp) hp.textContent = '$'+fmtN(RANGOS_LIVE_PRICE,2);
      };
      RANGOS_WS.onclose = function() { setTimeout(function(){ try{RANGOS_WS=new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');}catch(e){} }, 5000); };
      RANGOS_WS.onerror = function() { RANGOS_WS.close(); };
    } catch(e) {}
    // Poll every 20s
    if (RANGOS_INTERVAL) clearInterval(RANGOS_INTERVAL);
    RANGOS_INTERVAL = setInterval(function() {
      fetchAllKlines().then(function(){
        renderHero();
        renderTFCards();
      });
    }, 20000);
    console.log('[Rangos] iniciado');
  };
  
  window.cleanupRangos = function() {
    if (RANGOS_INTERVAL) { clearInterval(RANGOS_INTERVAL); RANGOS_INTERVAL = null; }
    if (RANGOS_WS) { try { RANGOS_WS.close(); } catch(e) {} RANGOS_WS = null; }
    Object.values(RANGOS_CHART_INSTANCES).forEach(function(ch){ try{ch.destroy();}catch(e){} });
    RANGOS_CHART_INSTANCES = {};
    console.log('[Rangos] cleanup');
  };
})();

// ============================================================

// ============================================================

// ============================================================
// TRADES VIEW
// ============================================================
var TRADES_WS = null;
var TRADES_INTERVAL = null;
var TRADES_LIVE_PRICE = 73900;
var TRADES_EQUITY_CHART = null;

var DEMO_OPEN = [
  {id:233,tf:'candles_3m',side:'LONG',setup:'lower_rejection',entry:73948.13,sl:73840.81,tp1:74014.30,tp2:74047.38,tp3:74097.01,maxTp:0,mfe:0,mae:0,dur:'9m 53s',opened:'30/05/26 19:03:27'},
  {id:232,tf:'candles_15m',side:'LONG',setup:'lower_rejection',entry:73989.03,sl:73517.19,tp1:74249.47,tp2:74384.19,tp3:74922.27,maxTp:0,mfe:0,mae:0,dur:'57m 52s',opened:'30/05/26 15:28'},
  {id:220,tf:'candles_5m',side:'LONG',setup:'bullish_impulse',entry:74030.01,sl:73755.20,tp1:74198.12,tp2:74283.68,tp3:74410.51,maxTp:0,mfe:0,mae:0,dur:'1h 57m',opened:'30/05/26 17:25'},
];
var DEMO_CLOSED = [
  {id:219,res:'TP',tf:'candles_3m',side:'LONG',setup:'sell_absorption',entry:73500,close:74014,tp1:74014,tp2:0,tp3:0,maxTp:74014,sl:73200,mfe:514,mae:0,dur:'22m',pnl:5.13,touch:'30/05/26 14:22'},
  {id:218,res:'SL',tf:'candles_5m',side:'SHORT',setup:'bearish_impulse',entry:74200,close:73800,tp1:73800,tp2:0,tp3:0,maxTp:73800,sl:74500,mfe:400,mae:0,dur:'1h',pnl:-3.00,touch:'30/05/26 12:10'},
  {id:217,res:'TP',tf:'candles_3m',side:'LONG',setup:'lower_rejection',entry:72800,close:73500,tp1:73500,tp2:0,tp3:0,maxTp:73500,sl:72400,mfe:700,mae:0,dur:'45m',pnl:7.00,touch:'30/05/26 10:30'},
  {id:216,res:'BE',tf:'candles_5m',side:'LONG',setup:'buy_absorption',entry:73100,close:73100,tp1:73600,tp2:0,tp3:0,maxTp:73600,sl:72700,mfe:300,mae:0,dur:'30m',pnl:0.00,touch:'30/05/26 09:00'},
  {id:215,res:'TP',tf:'candles_15m',side:'LONG',setup:'lower_rejection',entry:71000,close:72500,tp1:72500,tp2:0,tp3:0,maxTp:72500,sl:70200,mfe:1500,mae:0,dur:'3h',pnl:15.00,touch:'29/05/26 15:00'},
  {id:214,res:'SL',tf:'candles_3m',side:'SHORT',setup:'upper_rejection',entry:73900,close:74200,tp1:73200,tp2:0,tp3:0,maxTp:73200,sl:74200,mfe:0,mae:300,dur:'15m',pnl:-3.00,touch:'29/05/26 12:00'},
];

var SETUPS = {
  'bearish_impulse':  {tp:17,be:10,sl:9},
  'sell_absorption':  {tp:9, be:1, sl:4},
  'lower_rejection':  {tp:16,be:15,sl:19},
  'upper_rejection':  {tp:13,be:5, sl:11},
  'buy_absorption':   {tp:5, be:2, sl:4},
  'bullish_impulse':  {tp:21,be:8, sl:31},
};
var TFS2 = {'candles_3m':{tp:43,be:20,sl:38},'candles_5m':{tp:31,be:10,sl:31},'candles_15m':{tp:7,be:0,sl:9}};

(function() {
  function $(id) { return document.getElementById(id); }
  function fmtN(n,d) { if (arguments.length<2) d=2; return Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function wr(tp,be,sl) { var tot=tp+be+sl; return tot ? ((tp/tot)*100).toFixed(1)+'%' : '—'; }
  function pf(tp,sl) { return sl===0 ? '∞' : (tp/sl).toFixed(2); }

  function renderSetupTable() {
    var b = document.getElementById('setupStatsBody');
    if (!b) return;
    b.innerHTML = '';
    Object.keys(SETUPS).forEach(function(name) {
      var s = SETUPS[name];
      var pnlArr = DEMO_CLOSED.filter(function(t){return t.setup===name;}).map(function(t){return t.pnl||0;});
      var pnlTot = pnlArr.reduce(function(a,b){return a+b;},0);
      var pnlAvg = pnlArr.length ? pnlTot/pnlArr.length : 0;
      var col = pnlTot >= 0 ? 'positive' : 'negative';
      b.innerHTML += '<tr><td>'+name+'</td><td>'+(s.tp+s.be+s.sl)+'</td><td>'+s.tp+' / '+s.be+' / '+s.sl+'</td><td>'+wr(s.tp,s.be,s.sl)+'</td><td class="'+col+'">'+fmtN(pnlTot,2)+'$</td><td class="'+col+'">'+fmtN(pnlAvg,2)+'$</td><td>'+pf(s.tp,s.sl)+'</td></tr>';
    });
  }

  function renderTFTable() {
    var b = document.getElementById('tfStatsBody');
    if (!b) return;
    b.innerHTML = '';
    Object.keys(TFS2).forEach(function(name) {
      var s = TFS2[name];
      var pnlArr = DEMO_CLOSED.filter(function(t){return t.tf===name;}).map(function(t){return t.pnl||0;});
      var pnlTot = pnlArr.reduce(function(a,b){return a+b;},0);
      var pnlAvg = pnlArr.length ? pnlTot/pnlArr.length : 0;
      var col = pnlTot >= 0 ? 'positive' : 'negative';
      b.innerHTML += '<tr><td>'+name+'</td><td>'+(s.tp+s.be+s.sl)+'</td><td>'+s.tp+' / '+s.be+' / '+s.sl+'</td><td>'+wr(s.tp,s.be,s.sl)+'</td><td class="'+col+'">'+fmtN(pnlTot,2)+'$</td><td class="'+col+'">'+fmtN(pnlAvg,2)+'$</td><td>'+pf(s.tp,s.sl)+'</td></tr>';
    });
  }

  function renderSummary() {
    var allTP = DEMO_CLOSED.filter(function(t){return t.res==='TP';}).length;
    var allBE = DEMO_CLOSED.filter(function(t){return t.res==='BE';}).length;
    var allSL = DEMO_CLOSED.filter(function(t){return t.res==='SL';}).length;
    var e = document.getElementById('summaryTpSl'); if(e) e.textContent = allTP+' / '+allBE+' / '+allSL;
    e = document.getElementById('summaryWinrate'); if(e) e.textContent = wr(allTP,allBE,allSL);
    var pnlAll = DEMO_CLOSED.map(function(t){return t.pnl||0;});
    var pnlTot = pnlAll.reduce(function(a,b){return a+b;},0);
    e = document.getElementById('summaryPnlTotal'); if(e) e.textContent = fmtN(pnlTot,2)+'$';
    e = document.getElementById('summaryPnlAvg'); if(e) e.textContent = fmtN(pnlTot/DEMO_CLOSED.length,2)+'$';
    e = document.getElementById('summaryOpen'); if(e) e.textContent = DEMO_OPEN.length;
    e = document.getElementById('summaryClosed'); if(e) e.textContent = DEMO_CLOSED.length;
    var pnlSorted = pnlAll.slice().sort(function(a,b){return b-a;});
    var cum=0, peak=0, maxDD=0;
    pnlAll.forEach(function(p){cum+=p;if(cum>peak)peak=cum;if(peak-cum>maxDD)maxDD=peak-cum;});
    e = document.getElementById('equityMaxDd'); if(e) e.textContent = '-'+fmtN(maxDD,2)+'$';
    e = document.getElementById('equityProfitFactor'); if(e) e.textContent = pf(allTP,allSL);
    var avgPnl = pnlAll.length ? (pnlAll.reduce(function(a,b){return a+b;},0)/pnlAll.length) : 0;
    e = document.getElementById('equityExpectancy'); if(e) e.textContent = fmtN(avgPnl,2)+'$';
    e = document.getElementById('equityBestR'); if(e) e.textContent = (pnlSorted[0]||0).toFixed(2)+'$';
    e = document.getElementById('equityWorstR'); if(e) e.textContent = (pnlSorted[pnlSorted.length-1]||0).toFixed(2)+'$';
  }

  function renderChart() {
    if (TRADES_EQUITY_CHART) { try { TRADES_EQUITY_CHART.destroy(); } catch(e) {} TRADES_EQUITY_CHART = null; }
    var ctx = document.getElementById('equityChart');
    if (!ctx || !window.Chart) return;
    var cum=0;
    var data = [0];
    DEMO_CLOSED.forEach(function(t){cum+=t.pnl||0;data.push(parseFloat(cum.toFixed(2)));});
    TRADES_EQUITY_CHART = new Chart(ctx, {
      type:'line',
      data:{labels:['Inicio'].concat(DEMO_CLOSED.map(function(_,i){return '#'+(i+1);})), datasets:[{label:'PnL $',data:data,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.08)',borderWidth:2,pointRadius:2,tension:0.3,fill:true}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4a6a8a',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:'#4a6a8a',font:{size:9},callback:function(v){return v+'$';}},grid:{color:'rgba(255,255,255,0.04)'}}}}
    });
  }

  function renderOpenTrades() {
    var body = document.getElementById('openTradesBody');
    if (!body) return;
    var statusEl = document.getElementById('filterStatus'); var statusFilter = statusEl ? statusEl.value : 'ALL';
    var sideEl = document.getElementById('filterSide'); var side = sideEl ? sideEl.value : 'ALL';
    var setupEl = document.getElementById('filterSetup'); var setup = setupEl ? setupEl.value.toLowerCase() : '';
    var tfEl = document.getElementById('filterTf'); var tfFilter = tfEl ? tfEl.value.toLowerCase() : '';
    var filtered = DEMO_OPEN.filter(function(t){
      if (statusFilter !== 'ALL' && statusFilter !== 'OPEN') return false;
      if (side !== 'ALL' && t.side !== side) return false;
      if (setup && t.setup.indexOf(setup) < 0) return false;
      if (tfFilter && t.tf.indexOf(tfFilter) < 0) return false;
      return true;
    });
    body.innerHTML = filtered.map(function(t){
      var maxTpReached = t.side==='LONG' && TRADES_LIVE_PRICE >= Math.max(t.tp1, t.tp2, t.tp3);
      return '<tr><td>'+t.id+'</td><td><span class="badge-open">OPEN</span></td><td>'+t.tf+'</td><td><span class="badge-side '+t.side+'">'+t.side+'</span></td><td>'+t.setup+'</td><td>'+fmtN(t.entry,2)+'</td><td style="color:var(--red)">'+fmtN(t.sl,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp1,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp2,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp3,2)+'</td><td>'+(maxTpReached?'TP':'--')+'</td><td>'+fmtN(t.mfe,2)+'</td><td>'+fmtN(t.mae,2)+'</td><td>'+t.dur+'</td><td style="color:var(--tx3);font-size:10px">'+t.opened+'</td></tr>';
    }).join('');
  }

  function renderClosedTrades() {
    var body = document.getElementById('closedTradesBody');
    if (!body) return;
    var statusEl = document.getElementById('filterStatus'); var statusFilter = statusEl ? statusEl.value : 'ALL';
    var sideEl = document.getElementById('filterSide'); var side = sideEl ? sideEl.value : 'ALL';
    var setupEl = document.getElementById('filterSetup'); var setup = setupEl ? setupEl.value.toLowerCase() : '';
    var tfEl = document.getElementById('filterTf'); var tfFilter = tfEl ? tfEl.value.toLowerCase() : '';
    var filtered = DEMO_CLOSED.filter(function(t){
      if (statusFilter !== 'ALL' && t.res !== statusFilter) return false;
      if (side !== 'ALL' && t.side !== side) return false;
      if (setup && t.setup.indexOf(setup) < 0) return false;
      if (tfFilter && t.tf.indexOf(tfFilter) < 0) return false;
      return true;
    });
    body.innerHTML = filtered.map(function(t){
      var pnlCol = t.pnl>0 ? 'positive' : t.pnl<0 ? 'negative' : 'neutral';
      var resCls = t.res==='TP'?'TP':t.res==='SL'?'SL':'BE';
      return '<tr><td>'+t.id+'</td><td><span class="badge-result '+resCls+'">'+t.res+'</span></td><td>'+t.tf+'</td><td><span class="badge-side '+t.side+'">'+t.side+'</span></td><td>'+t.setup+'</td><td>'+fmtN(t.entry,2)+'</td><td>'+fmtN(t.close,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp1,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp2,2)+'</td><td style="color:var(--green)">'+fmtN(t.tp3,2)+'</td><td>'+(t.maxTp>0?fmtN(t.maxTp,2):'--')+'</td><td style="color:var(--red)">'+fmtN(t.sl,2)+'</td><td>'+fmtN(t.mfe,2)+'</td><td>'+fmtN(t.mae,2)+'</td><td>'+t.dur+'</td><td class="'+pnlCol+'">'+(t.pnl>0?'+':'')+fmtN(t.pnl,2)+'$</td><td style="color:var(--tx3);font-size:10px">'+t.touch+'</td></tr>';
    }).join('');
  }

  window.TRADES = {
    switchTab: function(tab, btn) {
      document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active');});
      document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
      var panel = document.getElementById('tab-'+tab);
      if (panel) panel.classList.add('active');
      if (btn) btn.classList.add('active');
    },
    applyFilters: function() {
      renderOpenTrades();
      renderClosedTrades();
    }
  };

  function connectWS() {
    try {
      TRADES_WS = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
      TRADES_WS.onmessage = function(e) {
        TRADES_LIVE_PRICE = parseFloat(JSON.parse(e.data).p);
        var lp = document.getElementById('livePrice'); if (lp) lp.textContent = '$'+TRADES_LIVE_PRICE.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
        var wsStatus = document.getElementById('wsStatus'); if (wsStatus) wsStatus.textContent = 'ONLINE';
        var lat = document.getElementById('wsLatency'); if (lat) lat.textContent = 'Ultimo tick: '+new Date().toLocaleTimeString('es-ES');
        var lr = document.getElementById('lastRefresh'); if (lr) lr.textContent = 'Actualizado: '+new Date().toLocaleTimeString('es-ES');
        renderOpenTrades();
      };
      TRADES_WS.onclose = function() {
        var wsStatus = document.getElementById('wsStatus'); if (wsStatus) wsStatus.textContent = 'DESCONECTADO';
        setTimeout(connectWS, 5000);
      };
      TRADES_WS.onerror = function() { TRADES_WS.close(); };
    } catch(e) {
      var wsStatus = document.getElementById('wsStatus');
      if (wsStatus) wsStatus.textContent = 'ERROR WS';
    }
  }

  window.initTrades = function() {
    renderSummary();
    renderSetupTable();
    renderTFTable();
    renderOpenTrades();
    renderClosedTrades();
    renderChart();
    connectWS();
    if (TRADES_INTERVAL) clearInterval(TRADES_INTERVAL);
    TRADES_INTERVAL = setInterval(function() {
      renderOpenTrades();
      var lr = document.getElementById('lastRefresh');
      if (lr) lr.textContent = 'Actualizado: '+new Date().toLocaleTimeString('es-ES');
    }, 3000);
    console.log('[Trades] iniciado');
  };

  window.cleanupTrades = function() {
    if (TRADES_INTERVAL) { clearInterval(TRADES_INTERVAL); TRADES_INTERVAL = null; }
    if (TRADES_WS) { try { TRADES_WS.close(); } catch(e) {} TRADES_WS = null; }
    if (TRADES_EQUITY_CHART) { try { TRADES_EQUITY_CHART.destroy(); } catch(e) {} TRADES_EQUITY_CHART = null; }
    console.log('[Trades] cleanup');
  };
})();
