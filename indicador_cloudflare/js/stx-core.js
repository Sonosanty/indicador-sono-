/* SONO TERMINAL X — stx-core.js
   Versión: STX 1.0 · 7 junio 2026
   Lecciones del informe de 18 errores integradas:
   - Sin onclick inline (addEventListener en init)
   - geEstado() normaliza estado/status minúsculas
   - calcRActual() en WS tick
   - EUR via Binance EURUSDT (sin CORS)
   - Watchdog WS 15s + reconexión automática
   - VWAP y ATR del sono_terminal_definitivo
*/
'use strict';

/* ── APIs ── */
const WS_URL   = 'wss://stream.binance.com:9443/ws';
const BN_REST  = 'https://api.binance.com/api/v3';
const FNG_URL  = 'https://api.alternative.me/fng/?limit=1';
const CG_URL   = 'https://api.coingecko.com/api/v3/global';
const COINS    = {BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};

/* ── ESTADO GLOBAL ── */
let coin    = 'BTC';
let livePx  = 0;
let eurRate = 1.08;   // via Binance EURUSDT, sin CORS
let wsConn  = null;
let wsLast  = 0;
let wsTimer = null;
let wsRetry = false;
let allTrades = [];
let alerts  = [];
let lastSC  = null;   // último score calculado para página Método

/* ── UTILS ── */
const $ = id => document.getElementById(id);
const fU = (n,d=0) => '$'+n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);
const fP = n => (n>=0?'+':'')+n.toFixed(2)+'%';
const fR = n => (n>=0?'+':'')+n.toFixed(2)+'R';
const cG = n => n>=0?'var(--green)':'var(--red)';

function fetchJ(url){
  return fetch(url,{cache:'no-store'})
    .then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
}

/* ════════════════════════════════════════════════════
   WEBSOCKET — Watchdog + reconexión automática
   Lección C4 del informe: sin watchdog el WS muere silenciosamente
════════════════════════════════════════════════════ */
function startWS(){
  if(wsConn){try{wsConn.close();}catch(e){} wsConn=null;}
  const sym = COINS[coin].toLowerCase();
  try{ wsConn = new WebSocket(WS_URL+'/'+sym+'@aggTrade'); }
  catch(e){ setBadge(false); scheduleWS(); return; }

  wsConn.onopen = () => {
    wsLast = Date.now();
    setBadge(true);
    addAlert('WS','teal','WebSocket '+coin+' conectado');
  };

  wsConn.onmessage = e => {
    wsLast = Date.now();
    const ts = new Date().toLocaleTimeString('es-ES');
    $('clockEl').textContent = ts;
    $('tTick').textContent   = 'Tick: '+ts;
    try{
      const d = JSON.parse(e.data);
      livePx = parseFloat(d.p);
      updatePriceUI(livePx);
      updateSRLive(livePx);
      updateTradesR(livePx);
      updateRangeLive(livePx);
    }catch(err){}
  };

  wsConn.onerror = () => setBadge(false);
  wsConn.onclose = () => { setBadge(false); scheduleWS(); };
}

function startWatchdog(){
  if(wsTimer) clearInterval(wsTimer);
  wsTimer = setInterval(()=>{
    if(wsLast>0 && (Date.now()-wsLast)>15000){
      setBadge(false);
      scheduleWS();
    }
  },5000);
}

function scheduleWS(){
  if(wsRetry)return;
  wsRetry = true;
  setTimeout(()=>{ wsRetry=false; startWS(); },3000);
}

function setBadge(live){
  const b=$('wsBadge'),d=$('wsDot'),t=$('wsText');
  b.className='ws-chip '+(live?'ws-live':'ws-dead');
  d.className='ws-dot '+(live?'dot-t':'dot-r');
  t.textContent = live?'LIVE':'SIN SEÑAL';
}

