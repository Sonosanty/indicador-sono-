/* SONO PRO - SPA Controller + View Controllers */
"use strict";
window.SPA = (function() {
  var cp = null;
  function show(page, el) {
    if (cp === 'metodo') cleanupMetodo();
    else if (cp === 'rangos') cleanupRangos();
    else if (cp === 'trades') cleanupTrades();
    document.querySelectorAll('.page-panel').forEach(function(p){ p.classList.remove('active'); });
    var pn = document.getElementById('page-'+page);
    if (pn) pn.classList.add('active');
    document.querySelectorAll('.nav-links a').forEach(function(a){ a.classList.remove('active'); });
    if (el) el.classList.add('active');
    var f = document.getElementById('globalFooter');
    if (f) f.style.display = (page === 'dashboard') ? 'block' : 'none';
    cp = page;
    if (page === 'metodo') initMetodo();
    else if (page === 'rangos') initRangos();
    else if (page === 'trades') initTrades();
  }
  function changeAsset(asset, btn) {
    var abs = document.querySelectorAll('#rt .ab button');
    if (abs.length > 0) { abs.forEach(function(b){ if (b.getAttribute('data-a') === asset) b.click(); }); return; }
    if (window.CA !== undefined) { window.CA = asset; document.querySelectorAll('.asset-tab').forEach(function(t){ t.classList.remove('active'); }); if (btn) btn.classList.add('active'); if (window.fetchAll) fetchAll(); }
  }
  return { show: show, changeAsset: changeAsset, getPage: function(){ return cp; } };
})();

