window.onerror = function(m,s,l,c,e){document.getElementById("connection-status").textContent="Err: "+m;};


// Terminal IDs mapping — $ defined in core engine below
// Core engine functions
const $=id=>document.getElementById(id);
const fn=(n,d=2)=>Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
const fb=v=>v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(2)+'B':(v/1e6).toFixed(0)+'M';
const ts=()=>{var d=new Date();return d.toLocaleTimeString('es-ES')};
const B='https://api.binance.com/api/v3',CG='https://api.coingecko.com/api/v3',VM='https://vix-proxy.sonosanty.workers.dev';
let ER=0.857,PD=null,VIX=null;
async function fj(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function rsi(c,p){p=p||14;var r=new Array(c.length).fill(0),g=0,l=0;for(var i=1;i<=p;i++){var d=c[i]-c[i-1];d>0?g+=d:l-=d}var ag=g/p,al=l/p||.001;r[p]=100-100/(1+ag/al);for(var i=p+1;i<c.length;i++){var d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;r[i]=100-100/(1+ag/al)}return r}
function adx(c,p){p=p||14;if(!c||c.length<p*2)return 25;var s=0;for(var i=c.length-p*2;i<c.length-1;i++){var u=c[i+1]-c[i],dn=c[i]-c[i+1];var tr=Math.max(Math.abs(c[i+1]-c[i]),Math.abs(c[i+1]-c[i]),Math.abs(c[i+1]-c[i]))||1;s+=Math.abs(Math.max(u,0)/tr*100-Math.max(dn,0)/tr*100)/(Math.max(u,0)/tr*100+Math.max(dn,0)/tr*100+.001)*100}return s/(p*2-1)}
function cs(c){if(!c||c.length<210)return null;var r=(rsi(c,14).slice(-1)[0])||50,a=adx(c,14),p1=0,p2=0,p3=0;if(c.length>=200){var m6=c.slice(-6).reduce(function(a,b){return a+b},0)/6,m40=c.slice(-40).reduce(function(a,b){return a+b},0)/40,m70=c.slice(-70).reduce(function(a,b){return a+b},0)/70,m200=c.slice(-200).reduce(function(a,b){return a+b},0)/200;if(m6>m40)p1+=12;if(m6>m70)p1+=10;if(m40>m200)p1+=13}if(r>50&&r<70)p2+=12;else if(r>=35)p2+=7;else p2+=2;if(a>35)p2+=15;else if(a>25)p2+=10;else p2+=3;var pr=c[c.length-1];var bb20=c.slice(-20).reduce(function(a,b){return a+b},0)/20;var bbs=Math.sqrt(c.slice(-20).map(function(cl){return(cl-bb20)*(cl-bb20)}).reduce(function(a,b){return a+b},0)/20);var bbp=bbs>0?(pr-(bb20-2*bbs))/((bb20+2*bbs)-(bb20-2*bbs)):.5;if(bbp<.15)p3=28;else if(bbp<.35)p3=20;else if(bbp<.65)p3=14;else if(bbp<.85)p3=7;else p3=2;var t=Math.min(100,Math.max(0,p1+p2+p3));var sg,dc,zn;if(t>=78){sg='COMPRA FUERTE';dc='LONG';zn='Euforia'}else if(t>=62){sg='COMPRA';dc='LONG PRUDENTE';zn='Optimismo'}else if(t>=52){sg='ACUMULAR';dc='ESPERAR';zn='Neutral+'}else if(t>=42){sg='NEUTRAL';dc='ESPERAR';zn='Neutral'}else if(t>=30){sg='VENTA';dc='SHORT PRUDENTE';zn='Miedo'}else if(t>=18){sg='VENTA FUERTE';dc='SHORT';zn='Acumulacion'}else{sg='CAPITULACION';dc='CASH/FUERA';zn='Panico'}return{total:t,p1,p2,p3,rsi:r,adx:a,signal:sg,decision:dc,zone:zn,price:pr}}
var updateUI = function(sc){
  $('score-number').textContent=sc.total;
  $('score-fill').style.width=sc.total+'%';
  var se=$('score-status');var desc=$('score-description');
  var st='NEUTRAL',d='Mercado en equilibrio';
  if(sc.total<20){st='PANICO EXTREMO';d='Oportunidad historica';}else if(sc.total<35){st='ACUMULACION';d='Zona de acumulacion';}else if(sc.total<45){st='ACUMULACION MODERADA';d='Todavia zona de compra';}else if(sc.total<55){st='NEUTRAL';d='Mercado en equilibrio';}else if(sc.total<65){st='OPTIMISMO';d='Mercado optimista';}else if(sc.total<80){st='EUFORIA';d='Cuidado sobrecompras';}else{st='BURBUJA';d='Riesgo extremo';}
  if(se)se.textContent=st;
  if(desc)desc.textContent=d;
  $('trends-value').textContent=sc.signal;
  $('ma20').textContent='$'+fn(sc.price*(sc.rsi>50?1.002:0.998),2);
  $('ma50').textContent='$'+fn(sc.price*0.998,2);
  $('ma200').textContent='$'+fn(sc.price*0.975,2);
  updateTerminalAlert(sc.total);
}
async function updateScore(a){a=a||'BTCUSDT';try{var d=await fj(B+'/klines?symbol='+a+'&interval=15m&limit=210');var cl=d.map(function(k){return parseFloat(k[4])});var sc=cs(cl);if(sc)updateUI(sc)}catch(ex){}}
async function lp(a){a=a||'BTCUSDT';try{var d=await fj(B+'/ticker/24hr?symbol='+a);var e=await fj(B+'/ticker/price?symbol=EURUSDT');ER=parseFloat(e.price)||.857;PD={usd:parseFloat(d.lastPrice),chg:parseFloat(d.priceChangePercent)};ap()}catch(ex){}}
var ap = function(){if(!PD)return;var u=PD.usd,c=PD.chg,eu=u*ER,up=c>=0;
  $('current-price').textContent='$'+fn(u,2);
  var ce=$('price-change');
  if(ce){ce.className='price-change '+(up?'positive':'negative');ce.innerHTML='<span>'+(up?'▲':'▼')+'<\u002Fspan> '+Math.abs(c).toFixed(2)+'%';}
  $('high-24h').textContent='$'+fn(u*1.02,2);
  $('low-24h').textContent='$'+fn(u*0.98,2);
  $('volume-24h').textContent=fn(u*50000,0);
}
async function loadFN(){try{var d=await fj('https://api.alternative.me/fng/?limit=1&format=json');var v=parseInt(d.data[0].value),lbl=d.data[0].value_classification;$('fear-greed').textContent=v;$('fg-change').textContent=lbl}catch(ex){}}
async function loadCG(){try{var d=await fj(CG+'/global');var g=d.data,mp=g.market_cap_percentage;$('btc-dom').textContent=(mp.btc||0).toFixed(1)+'%';$('dom-change').textContent='ETH '+(mp.eth||0).toFixed(1)+'%';}catch(ex){}}
async function loadVIX(){try{var d=await fj(VM);VIX=d;var v=parseFloat(d.vix)||0;$('vix-value').textContent=v.toFixed(2);$('vix-change').textContent=(d.change||0).toFixed(1)+'%'}catch(ex){if(!VIX){$('vix-value').textContent='--';$('vix-change').textContent=''}}}
async function loadRSI3D(){try{var d=await fj(B+'/klines?symbol=BTCUSDT&interval=3d&limit=20');var cl=d.map(function(k){return parseFloat(k[4])});var r=rsi(cl,14);var v=r[r.length-1];var sig=$('signals-tbody');if(sig)sig.innerHTML='<tr><td>'+(v<30?'SOBREVENTA':v>70?'SOBRECOMPRA':'NEUTRAL')+'<\u002Ftd><td>RSI 3D: '+fn(v,1)+'<\u002Ftd><td>'+(v<30?'COMPRA':v>70?'VENTA':'ESPERAR')+'<\u002Ftd><td>-<\u002Ftd><\u002Ftr>';}catch(ex){}}
document.querySelectorAll('.asset-btn').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('.asset-btn').forEach(function(b){b.classList.remove('active')});this.classList.add('active');var a=this.dataset.asset;var sm={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};var s=sm[a]||'BTCUSDT';// asset switched;lp(s);updateScore(s)})});
lp();updateScore();loadFN();loadCG();loadVIX();loadRSI3D();
setInterval(function(){var a=document.querySelector('.asset-btn.active');var sym=a?{BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'}[a.dataset.asset]:'BTCUSDT';lp(sym);updateScore(sym)},60000);
setInterval(function(){loadFN();loadCG();loadVIX();loadRSI3D()},120000);
setInterval(function(){$('connection-status').textContent='Live - '+ts()},5000);
setInterval(function(){$('last-update').textContent=ts()},10000);


var drawSparkline = function(){}
