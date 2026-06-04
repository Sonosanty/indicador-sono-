/* SONO PRO — SPA Controller for Mockup UI */
"use strict";

// SPA Navigation
window.SPA = (function() {
  var cp = null;
  function show(page, btn) {
    if (cp === 'metodo' && window.cleanupMetodo) cleanupMetodo();
    else if (cp === 'rangos' && window.cleanupRangos) cleanupRangos();
    else if (cp === 'trades' && window.cleanupTrades) cleanupTrades();
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    var pn = document.getElementById('page-' + page);
    if (pn) pn.classList.add('active');
    document.querySelectorAll('.navbtn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var f = document.getElementById('globalFooter');
    if (f) f.style.display = (page === 'dashboard') ? 'block' : 'none';
    cp = page;
    if (page === 'metodo' && window.initMetodo) { setTimeout(initMetodo, 50); }
    else if (page === 'rangos' && window.initRangos) { setTimeout(initRangos, 50); }
    else if (page === 'trades' && window.initTrades) { setTimeout(initTrades, 50); }
    else if (page === 'dashboard') { setTimeout(fetchAll, 50); }
  }
  function changeAsset(asset, btn) {
    window.CA = asset;
    document.querySelectorAll('.atab').forEach(function(t){ t.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    if (window.fetchAll) fetchAll();
  }
  function setTF(tf, btn) {
    window.CTF = tf;
    btn.closest('.tf-row').querySelectorAll('.tfp').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    if (window.fetchAll) fetchAll();
  }
  return { show: show, changeAsset: changeAsset, setTF: setTF, getPage: function(){ return cp; } };
})();

// Utils
function $(id) { return document.getElementById(id); }
function fmtN(n,d) { if(arguments.length<2)d=2; return Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function fmtP(n) { return n==null?'--':'$'+fmtN(n); }
function fetchJ(url) { return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();}); }
function setText(id,txt){var e=$(id);if(e)e.textContent=txt;}
function setStyle(id,prop,val){var e=$(id);if(e)e.style[prop]=val;}
function pct(d){return (d>=0?'+':'')+d.toFixed(2)+'%';}

// Indicators
function smaLast(arr,p){if(arr.length<p)return null;return arr.slice(-p).reduce(function(a,b){return a+b;},0)/p;}
function rsiLast(cl,p){if(cl.length<p+1)return null;var g=0,l=0;for(var i=cl.length-p;i<cl.length;i++){var d=cl[i]-cl[i-1];d>0?g+=d:l-=d;}return Math.round(100-100/(1+(g/p)/((l/p)||0.001)));}
function adxLast(hi,lo,cl,p){if(cl.length<p+2)return null;var pd=0,md=0,tr=0;for(var i=cl.length-p;i<cl.length;i++){var pH=hi[i]-hi[i-1],mL=lo[i-1]-lo[i];pd+=(pH>mL&&pH>0?pH:0);md+=(mL>pH&&mL>0?mL:0);tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1]));}var pDI=100*pd/(tr||1),mDI=100*md/(tr||1);return Math.round(100*Math.abs(pDI-mDI)/((pDI+mDI)||1));}
function bbLast(cl,p,k){if(arguments.length<2)p=20;if(arguments.length<3)k=2;if(cl.length<p)return{pb:null,bw:null};var sl=cl.slice(-p),m=sl.reduce(function(a,b){return a+b;},0)/p;var sd=Math.sqrt(sl.reduce(function(a,b){return a+(b-m)*(b-m);},0)/p);var u=m+k*sd,d2=m-k*sd;return{pb:+((cl[cl.length-1]-d2)/((u-d2)||1)).toFixed(3),bw:+((u-d2)/m*100).toFixed(2)};}
function computeScore(cl,hi,lo){var price=cl[cl.length-1],ma6=smaLast(cl,6),ma40=smaLast(cl,40),ma70=smaLast(cl,70),ma200=smaLast(cl,200);var p1=0,p2=0,p3=0;if(ma6!=null&&ma40!=null)p1+=ma6>ma40?12:0;if(ma6!=null&&ma70!=null)p1+=ma6>ma70?10:0;if(ma40!=null&&ma200!=null)p1+=ma40>ma200?13:0;var rv=rsiLast(cl),av=adxLast(hi,lo,cl);if(av!=null)p2+=av>35?15:av>25?10:3;if(rv!=null)p2+=rv>=50&&rv<70?12:rv>=35?7:2;if(ma200!=null)p2+=price>ma200?8:0;var bb=bbLast(cl);if(bb.pb!=null){p3=bb.pb<0.15?28:bb.pb<0.35?20:bb.pb<0.65?14:bb.pb<0.85?7:2;}return{score:Math.min(100,Math.round(p1+p2+p3)),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),ma6:ma6,ma40:ma40,ma70:ma70,ma200:ma200,price:price,rv:rv,av:av,pb:bb.pb};}