/* ════════════════════════════════════════════════════
   TICKER 24H — H/L/Vol reales
   Lección C5: mapear TODOS los campos del ticker al DOM
════════════════════════════════════════════════════ */
async function loadTicker(){
  try{
    const d = await fetchJ(BN_REST+'/ticker/24hr?symbol='+COINS[coin]);
    const h=parseFloat(d.highPrice), l=parseFloat(d.lowPrice),
          v=parseFloat(d.volume),    chg=parseFloat(d.priceChangePercent);

    if(livePx===0){ livePx=parseFloat(d.lastPrice); updatePriceUI(livePx); }

    // H / L
    $('h24').textContent = fU(h);
    $('l24').textContent = fU(l);

    // Vol en K o M
    const vs = v>=1e6?(v/1e6).toFixed(2)+'M':v>=1e3?(v/1e3).toFixed(1)+'K':v.toFixed(0);
    $('vol24').textContent = vs+' '+coin;

    // Cambio 24h
    const ce=$('priceChg');
    ce.textContent = (chg>=0?'▲ +':'▼ ')+Math.abs(chg).toFixed(2)+'%';
    ce.className   = 'price-chg '+(chg>=0?'up':'dn');
    ce.style.display = '';

    $('tBTCChg').textContent = (chg>=0?'+':'')+chg.toFixed(2)+'% 24h';
  }catch(e){ console.error('ticker',e); }
}

function updatePriceUI(px){
  $('priceUSD').textContent  = fU(px,2);
  $('tBTCPx').textContent    = fU(px,2);
  $('priceEUR').textContent  = '≈ '+Math.round(px*eurRate).toLocaleString('es-ES')+' EUR';
  // También en rangos
  const rp=$('rangePx'); if(rp) rp.textContent=fU(px,2);
}

/* ════════════════════════════════════════════════════
   INDICADORES TÉCNICOS — motor unificado
   Integra: SMA, RSI, ADX, Bollinger, VWAP, ATR
   del sono_terminal_definitivo.html
════════════════════════════════════════════════════ */
function smaLast(arr,p){ if(arr.length<p)return null; return arr.slice(-p).reduce((a,b)=>a+b,0)/p; }
function smaArr(arr,p){
  const o=new Array(arr.length).fill(null);
  for(let i=p-1;i<arr.length;i++) o[i]=arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p;
  return o;
}

function rsiLast(cl,p=14){
  if(cl.length<p+1)return null;
  let g=0,l=0;
  for(let i=cl.length-p;i<cl.length;i++){ const d=cl[i]-cl[i-1]; if(d>0)g+=d; else l-=d; }
  return Math.round(100-(100/(1+(g/p)/((l/p)||0.001))));
}

function adxLast(hi,lo,cl,p=14){
  if(cl.length<p+2)return null;
  let pd=0,md=0,tr=0;
  for(let i=cl.length-p;i<cl.length;i++){
    const pH=hi[i]-hi[i-1],mL=lo[i-1]-lo[i];
    pd+=(pH>mL&&pH>0?pH:0); md+=(mL>pH&&mL>0?mL:0);
    tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1]));
  }
  const pDI=100*pd/(tr||1),mDI=100*md/(tr||1);
  return Math.round(Math.abs(pDI-mDI)/((pDI+mDI)||1)*100);
}

function bbLast(cl,p=20,k=2){
  if(cl.length<p)return{pb:null,bw:null};
  const sl=cl.slice(-p), m=sl.reduce((a,b)=>a+b,0)/p;
  const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/p);
  const u=m+k*sd, dn=m-k*sd;
  return{pb:+((cl[cl.length-1]-dn)/((u-dn)||1)).toFixed(3), bw:+((u-dn)/m*100).toFixed(2)};
}

/* VWAP — del sono_terminal_definitivo */
function calcVWAP(candles){
  if(!candles||candles.length===0)return null;
  let tv=0,tpv=0;
  candles.slice(-50).forEach(c=>{
    const tp=(c.h+c.l+c.c)/3;
    const v=c.v||1;
    tpv+=tp*v; tv+=v;
  });
  return tv>0?Math.round(tpv/tv):null;
}

/* ATR — del sono_terminal_definitivo */
function calcATR(hi,lo,cl,p=14){
  if(cl.length<p+1)return null;
  const trs=[];
  for(let i=cl.length-p;i<cl.length;i++){
    trs.push(Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1])));
  }
  return Math.round(trs.reduce((a,b)=>a+b,0)/p);
}

