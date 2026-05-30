#!/usr/bin/env python3
"""Reemplazar el JS en pagina.html con version completa y corregida"""
import re, os

PATH = os.path.join(os.path.dirname(__file__), 'pagina.html')
with open(PATH, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Añadir CSP
if 'Content-Security-Policy' not in html:
    csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; connect-src \'self\' https://api.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data:; frame-ancestors \'none\';\"/>'
    html = html.replace('<meta name="viewport"', csp + '\n<meta name="viewport"')
    print('1. CSP anadido')

# 2. Reemplazar el script completo
new_script = '''
const $=id=>document.getElementById(id);
const fn=(n,d=2)=>Number(n).toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});
const fb=v=>v>=1e12?(v/1e12).toFixed(2)+'T':v>=1e9?(v/1e9).toFixed(2)+'B':(v/1e6).toFixed(0)+'M';
const ts=()=>{var d=new Date();return d.toLocaleTimeString('es-ES')};
const B='https://api.binance.com/api/v3',CG='https://api.coingecko.com/api/v3',VM='https://vix-proxy.sonosanty.workers.dev';
let ER=0.857,PD=null,VIX=null;
async function fj(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function rsi(c,p){p=p||14;var r=new Array(c.length).fill(0),g=0,l=0;for(var i=1;i<=p;i++){var d=c[i]-c[i-1];d>0?g+=d:l-=d}var ag=g/p,al=l/p||.001;r[p]=100-100/(1+ag/al);for(var i=p+1;i<c.length;i++){var d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;r[i]=100-100/(1+ag/al)}return r}
function adx(c,p){p=p||14;if(!c||c.length<p*2)return 25;var s=0;for(var i=c.length-p*2;i<c.length-1;i++){var u=c[i+1]-c[i],dn=c[i]-c[i+1];var tr=Math.max(Math.abs(c[i+1]-c[i]),Math.abs(c[i+1]-c[i]),Math.abs(c[i+1]-c[i]))||1;s+=Math.abs(Math.max(u,0)/tr*100-Math.max(dn,0)/tr*100)/(Math.max(u,0)/tr*100+Math.max(dn,0)/tr*100+.001)*100}return s/(p*2-1)}
function cs(c){if(!c||c.length<210)return null;var r=(rsi(c,14).slice(-1)[0])||50,a=adx(c,14),p1=0,p2=0,p3=0;
if(c.length>=200){var m6=c.slice(-6).reduce(function(a,b){return a+b},0)/6,m40=c.slice(-40).reduce(function(a,b){return a+b},0)/40,m70=c.slice(-70).reduce(function(a,b){return a+b},0)/70,m200=c.slice(-200).reduce(function(a,b){return a+b},0)/200;if(m6>m40)p1+=12;if(m6>m70)p1+=10;if(m40>m200)p1+=13}
if(r>50&&r<70)p2+=12;else if(r>=35)p2+=7;else p2+=2;if(a>35)p2+=15;else if(a>25)p2+=10;else p2+=3;
var pr=c[c.length-1];var bb20=c.slice(-20).reduce(function(a,b){return a+b},0)/20;var bbs=Math.sqrt(c.slice(-20).map(function(cl){return(cl-bb20)*(cl-bb20)}).reduce(function(a,b){return a+b},0)/20);var bbp=bbs>0?(pr-(bb20-2*bbs))/((bb20+2*bbs)-(bb20-2*bbs)):.5;
if(bbp<.15)p3=28;else if(bbp<.35)p3=20;else if(bbp<.65)p3=14;else if(bbp<.85)p3=7;else p3=2;
var t=Math.min(100,Math.max(0,p1+p2+p3));var sg,dc,zn;
if(t>=78){sg='COMPRA FUERTE';dc='LONG';zn='Euforia'}else if(t>=62){sg='COMPRA';dc='LONG PRUDENTE';zn='Optimismo'}else if(t>=52){sg='ACUMULAR';dc='ESPERAR';zn='Neutral+'}else if(t>=42){sg='NEUTRAL';dc='ESPERAR';zn='Neutral'}else if(t>=30){sg='VENTA';dc='SHORT PRUDENTE';zn='Miedo'}else if(t>=18){sg='VENTA FUERTE';dc='SHORT';zn='Acumulacion'}else{sg='CAPITULACION';dc='CASH/FUERA';zn='Panico'}
return{total:t,p1,p2,p3,rsi:r,adx:a,signal:sg,decision:dc,zone:zn,price:pr}}

function updateUI(sc){
 $('smScore').textContent=sc.total;$('heroScore').textContent=sc.total;$('heroScoreNum').textContent=sc.total;$('heroBar').style.width=sc.total+'%';
 var se=$('smSignal');if(se){se.textContent=sc.signal;se.className='score-signal '+(sc.signal.indexOf('COMPRA')>=0?'score-buy':sc.signal.indexOf('VENTA')>=0||sc.signal==='CAPITULACION'?'score-sell':sc.signal==='ACUMULAR'?'score-accum':'score-neutral')}
 $('heroSignal').textContent=sc.signal;$('heroDecision').textContent=sc.decision;$('heroZone').textContent=sc.zone;$('smDecision').textContent=sc.decision+' - '+sc.zone;
 $('smP1').textContent='P1: '+sc.p1+'/35';$('smP2').textContent='P2: '+sc.p2+'/35';$('smP3').textContent='P3: '+sc.p3+'/30';
 $('smRSI').textContent='RSI: '+fn(sc.rsi,1);$('heroRsi').textContent=fn(sc.rsi,1);$('smADX').textContent='ADX: '+fn(sc.adx,1);$('heroAdx').textContent=fn(sc.adx,1);
 $('heroTime').textContent=ts()
}
async function updateScore(a){a=a||'BTCUSDT';try{var d=await fj(B+'/klines?symbol='+a+'&interval=15m&limit=210');var cl=d.map(function(k){return parseFloat(k[4])});var sc=cs(cl);if(sc)updateUI(sc)}catch(ex){}}
async function lp(a){a=a||'BTCUSDT';try{var d=await fj(B+'/ticker/24hr?symbol='+a);var e=await fj(B+'/ticker/price?symbol=EURUSDT');ER=parseFloat(e.price)||.857;PD={usd:parseFloat(d.lastPrice),chg:parseFloat(d.priceChangePercent)};ap()}catch(ex){}}
function ap(){if(!PD)return;var u=PD.usd,c=PD.chg,eu=u*ER,up=c>=0;
 $('btcUsdLive').textContent='$'+fn(u,2);$('btcEurLive').textContent='\\u20AC'+fn(eu,2);
 $('previewPrice').textContent='$'+fn(u,2);$('previewChange').textContent=(up?'+':'')+fn(c,2)+'%';
 var bdg=$('btcChange24hLive');if(bdg){bdg.textContent=(up?'+':'')+fn(c,2)+'% 24h';bdg.className='badge '+(c>.3?'positivo':c<-.3?'negativo':'neutro')}
 $('lastUpdateBTC').textContent='Actualizado: '+ts()
}
async function loadFN(){try{var d=await fj('https://api.alternative.me/fng/?limit=1&format=json');var v=parseInt(d.data[0].value),lbl=d.data[0].value_classification;$('fearValue').textContent=v;$('fearLabel').textContent=lbl;$('heroFng').textContent=v}catch(ex){}}
async function loadCG(){try{var d=await fj(CG+'/global');var g=d.data,mp=g.market_cap_percentage;
 $('btcDominanceValue').textContent=(mp.btc||0).toFixed(2)+'%';$('ethDominanceValue').textContent=(mp.eth||0).toFixed(2)+'%';
 $('altsDominanceValue').textContent=(100-(mp.btc||0)-(mp.eth||0)).toFixed(2)+'%';$('marketCapValue').textContent=fb(g.total_market_cap?.usd||0);$('volumeValue').textContent='Vol 24h: '+fb(g.total_volume?.usd||0);
 var fg=parseInt($('fearValue')?.textContent)||50;var bd=mp.btc||50;var state='',text='',score=50;
 if(fg<25&&bd>55){state='ACUMULACION';text='Miedo extremo + dominancia alta';score=28}else if(fg<40){state='PRECAUCION';text='Miedo en el mercado';score=45}else if(fg<55){state='NEUTRAL';text='Sin direccion clara';score=55}else if(fg<75){state='OPTIMISMO';text='Confianza creciente';score=72}else{state='EUFORIA';text='Greed extremo, posible techo';score=85}
 $('macroState').textContent=state;$('macroText').textContent=text;$('macroScore').textContent=score;
 var ec=$('cardMacroState');if(ec)ec.className='estado '+(score<35?'macro-bear':score<55?'macro-neutral':'macro-bull');
 $('lastUpdateMacro').textContent='Actualizado: '+ts();$('cryptoRegimeLabel').textContent=state;$('cryptoRegimeDetail').textContent=text+' | Dom '+bd.toFixed(1)+'% | F&G '+fg
}catch(ex){}}
async function loadVIX(){try{var d=await fj(VM);VIX=d;var v=parseFloat(d.vix)||0;$('vixValue').textContent=v.toFixed(2)}catch(ex){if(!VIX)$('vixValue').textContent='--'}}
async function loadRSI3D(){try{var d=await fj(B+'/klines?symbol=BTCUSDT&interval=3d&limit=20');var cl=d.map(function(k){return parseFloat(k[4])});var r=rsi(cl,14);var v=r[r.length-1];$('rsiMacroValue').textContent=fn(v,1);$('rsiMacroLabel').textContent=v<30?'Sobreventa':v>70?'Sobrecompra':v<45?'Bajista':v>55?'Alcista':'Neutral'}catch(ex){}}

// Asset selector
document.querySelectorAll('.asset-btn').forEach(function(btn){
 btn.addEventListener('click',function(){
  document.querySelectorAll('.asset-btn').forEach(function(b){b.classList.remove('active')});
  this.classList.add('active');var a=this.dataset.asset;
  var sm={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};var s=sm[a]||'BTCUSDT';
  $('assetLabel').textContent=a;$('previewAsset').textContent=a+'USDT - LIVE';lp(s);updateScore(s)
 })
})

// INIT
lp();updateScore();loadFN();loadCG();loadVIX();loadRSI3D();
setInterval(function(){var a=document.querySelector('.asset-btn.active');var sym=a?{BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'}[a.dataset.asset]:'BTCUSDT';lp(sym);updateScore(sym)},60000);
setInterval(function(){loadFN();loadCG();loadVIX();loadRSI3D()},120000);
setInterval(function(){$('liveLabel').textContent='Live - '+ts()},5000);
setInterval(function(){$('footerTime').textContent=ts()},10000);
'''

# Replace script content
old_script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if old_script_match:
    old_full = old_script_match.group(0)
    new_full = '<script>' + new_script + '</script>'
    html = html.replace(old_full, new_full)
    print('2. JS reemplazado')

    # Verify the new JS compiles
    try:
        compile(new_script, '<test>', 'exec')
        print('   JS syntax: OK')
    except SyntaxError as e:
        print(f'   JS syntax ERROR line {e.lineno}: {e.msg}')
else:
    print('2. No <script> tag found!')

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Hecho. {len(html)} bytes total')
'''