// Dashboard
var DA='BTC',DTF='15m',D_FETCHING=false,FETCH_INTERVAL=null;

function renderDashboard(ticker,klines,fng,vix,dom){
  if(!klines||!klines.length)return;
  var cl=klines.map(function(k){return+k[4];}),hi=klines.map(function(k){return+k[2];}),lo=klines.map(function(k){return+k[3];});
  var price=cl[cl.length-1],sc=computeScore(cl,hi,lo);
  setText('dashPrice',fmtP(price));
  if(ticker){var chg=+ticker.priceChangePercent;setText('dashChg',''+(chg>=0?'▲ +':'▼ ')+chg.toFixed(2)+'% · '+pct(chg));setText('dashHigh',fmtP(+ticker.highPrice));setText('dashLow',fmtP(+ticker.lowPrice));setText('dashVol','$'+(+ticker.quoteVolume/1e9).toFixed(1)+'B');}
  var scCol=sc.score>=78?'#4f8ef7':sc.score>=62?'#22c55e':sc.score>=52?'#86efac':sc.score>=42?'#64748b':sc.score>=30?'#f59e0b':sc.score>=18?'#fca5a5':'#ef4444';
  var arc=document.querySelector('#page-dashboard .ring-ctr circle:nth-child(2)');
  if(arc){var r=36,circ=2*Math.PI*r;arc.style.stroke=scCol;arc.style.strokeDasharray=circ;arc.style.strokeDashoffset=circ-circ*sc.score/100;}
  setText('dashScore',Math.round(sc.score));
  var zLabels=['Compra fuerte','Compra','Acumular','Neutral','Venta','Venta fuerte','Capitulacion'],zEmojis=['\ud83d\udfe2','\ud83d\udfe2','\ud83d\udd35','\u26aa','\ud83d\udfe1','\ud83d\udd34','\u26ab'];
  var zIdx=sc.score>=78?0:sc.score>=62?1:sc.score>=52?2:sc.score>=42?3:sc.score>=30?4:sc.score>=18?5:6;
  setText('dashScoreLabel',zLabels[zIdx]+' '+zEmojis[zIdx]);
  setText('dashP1',sc.p1);setText('dashP2',sc.p2);setText('dashP3',sc.p3);
  setText('dashFng',fng!=null?fng:'--');
  setText('dashVix',vix!=null?vix.toFixed(2):'--');
  setText('dashDom',dom!=null?dom.toFixed(1)+'%':'--');
  setText('dashRsi',sc.rv!=null?sc.rv.toFixed(1):'--');
  setText('dashAdx',sc.av!=null?sc.av.toFixed(1):'--');
  setText('dashBb',sc.pb!=null?sc.pb.toFixed(2):'--');
  setText('dashMa40',sc.ma40!=null?fmtN(sc.ma40,0):'--');
  setText('dashMa6v',sc.ma6!=null?fmtN(sc.ma6,0):'--');
  setText('dashMa40v',sc.ma40!=null?fmtN(sc.ma40,0):'--');
  setText('dashMa70v',sc.ma70!=null?fmtN(sc.ma70,0):'--');
  setText('dashMa200v',sc.ma200!=null?fmtN(sc.ma200,0):'--');
  // MTF
  [1,3,5,15].forEach(function(m){var s=computeScore(klines.slice(-Math.max(m*4,20)).map(function(k){return+k[4];}),klines.slice(-Math.max(m*4,20)).map(function(k){return+k[2];}),klines.slice(-Math.max(m*4,20)).map(function(k){return+k[3];})).score;setText('dashMtf'+m+'m',s||'--');});
  // Signals
  var sigAdx=sc.av!=null&&sc.av>25,sigRsi=sc.rv!=null&&sc.rv<30,sigFng=fng!=null&&fng<25,sigMa=sc.ma6!=null&&sc.ma70!=null&&sc.ma6>sc.ma70,sigMa40=sc.ma40!=null&&price>sc.ma40;
  ['sigAdx','sigRsi','sigFng','sigMa','sigMa40'].forEach(function(id){var e=$(id+'Dot');if(e)e.style.background='#1a3352';});
  // R1/R2/S1/S2
  if(sc.ma40!=null){setText('dashR2',fmtP(sc.ma70*1.08));setText('dashR1',fmtP(sc.ma40*1.05));setText('dashNow','● '+fmtP(price)+' LIVE');setText('dashS1',fmtP(sc.ma40*0.95));setText('dashS2',fmtP(sc.ma70*0.92));}
}