/* Score Maestro */
function computeScore(cl,hi,lo){
  const px=cl[cl.length-1];
  const ma6=smaLast(cl,6),ma40=smaLast(cl,40),ma70=smaLast(cl,70),ma200=smaLast(cl,200);
  const rv=rsiLast(cl), av=adxLast(hi,lo,cl);
  const{pb,bw}=bbLast(cl);

  let p1=0;
  if(ma6!=null&&ma70!=null) p1+=ma6>ma70?15:0;
  if(ma40!=null)             p1+=px>ma40?10:0;
  if(ma200!=null)            p1+=px>ma200?10:0;

  let p2=0;
  if(av!=null) p2+=av>25?15:av>18?8:0;
  if(rv!=null) p2+=rv>65?8:rv>55?20:rv>50?14:rv<30?18:rv<45?6:10;

  let p3=0;
  if(pb!=null) p3=pb>0.85?4:pb>0.55?20:pb>0.2?30:pb>0?18:5;

  return{score:Math.min(100,Math.round(p1+p2+p3)),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),
    ma6,ma40,ma70,ma200,px,rv,av,pb,bw};
}

function calcSR(hi,lo,n=25){
  const rh=Math.max(...hi.slice(-n)),rl=Math.min(...lo.slice(-n)),rng=rh-rl;
  return{r2:rh+rng*0.10,r1:rh,s1:rl,s2:rl-rng*0.10};
}

async function loadKlines(tf,limit=220){
  const d=await fetchJ(BN_REST+'/klines?symbol='+COINS[coin]+'&interval='+tf+'&limit='+limit);
  return d.map(c=>({t:+c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4],v:+c[5]}));
}

async function refreshIndicators(){
  try{
    const c  = await loadKlines('15m',220);
    const cl = c.map(x=>x.c), hi=c.map(x=>x.h), lo=c.map(x=>x.l);
    const sc = computeScore(cl,hi,lo);
    lastSC   = sc;

    // VWAP y ATR
    const vwap = calcVWAP(c);
    const atr  = calcATR(hi,lo,cl);
    if(vwap) $('vwapEl').textContent = fU(vwap);
    if(atr)  $('atrEl').textContent  = fU(atr);

    renderScore(sc);
    renderMAs(sc);
    renderSignals(sc);
    renderInd(sc.rv,sc.av,sc.pb,sc.ma40,sc.px);

    const sr = calcSR(hi,lo,25);
    renderSR(sr,sc.px);

    // Método page
    updateMetodoPg(sc);

  }catch(e){ console.error('refreshIndicators',e); }
}

async function refreshMTF(){
  const tfs=['1m','3m','5m','15m'],ids=['mtf1m','mtf3m','mtf5m','mtf15m'];
  const w=[0.10,0.15,0.25,0.50];
  const scores=[];
  for(const tf of tfs){
    try{
      const c=await loadKlines(tf,220);
      const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      scores.push(computeScore(cl,hi,lo).score);
    }catch(){ scores.push(0); }
  }
  scores.forEach((s,i)=>{ const e=$(ids[i]); if(e){e.textContent=s;e.style.color=sColor(s);} });
  const mtf=Math.round(scores.reduce((a,s,i)=>a+s*w[i],0));
  const mt=$('mtfTotal'); if(mt){mt.textContent=mtf;mt.style.color=sColor(mtf);}
}

/* ════════════════════════════════════════════════════
   RENDER FUNCIONES — cada una con IDs únicos y claros
════════════════════════════════════════════════════ */
function sColor(s){
  if(s>=78)return'var(--blue)'; if(s>=62)return'var(--green)'; if(s>=52)return'#86efac';
  if(s>=42)return'var(--tx3)';  if(s>=30)return'var(--amber)'; if(s>=18)return'#fca5a5';
  return'var(--red)';
}
function sLabel(s){
  if(s>=78)return['Compra fuerte','LONG'];   if(s>=62)return['Compra','LONG prudente'];
  if(s>=52)return['Acumular','Parcial'];      if(s>=42)return['Neutral','Esperar'];
  if(s>=30)return['Venta','SHORT'];           if(s>=18)return['Venta fuerte','SHORT'];
  return['Capitulación','CASH'];
}