// ======== METODO VIEW ========
var METODO_INTERVAL = null;
var METODO_FETCHING = false;
var METODO = {};
(function() {
  var coin = 'BTC', tf = '3m', fng = 50, dom = 55;
  var charts = { price: null, rsi: null, adx: null, bb: null };
  function  { return document.getElementById(id); }
  function fmtP(n) { return n == null ? '--' : '$'+Number(n).toLocaleString('es-ES',{maximumFractionDigits:2}); }
  function fetchJ(url) { return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();}); }
  function smaLast(arr, p) { if (arr.length < p) return null; return arr.slice(-p).reduce(function(a,b){return a+b;},0)/p; }
  function rsiLast(cl, p) {
    if (cl.length < p+1) return null; var g=0,l=0;
    for (var i=cl.length-p; i<cl.length; i++) { var d=cl[i]-cl[i-1]; d>0 ? g+=d : l-=d; }
    return Math.round(100 - 100 / (1 + (g/p) / ((l/p)||0.001)));
  }
  function adxLast(hi, lo, cl, p) {
    if (cl.length < p+2) return null; var pd=0,md=0,tr=0;
    for (var i=cl.length-p; i<cl.length; i++) { var pH=hi[i]-hi[i-1], mL=lo[i-1]-lo[i]; pd += (pH>mL&&pH>0?pH:0); md += (mL>pH&&mL>0?mL:0); tr += Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1])); }
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
    var col=zoneColor(d.score), circ=408, arc=ringArc;
    if (arc) { arc.style.strokeDashoffset=circ-circ*d.score/100; arc.style.stroke=col; }
    var sn=scoreNum; if(sn){ sn.textContent=d.score; sn.style.color=col; }
    var lbl=zoneLabel(d.score);
    var ss=scoreState; if(ss){ ss.textContent=lbl[0]; ss.style.color=col; }
    var sz=scoreZone; if(sz) sz.textContent=lbl[1];
    var rp=regimePill; if(rp) rp.textContent = d.score>=70&&fng<40?'Acumulacion agresiva':d.score>=62?'Tendencia alcista':d.score>=50&&dom>55?'Rotacion BTC':d.score>=42?'Consolidacion':d.score>=30?'Distribucion':'Panico / Capitulacion';
    var p1=p1pts; if(p1) p1.textContent=d.p1+'/35'; var p1b=p1bar; if(p1b) p1b.style.width=(d.p1/35*100)+'%';
    var p2=p2pts; if(p2) p2.textContent=d.p2+'/35'; var p2b=p2bar; if(p2b) p2b.style.width=(d.p2/35*100)+'%';
    var p3=p3pts; if(p3) p3.textContent=d.p3+'/30'; var p3b=p3bar; if(p3b) p3b.style.width=(d.p3/30*100)+'%';
  }
  function renderSignals(d) {
    function s(id,ok){var e=;if(e)e.style.background=ok?'var(--green)':'var(--dim)';}
    s('d_ma6x70',d.ma6!=null&&d.ma70!=null&&d.ma6>d.ma70);
    var v1=v_ma6x70;if(v1)v1.textContent=d.ma6!=null&&d.ma70!=null?fmtP(d.ma6)+' vs '+fmtP(d.ma70):'--';
    s('d_ma40',d.price!=null&&d.ma40!=null&&d.price>d.ma40);
    var v2=v_ma40;if(v2)v2.textContent=d.ma40!=null?fmtP(d.ma40):'--';
    s('d_ma200',d.price!=null&&d.ma200!=null&&d.price>d.ma200);
    var v3=v_ma200;if(v3)v3.textContent=d.ma200!=null?fmtP(d.ma200):'(sin datos)';
    s('d_adx',d.av!=null&&d.av>25); var v4=v_adx;if(v4)v4.textContent=d.av!=null?d.av+' pts':'--';
    s('d_rsi',d.rv!=null&&d.rv>50); var v5=v_rsi;if(v5)v5.textContent=d.rv!=null?d.rv:'--';
    s('d_bb',d.pb!=null&&d.pb>0.2&&d.pb<0.8); var v6=v_bb;if(v6)v6.textContent=d.pb!=null?d.pb.toFixed(3):'--';
  }
  function renderMacro(fv, dv) {
    if (fv!=null){fng=fv;dom=dv||dom;}
    var mf=mFNG;if(mf)mf.textContent=fng; var mfb=mFNGb;if(mfb)mfb.style.width=(fng/100*100)+'%';
    var mfl=mFNGl;if(mfl)mfl.textContent=fng<=20?'Miedo extremo':fng<=40?'Miedo':fng<=60?'Neutral':fng<=80?'Codicia':'Codicia extrema';
    var md=mDOM;if(md)md.textContent=(dom||55).toFixed(1)+'%'; var mdb=mDOMb;if(mdb)mdb.style.width=Math.min(dom||55,80)+'%';
    var mdl=mDOMl;if(mdl)mdl.textContent=(dom||55)>58?'BTC domina':(dom||55)<45?'Altseason':'Equilibrio';
  }
  function destroyCharts(){ Object.values(charts).forEach(function(c){try{c.destroy()}catch(e){}}); charts={price:null,rsi:null,adx:null,bb:null}; }

  function fetchAll() {
    if (METODO_FETCHING) return; METODO_FETCHING = true;
    var sym={'BTC':'BTC-USDT','ETH':'ETH-USDT','SOL':'SOL-USDT','XRP':'XRP-USDT'}[coin]||'BTC-USDT';
    var kcInt={'1':'1min','3':'3min','5':'5min','15':'15min','30':'30min','1h':'1hour'};
    var limit = Math.max(201, tf==='1h'?300:220);
    var klinesData=null, fngData=null, globalData=null;
    var chip = document.getElementById('apiChip');
    if (chip) { chip.textContent='FETCHING'; chip.className='api-chip chip-loading'; }
    Promise.allSettled([
      fetchJ('https://api.kucoin.com/api/v1/market/stats?symbol='+sym).then(function(d){if(d&&d.data){var p=+d.data.last,c=+d.data.changeRate*100;var ph=document.getElementById('metodoPrice');if(ph)ph.textContent=fmtP(p);var pc=document.getElementById('metodoChg');if(pc){pc.textContent=(c>=0?'+':'')+c.toFixed(2)+'%';pc.className='price-chg '+(c>=0?'chg-up':'chg-dn');pc.style.display='inline';}}}).catch(function(){}),
      fetchJ('https://api.kucoin.com/api/v1/market/candles?type='+(kcInt[tf]||'15min')+'&symbol='+sym+'&limit='+limit).then(function(d){if(d&&d.data){klinesData=d.data.map(function(c){return[+c[0],+c[1],+c[3],+c[4],+c[2],+c[5]];});var eb=document.getElementById('metodoErr');if(eb)eb.classList.remove('show');}}).catch(function(){var eb=document.getElementById('metodoErr');if(eb)eb.classList.add('show');}),
      fetchJ('https://api.alternative.me/fng/?limit=1').then(function(d){if(d&&d.data&&d.data[0])fngData=+d.data[0].value;}).catch(function(){}),
      fetchJ('https://sono-bot.sonosanty.workers.dev/api/status').then(function(d){if(d&&d.macro){var m=d.macro;if(m.dominance!=null)globalData={market_cap_percentage:{btc:m.dominance},total_market_cap:{usd:m.mcap||0}};if(m.fng!=null&&!fngData)fngData=m.fng;}}).catch(function(){})
    ]).then(function(){
      METODO_FETCHING=false;
      if(!klinesData){setTimeout(fetchAll,15000);if(chip){chip.textContent='ERROR';chip.className='api-chip chip-err';}return;}
      var cl=klinesData.map(function(k){return+k[4];}), hi=klinesData.map(function(k){return+k[2];}), lo=klinesData.map(function(k){return+k[3];}), ts=klinesData.map(function(k){return+k[0];});
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
      pw.innerHTML='<div class=\"panel-label\">Precio · MA6 · MA40 · MA70 · MA200 · Bollinger</div><div class=\"panel\"><div class=\"canvas-wrap\" style=\"height:280px\"><canvas id=\"cPrice\"></canvas></div></div><div class=\"panel-sep\"></div><div class=\"panel-label\">RSI (14) — Sobrecompra &gt;70 · Sobreventa &lt;30</div><div class=\"panel\"><div class=\"canvas-wrap\" style=\"height:90px\"><canvas id=\"cRSI\"></canvas></div></div><div class=\"panel-sep\"></div><div class=\"panel-label\">ADX (14) — Tendencia fuerte &gt;25</div><div class=\"panel\"><div class=\"canvas-wrap\" style=\"height:80px\"><canvas id=\"cADX\"></canvas></div></div><div class=\"panel-sep\"></div><div class=\"panel-label\">Bollinger %B — Sobrecompra &gt;0.8 · Sobreventa &lt;0.2</div><div class=\"panel\" style=\"padding-bottom:8px\"><div class=\"canvas-wrap\" style=\"height:80px\"><canvas id=\"cBB\"></canvas></div></div>';
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