window.fetchAll=function(){
  if(D_FETCHING)return;D_FETCHING=true;
  var sym={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'}[DA]||'BTCUSDT';
  var tf={1:'1m',3:'3m',5:'5m',15:'15m',30:'30m','1h':'1h'}[DTF]||'15m';
  var ticker=null,klines=null,fng=null,vix=null,g=null;
  Promise.allSettled([
    fetchJ('https://api.binance.com/api/v3/ticker/24hr?symbol='+sym).then(function(d){ticker=d;}).catch(function(){}),
    fetchJ('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+tf+'&limit=220').then(function(d){klines=d;}).catch(function(){}),
    fetchJ('https://api.alternative.me/fng/?limit=1').then(function(d){if(d&&d.data&&d.data[0])fng=+d.data[0].value;}).catch(function(){}),
    fetchJ('https://vix-proxy.sonosanty.workers.dev/api/vix').then(function(d){if(d&&d.cvi)vix=d.cvi;}).catch(function(){}),
    fetchJ('https://sono-bot.sonosanty.workers.dev/api/status').then(function(d){if(d&&d.macro)g=d.macro;}).catch(function(){})
  ]).then(function(){D_FETCHING=false;if(!klines){setTimeout(window.fetchAll,10000);return;}renderDashboard(ticker,klines,fng,vix,g?g.dominance:null);}).catch(function(){D_FETCHING=false;setTimeout(window.fetchAll,15000);});
};
setTimeout(window.fetchAll,100);if(FETCH_INTERVAL)clearInterval(FETCH_INTERVAL);FETCH_INTERVAL=setInterval(window.fetchAll,30000);

// METODO
var MET_INTERVAL=null,MET_FETCHING=false;
(function(){var coin='BTC',tf='15m';
function fetchMetodo(){if(MET_FETCHING)return;MET_FETCHING=true;
  var sym={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'}[coin]||'BTCUSDT';
  var bnTF={1:'1m',3:'3m',5:'5m',15:'15m',30:'30m','1h':'1h'}[tf]||'15m';
  var klines=null,fngData=null,g=null;
  Promise.allSettled([
    fetchJ('https://api.binance.com/api/v3/ticker/24hr?symbol='+sym).then(function(d){if(d&&d.lastPrice){setText('metPrice',fmtP(+d.lastPrice));}}).catch(function(){}),
    fetchJ('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+bnTF+'&limit=220').then(function(d){klines=d;}).catch(function(){}),
    fetchJ('https://api.alternative.me/fng/?limit=1').then(function(d){if(d&&d.data&&d.data[0])fngData=+d.data[0].value;}).catch(function(){}),
    fetchJ('https://sono-bot.sonosanty.workers.dev/api/status').then(function(d){if(d&&d.macro)g=d.macro;}).catch(function(){})
  ]).then(function(){MET_FETCHING=false;if(!klines){setTimeout(fetchMetodo,15000);return;}
    var cl=klines.map(function(k){return+k[4];}),hi=klines.map(function(k){return+k[2];}),lo=klines.map(function(k){return+k[3];});
    var price=cl[cl.length-1],sc=computeScore(cl,hi,lo);
    var scCol=sc.score>=78?'#4f8ef7':sc.score>=62?'#22c55e':sc.score>=52?'#86efac':sc.score>=42?'#64748b':sc.score>=30?'#f59e0b':sc.score>=18?'#fca5a5':'#ef4444';
    var arc=document.querySelector('#page-metodo .ring-ctr circle:nth-child(2)');
    if(arc){var r=36,circ=2*Math.PI*r;arc.style.stroke=scCol;arc.style.strokeDasharray=circ;arc.style.strokeDashoffset=circ-circ*sc.score/100;}
    setText('metScore',Math.round(sc.score));
    var zIdx=sc.score>=78?0:sc.score>=62?1:sc.score>=52?2:sc.score>=42?3:sc.score>=30?4:sc.score>=18?5:6;
    setText('metScoreLabel',['COMPRA FUERTE','COMPRA','ACUMULAR','NEUTRAL','VENTA','VENTA FUERTE','CAPITULACION'][zIdx]+' ['+['\ud83d\udfe2','\ud83d\udfe2','\ud83d\udd35','\u26aa','\ud83d\udfe1','\ud83d\udd34','\u26ab'][zIdx]+']');
    setText('metP1',sc.p1+'/35');setText('metP2',sc.p2+'/35');setText('metP3',sc.p3+'/30');
    setText('metFng',fngData||'--');setText('metDom',g?(g.dominance||0).toFixed(1)+'%':'--');setText('metRsi3d','--');setText('metMcap',g?fmtP(g.mcap||0):'--');
    var dbg=$( 'metDebug' );if(dbg){dbg.innerHTML='<b>MA6</b> '+fmtN(sc.ma6||0,0)+' vs <b>MA70</b> '+fmtN(sc.ma70||0,0)+' '+(sc.ma6!=null&&sc.ma70!=null&&sc.ma6>sc.ma70?'✓':'✗')+'<br><b>Precio</b> '+fmtP(price)+' vs <b>MA40</b> '+fmtN(sc.ma40||0,0)+' '+(sc.ma40!=null&&price>sc.ma40?'✓':'✗')+'<br><b>ADX</b> '+(sc.av||0).toFixed(1)+'<br><b>RSI</b> '+(sc.rv||0).toFixed(1)+'<br><b>%B</b> '+(sc.pb||0).toFixed(2)+'<br><b>Score</b> = '+sc.p1+'+'+sc.p2+'+'+sc.p3+' = '+sc.score;}
  }).catch(function(){MET_FETCHING=false;setTimeout(fetchMetodo,15000);});
}
window.initMetodo=function(){MET_FETCHING=false;fetchMetodo();if(MET_INTERVAL)clearInterval(MET_INTERVAL);MET_INTERVAL=setInterval(fetchMetodo,30000);};
window.cleanupMetodo=function(){if(MET_INTERVAL){clearInterval(MET_INTERVAL);MET_INTERVAL=null;}};
})();

// RANGOS (stub)
window.initRangos=function(){console.log('[Rangos] stub');};
window.cleanupRangos=function(){console.log('[Rangos] cleanup');};

// TRADES (stub con WS)
var TRADES_WS=null,TRADES_INTERVAL=null;
window.initTrades=function(){
  try{TRADES_WS=new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
  TRADES_WS.onmessage=function(e){var p=parseFloat(JSON.parse(e.data).p);setText('tradesPrice',fmtP(p));setText('tradesWsStatus','\u25cf ONLINE');};
  TRADES_WS.onclose=function(){setTimeout(function(){try{TRADES_WS=new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');}catch(e){}},5000);};
  TRADES_WS.onerror=function(){TRADES_WS.close();};}catch(e){}
  console.log('[Trades] stub');
};
window.cleanupTrades=function(){if(TRADES_WS){try{TRADES_WS.close();}catch(e){}}if(TRADES_INTERVAL){clearInterval(TRADES_INTERVAL);TRADES_INTERVAL=null;}console.log('[Trades] cleanup');};