function renderScore({score,p1,p2,p3}){
  const col=sColor(score);
  // Ring
  $('ringArc').style.strokeDashoffset = 326-(326*score/100);
  $('ringArc').style.stroke           = col;
  $('scoreNum').textContent = score; $('scoreNum').style.color=col;
  const[l,d]=sLabel(score);
  $('scoreLbl').textContent=l; $('scoreLbl').style.color=col;
  $('scoreZone').textContent=d;
  // Pilares
  $('p1pts').textContent=p1+'/35'; $('p1bar').style.width=(p1/35*100)+'%';
  $('p2pts').textContent=p2+'/35'; $('p2bar').style.width=(p2/35*100)+'%';
  $('p3pts').textContent=p3+'/30'; $('p3bar').style.width=(p3/30*100)+'%';
  // Zonas highlight
  document.querySelectorAll('#zonaLst .zona-r').forEach(el=>{
    el.classList.toggle('zac',score>=+el.dataset.min);
  });
}

function renderMAs({ma6,ma40,ma70,ma200,px}){
  function set(vi,di,ma){
    if(ma==null)return;
    const d=(px-ma)/ma*100;
    $(vi).textContent=fU(ma,0); $(di).textContent=fP(d); $(di).style.color=cG(d);
  }
  set('ma6v','ma6d',ma6); set('ma40v','ma40d',ma40);
  set('ma70v','ma70d',ma70); set('ma200v','ma200d',ma200);
}

function renderSignals({ma6,ma40,ma70,ma200,px,rv,av,pb}){
  function sig(di,vi,ok,val){
    $(di).style.background=ok?'var(--teal)':'var(--tx3)';
    $(vi).textContent=val; $(vi).style.color=ok?'var(--teal)':'var(--tx3)';
  }
  sig('d_ma6x70','v_ma6x70',ma6&&ma70&&ma6>ma70, ma6&&ma70?(ma6>ma70?'↑ activa':'↓ inact'):'--');
  sig('d_ma40','v_ma40',ma40&&px>ma40,ma40?fP((px-ma40)/ma40*100):'--');
  sig('d_ma200','v_ma200',ma200&&px>ma200,ma200?fP((px-ma200)/ma200*100):'--');
  sig('d_adx','v_adx',av!=null&&av>25,av!=null?'ADX '+av:'--');
  sig('d_rsi','v_rsi',rv!=null&&(rv<30||rv>55),rv!=null?'RSI '+rv:'--');
  sig('d_bb','v_bb',pb!=null&&(pb<0.2||pb>0.5),pb!=null?'%B '+pb.toFixed(2):'--');
}

function renderInd(rv,av,pb,ma40,px){
  $('indRSI').textContent=rv!=null?rv:'--';
  $('indRSI').style.color=rv<30?'var(--teal)':rv>70?'var(--red)':'var(--cyan)';
  $('indRSIl').textContent=rv<30?'Sobreventa':rv>70?'Sobrecompra':'Neutral';
  $('indADX').textContent=av!=null?av:'--';
  $('indADX').style.color=av>30?'var(--green)':av>25?'var(--purple)':'var(--tx3)';
  $('indADXl').textContent=av>30?'Tendencia fuerte':av>25?'Tendencia activa':'Sin tendencia';
  $('indBB').textContent=pb!=null?pb.toFixed(2):'--';
  $('indBB').style.color=pb<0.2?'var(--teal)':pb>0.8?'var(--red)':'var(--cyan)';
  $('indBBl').textContent=pb<0.2?'Sobreventa':pb>0.8?'Sobrecompra':'Zona media';
  if(ma40&&px){
    const d=(px-ma40)/ma40*100;
    $('indMA40d').textContent=fP(d); $('indMA40d').style.color=cG(d);
    $('indMA40l').textContent=d>=0?'sobre MA40':'bajo MA40';
  }
}

function renderSR({r2,r1,s1,s2},px){
  $('srR2').textContent=fU(r2,0); $('srR1').textContent=fU(r1,0);
  $('srS1').textContent=fU(s1,0); $('srS2').textContent=fU(s2,0);
  if(px>0) $('srLive').textContent=fU(px,2);
}

function updateSRLive(px){ if(px>0){const e=$('srLive');if(e)e.textContent=fU(px,2);} }

/* ════════════════════════════════════════════════════
   PÁGINA MÉTODO — actualiza pilares en detalle
════════════════════════════════════════════════════ */
function updateMetodoPg(sc){
  const{score,p1,p2,p3,ma6,ma40,ma200,rv,av,pb,bw}=sc;
  const col=sColor(score);
  const ms=$('met-score'); if(ms){ms.textContent=score;ms.style.color=col;}
  const[l]=sLabel(score);
  const ml=$('met-lbl'); if(ml){ml.textContent=l;ml.style.color=col;}
  const mp1=$('met-p1'); if(mp1){mp1.textContent=p1+' pts';mp1.style.color='var(--blue)';}
  const mp1b=$('met-p1bar'); if(mp1b)mp1b.style.width=(p1/35*100)+'%';
  const mp1d=$('met-p1d'); if(mp1d)mp1d.textContent='MA6:'+(ma6?fU(ma6,0):'--')+' · MA40:'+(ma40?fU(ma40,0):'--')+' · MA200:'+(ma200?fU(ma200,0):'--');
  const mp2=$('met-p2'); if(mp2){mp2.textContent=p2+' pts';mp2.style.color='var(--green)';}
  const mp2b=$('met-p2bar'); if(mp2b)mp2b.style.width=(p2/35*100)+'%';
  const mp2d=$('met-p2d'); if(mp2d)mp2d.textContent='ADX: '+(av??'--')+' · RSI: '+(rv??'--');
  const mp3=$('met-p3'); if(mp3){mp3.textContent=p3+' pts';mp3.style.color='var(--amber)';}
  const mp3b=$('met-p3bar'); if(mp3b)mp3b.style.width=(p3/30*100)+'%';
  const mp3d=$('met-p3d'); if(mp3d)mp3d.textContent='%B: '+(pb!=null?pb.toFixed(2):'--')+' · BW: '+(bw!=null?bw+'%':'--');
}

/* ════════════════════════════════════════════════════
   RANGOS — Market Structure Radar multi-TF
   Del sono_terminal_definitivo
════════════════════════════════════════════════════ */
async function renderRangosPage(){
  const grid=$('rangeGrid');
  if(!grid)return;
  grid.innerHTML='<div class="range-card" style="grid-column:1/-1"><div class="card-hd">Calculando rangos...</div></div>';

  const tfs=['15m','5m','3m','1m'];
  const results=[];

  for(const tf of tfs){
    try{
      const c=await loadKlines(tf,60);
      const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      const px=cl[cl.length-1];
      const rh=Math.max(...hi.slice(-20)),rl=Math.min(...lo.slice(-20)),rng=rh-rl;
      const r2=Math.round(rh+rng*0.1),r1=Math.round(rh),s1=Math.round(rl),s2=Math.round(rl-rng*0.1);
      const rv=rsiLast(cl),av=adxLast(hi,lo,cl);
      const pct=(px-rl)/rng;
      const zona=pct>0.7?'⬆ ZONA ALTA':pct<0.3?'⬇ ZONA BAJA':'◆ ZONA MEDIA';
      const presion=av&&av>25?(rv&&rv>50?'Compradora':'Vendedora'):'Neutra';
      results.push({tf,px,r2,r1,s1,s2,zona,presion,rv,av});
    }catch(e){ results.push({tf,px:livePx,r2:0,r1:0,s1:0,s2:0,zona:'--',presion:'--',rv:null,av:null}); }
  }

  grid.innerHTML=results.map((r,i)=>`
    <div class="range-card">
      <div class="rng-hd">
        <div>
          <div class="rng-tf">${r.tf} ${i===0?'<span style="font-size:10px;padding:1px 7px;border-radius:4px;background:rgba(0,212,160,.15);color:var(--teal);margin-left:6px">DOMINANTE</span>':''}</div>
          <div class="rng-state">${r.zona}</div>
        </div>
        <div class="rng-pres">
          <div style="font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Presión</div>
          <div class="rng-pres-v">${r.presion.toUpperCase()}</div>
          <div class="rng-pres-s">${r.rv!=null?'RSI '+r.rv:'--'}</div>
        </div>
      </div>
      <div class="rng-levels">
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--red)">R2</div><div class="rng-lv-px">${r.r2>0?fU(r.r2):'---'}</div><div class="rng-lv-tp">resistencia</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--red)">R1</div><div class="rng-lv-px">${r.r1>0?fU(r.r1):'---'}</div><div class="rng-lv-tp">resistencia</div></div>
        <div class="rng-lv rng-lv-live"><div class="rng-lv-lb" style="color:var(--teal)">●</div><div class="rng-lv-px" style="color:var(--teal)" data-range-live="${r.tf}">${fU(livePx>0?livePx:r.px,2)}</div><div class="rng-lv-tp">live</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--green)">S1</div><div class="rng-lv-px">${r.s1>0?fU(r.s1):'---'}</div><div class="rng-lv-tp">soporte</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--green)">S2</div><div class="rng-lv-px">${r.s2>0?fU(r.s2):'---'}</div><div class="rng-lv-tp">soporte</div></div>
      </div>
      <div class="rng-meta">
        <div class="rng-mi"><div class="rng-mi-lb">RSI</div><div class="rng-mi-v" style="color:${r.rv!=null?(r.rv<30?'var(--teal)':r.rv>70?'var(--red)':'var(--tx2)'):'var(--tx3)'}">${r.rv??'--'}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">ADX</div><div class="rng-mi-v" style="color:${r.av!=null&&r.av>25?'var(--green)':'var(--tx3)'}">${r.av??'--'}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">Contexto</div><div class="rng-mi-v">${r.zona.split(' ').slice(1,3).join(' ')}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">Presión</div><div class="rng-mi-v">${r.presion}</div></div>
      </div>
    </div>
  `).join('');

  const rb=$('rangeBias');
  if(rb&&results[0]){
    rb.textContent='Bias dominante 15m: '+results[0].zona+' · Presión: '+results[0].presion;
    rb.style.color=results[0].presion==='Compradora'?'var(--teal)':results[0].presion==='Vendedora'?'var(--red)':'var(--tx3)';
  }
}

function updateRangeLive(px){
  document.querySelectorAll('[data-range-live]').forEach(el=>{
    if(px>0) el.textContent=fU(px,2);
  });
}

/* ════════════════════════════════════════════════════
   TRADES — geEstado + calcRActual en tiempo real
   Lecciones C5 del informe: normalizar estado/status y r/r_actual
════════════════════════════════════════════════════ */
function parseP(s){ return parseFloat(String(s).replace(/[$,]/g,'')); }

/* geEstado normaliza estado o status en minúsculas/mayúsculas */
function geEstado(t){
  return ((t.estado||t.status||'')).toUpperCase().trim();
}

/* calcRActual — se llama en cada tick WS para trades OPEN */
function calcRActual(t,px){
  if(geEstado(t)!=='OPEN')return null;
  const e=parseP(t.entry), sl=parseP(t.sl), riskR=Math.abs(e-sl);
  if(!riskR)return 0;
  const side=(t.side||'LONG').toUpperCase();
  return (side==='LONG'?px-e:e-px)/riskR;
}

function renderTrades(list,px){
  const closed=list.filter(t=>geEstado(t)!=='OPEN');
  const open  =list.filter(t=>geEstado(t)==='OPEN');
  const tp=closed.filter(t=>geEstado(t).startsWith('TP')).length;
  const sl=closed.filter(t=>geEstado(t).startsWith('SL')).length;
  const be=closed.filter(t=>geEstado(t).startsWith('BE')).length;
  const rs=closed.map(t=>parseFloat(t.r_actual??t.r)||0);
  const rt=rs.reduce((a,b)=>a+b,0);
  const wins=rs.filter(r=>r>0).length;
  const wr=closed.length>0?(wins/closed.length*100).toFixed(1):'0.0';
  const wA=rs.filter(r=>r>0).reduce((a,b)=>a+b,0);
  const lA=Math.abs(rs.filter(r=>r<0).reduce((a,b)=>a+b,0));
  const pf=lA>0?(wA/lA).toFixed(2):'∞';
  const pnl=closed.reduce((a,t)=>a+(parseFloat(t.pnl)||0),0);
  const dd=Math.min(0,...rs,0);

  $('tOpen').textContent   =open.length;
  $('tOpenSub').textContent=open.map(t=>t.side||'?').join(' · ')||'--';
  $('tClosed').textContent =closed.length;
  $('tClosedSub').textContent='TP:'+tp+' BE:'+be+' SL:'+sl;
  $('stTPBESL').textContent=tp+'/'+be+'/'+sl;
  $('stWR').textContent=wr+'%';
  $('stRT').textContent=fR(rt); $('stRT').style.color=cG(rt);
  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);
  $('stPF').textContent=pf;
  $('stDD').textContent=dd.toFixed(2)+'R'; $('stDD').style.color=dd<0?'var(--red)':'var(--green)';

  const tbody=$('tradesTbody');
  tbody.innerHTML='';
  [...list].reverse().forEach(t=>{
    const est=geEstado(t), isOpen=est==='OPEN';
    const r=isOpen?calcRActual(t,px):parseFloat(t.r_actual??t.r);
    const rStr=r!=null?fR(r):'--', rClr=r!=null?cG(r):'var(--tx3)';
    let bc='b-op',bt=t.estado||t.status||'?';
    if(est.startsWith('TP')){bc='b-tp';bt='TP ✓';}
    else if(est.startsWith('SL')){bc='b-sl';bt='SL ✗';}
    else if(est.startsWith('BE')){bc='b-be';bt='BE —';}
    const tr=document.createElement('tr');
    if(isOpen) tr.dataset.tradeId=t.id;
    tr.innerHTML=`<td>${t.id}</td><td><span class="badge ${bc}">${bt}</span></td><td>${t.tf||'--'}</td><td>${t.side||'--'}</td><td>${t.setup||'--'}</td><td>${t.entry||'--'}</td><td>${t.sl||'--'}</td><td>${t.tp1||'--'}</td><td>${t.mfe||'--'}</td><td>${t.mae||'--'}</td><td>${t.duration||t.dur||'--'}</td><td style="color:${rClr};font-weight:700" data-r="1">${rStr}</td>`;
    tbody.appendChild(tr);
  });
}

function updateTradesR(px){
  document.querySelectorAll('#tradesTbody tr[data-trade-id]').forEach(row=>{
    const t=allTrades.find(x=>String(x.id)===row.dataset.tradeId);
    if(!t)return;
    const r=calcRActual(t,px), cell=row.querySelector('[data-r]');
    if(cell&&r!=null){ cell.textContent=fR(r); cell.style.color=cG(r); }
  });
}

async function loadTrades(){
  try{
    const d=await fetchJ('/trades.json');
    allTrades=Array.isArray(d)?d:(d.trades||[]);
    renderTrades(allTrades,livePx);
    $('tradesStatus').textContent='trades.json · '+allTrades.length+' trades';
    addAlert('TRADES','teal',allTrades.length+' trades cargados');
  }catch(e){
    console.error('trades.json',e);
    $('tradesStatus').textContent='trades.json · error';
    $('tradesTbody').innerHTML='<tr><td colspan="12" style="text-align:center;color:var(--tx3);padding:1rem">No se pudo cargar trades.json</td></tr>';
  }
}

/* ════════════════════════════════════════════════════
   MACRO — F&G + CoinGecko + EUR via Binance
   Lección C6: EUR via Binance EURUSDT (sin CORS)
════════════════════════════════════════════════════ */
async function loadFG(){
  try{
    const d=await fetchJ(FNG_URL);
    const fg=parseInt(d.data[0].value), lb=d.data[0].value_classification;
    const c=fg<=20?'var(--teal)':fg<=40?'#86efac':fg<=60?'var(--tx3)':fg<=80?'var(--amber)':'var(--red)';
    $('mFNG').textContent=fg; $('mFNG').style.color=c;
    $('mFNGl').textContent=lb;
    $('mFNGb').style.width=fg+'%'; $('mFNGb').style.background=c;
    addAlert('F&G','teal','Fear & Greed: '+fg+' — '+lb);
  }catch(e){ console.error('FG',e); }
}

async function loadCG(){
  try{
    const d=await fetchJ(CG_URL);
    const dom=d.data.market_cap_percentage?.btc||0, mc=d.data.total_market_cap?.usd||0;
    $('mDOM').textContent=dom.toFixed(1)+'%';
    $('mDOMl').textContent=dom>60?'BTC dominante':dom>45?'Equilibrado':'Altseason';
    $('mDOMb').style.width=dom+'%';
    $('mMCAP').textContent=fK(mc);
    $('mMCAPl').textContent='Vol: '+fK(d.data.total_volume?.usd||0);
  }catch(e){ console.error('CG',e); }
}

/* EUR via Binance EURUSDT — sin CORS, sin rate-limit de open.er-api.com */
async function loadEUR(){
  try{
    const d=await fetchJ(BN_REST+'/ticker/price?symbol=EURUSDT');
    // EURUSDT es el precio de 1 EUR en USDT
    // Para convertir USD → EUR: EUR = USD * EURUSDT
    // Binance devuelve cuántos USD vale 1 EUR (ej: 1.08)
    eurRate = parseFloat(d.price);
    $('mEUR').textContent=eurRate.toFixed(4);
    $('mEURb').style.width=Math.min(100,(eurRate-0.8)*500)+'%';
    addAlert('EUR','teal','EUR/USD: '+eurRate.toFixed(4)+' via Binance');
  }catch(e){ console.error('EUR',e); eurRate=1.08; }
}

/* ════════════════════════════════════════════════════
   ALERT FEED
════════════════════════════════════════════════════ */
function addAlert(tag,color,msg){
  const t=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  alerts.unshift({t,tag,color,msg});
  if(alerts.length>10)alerts.pop();
  const cm={teal:'rgba(0,212,160,.12)',blue:'rgba(59,130,246,.15)',green:'rgba(34,197,94,.15)',amber:'rgba(245,158,11,.15)',red:'rgba(239,68,68,.15)'};
  const ct={teal:'var(--teal)',blue:'var(--blue)',green:'var(--green)',amber:'var(--amber)',red:'var(--red)'};
  const al=$('alertLst');
  if(al) al.innerHTML=alerts.map(a=>`<div class="al-row"><div class="al-t">${a.t}</div><div class="al-tg" style="background:${cm[a.color]||cm.blue};color:${ct[a.color]||ct.blue}">${a.tag}</div><div class="al-m">${a.msg}</div></div>`).join('');
}

/* ════════════════════════════════════════════════════
   NAVEGACIÓN SPA — sin onclick inline (CSP C3)
   Lección C7: _routes.json + SPA router
════════════════════════════════════════════════════ */
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('ac',b.dataset.page===id));
  const pg=$('page-'+id); if(pg) pg.classList.add('active');
  if(id==='rangos') renderRangosPage();
  if(id==='metodo'&&lastSC) updateMetodoPg(lastSC);
  history.pushState({page:id},'',(id==='dashboard'?'/':'/'+id));
}

/* ════════════════════════════════════════════════════
   SELECTOR DE MONEDA
════════════════════════════════════════════════════ */
function setCoin(c){
  coin=c; livePx=0;
  document.querySelectorAll('#coinBtns .cb-btn').forEach(b=>b.classList.toggle('ac',b.dataset.coin===c));
  ['priceUSD','h24','l24','vol24','priceEUR','vwapEl','atrEl'].forEach(id=>{const e=$(id);if(e)e.textContent='---';});
  $('priceChg').style.display='none';
  startWS();
  loadTicker();
  refreshIndicators();
  addAlert('COIN','blue','Moneda cambiada a '+c);
}

/* ════════════════════════════════════════════════════
   INIT — Arranque completo
   Orden: EUR → WS → Ticker → Indicadores → Macro → Trades → MTF
════════════════════════════════════════════════════ */
(async function init(){
  console.log('SONO TERMINAL X iniciando...');

  /* Reloj */
  setInterval(()=>{ $('clockEl').textContent=new Date().toLocaleTimeString('es-ES'); },1000);

  /* Navegación SPA sin onclick inline */
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>showPage(btn.dataset.page));
  });
  document.querySelectorAll('#coinBtns .cb-btn').forEach(btn=>{
    btn.addEventListener('click',()=>setCoin(btn.dataset.coin));
  });
  window.addEventListener('popstate',e=>{
    if(e.state&&e.state.page) showPage(e.state.page);
  });

  /* Datos */
  await loadEUR();
  startWS();
  startWatchdog();
  loadTicker();
  refreshIndicators();
  loadFG();
  loadCG();
  loadTrades();
  setTimeout(refreshMTF,5000);

  /* Refrescos periódicos */
  setInterval(loadTicker,       30_000);
  setInterval(refreshIndicators,60_000);
  setInterval(loadFG,          300_000);
  setInterval(loadCG,          300_000);
  setInterval(loadEUR,        3600_000);
  setInterval(loadTrades,      120_000);
  setInterval(refreshMTF,      120_000);

  addAlert('STX','teal','SONO Terminal X iniciado · datos reales activos');
})();
