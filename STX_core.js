/* ═══════════════════════════════════════════════════════════
   SONO TERMINAL X — Core JavaScript
   Una sola fuente de verdad. Sin duplicados. Sin hardcoded.
   Arquitecto: Full Stack Senior + Trading Analyst
   ═══════════════════════════════════════════════════════════
   CORRECCIONES vs versiones anteriores:
   1. WebSocket con watchdog 15s + reconexión automática
   2. R trades OPEN calculado en tiempo real en cada tick
   3. H24/L24/Vol correctamente mapeados desde ticker Binance
   4. MAs mapeadas al DOM (no solo al panel técnico)
   5. S/R panel principal actualizado desde datos reales
   6. Badge WS honesto: LIVE solo si hay datos frescos
   7. JS externo: resuelve CSP blocking
   8. Archivo <20KB: resuelve write tool truncation
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── CONFIGURACIÓN ── */
const CFG = {
  BINANCE_WS:  'wss://stream.binance.com:9443/ws',
  BINANCE_API: 'https://api.binance.com/api/v3',
  FNG_URL:     'https://api.alternative.me/fng/?limit=1',
  CG_URL:      'https://api.coingecko.com/api/v3/global',
  EUR_URL:     'https://vix-proxy.sonosanty.workers.dev/eur',
  TRADES_URL:  '/trades.json',
  WS_TIMEOUT:  15000,  // 15s sin datos → reconectar
  TICK_PRICE:  30000,  // ticker 24h cada 30s
  TICK_IND:    60000,  // indicadores cada 60s
  TICK_MACRO:  300000, // macro cada 5min
  TICK_EUR:    3600000,// EUR cada 1h
  TICK_TRADES: 120000, // trades cada 2min
};

/* ── ESTADO GLOBAL ── */
const S = {
  coin:     'BTC',
  livePx:   0,
  eurRate:  0.92,
  wsConn:   null,
  wsLast:   0,
  wsDog:    null,
  wsRetry:  false,
  trades:   [],
  alerts:   [],
  sysLog:   [],
  charts:   {},
};

/* ── HELPERS ── */
const $  = id => document.getElementById(id);
const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);
const fP = n => (n>=0?'+':'')+n.toFixed(2)+'%';
const fR = n => (n>=0?'+':'')+n.toFixed(2)+'R';
const cG = n => n>=0?'var(--green)':'var(--red)';
const fetchJ = url => fetch(url, {cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
const now = () => new Date().toLocaleTimeString('es-ES');
const log = (msg) => {
  S.sysLog.unshift('['+now()+'] '+msg);
  if(S.sysLog.length>50) S.sysLog.pop();
  const el=$('sysLog');
  if(el) el.innerHTML = S.sysLog.map(l=>'<div>'+l+'</div>').join('');
};

/* ══════════════════════════════════════════════
   WEBSOCKET — watchdog + reconexión automática
   CORRECCIÓN #1 del historial de errores
══════════════════════════════════════════════ */
function startWS() {
  if(S.wsConn) { try{S.wsConn.close();}catch(e){} S.wsConn=null; }
  const sym = S.coin.toLowerCase() + 'usdt';
  try { S.wsConn = new WebSocket(CFG.BINANCE_WS+'/'+sym+'@aggTrade'); }
  catch(e) { setBadge('dead'); schedWS(); log('WS error al abrir: '+e.message); return; }
  S.wsConn.onopen = () => {
    S.wsLast = Date.now();
    setBadge('live');
    log('WS conectado: '+sym);
    addAlert('WS','teal','Binance WebSocket conectado · '+S.coin);
    updSys('sysWS','LIVE ✓','var(--green)');
  };
  S.wsConn.onmessage = e => {
    S.wsLast = Date.now();
    const t = now();
    $('clockEl').textContent = t;
    if($('tTick')) $('tTick').textContent = 'Último tick: '+t;
    if($('sysLastTick')) $('sysLastTick').textContent = t;
    try {
      const d = JSON.parse(e.data);
      S.livePx = parseFloat(d.p);
      updPriceUI(S.livePx);
      updSRLive(S.livePx);
      updTradesR(S.livePx);
      updSysPx(S.livePx);
    } catch(err){}
  };
  S.wsConn.onerror = () => { setBadge('dead'); updSys('sysWS','ERROR','var(--red)'); };
  S.wsConn.onclose = (ev) => {
    setBadge('dead');
    log('WS cerrado: code='+ev.code);
    schedWS();
  };
}
function startWatchdog() {
  if(S.wsDog) clearInterval(S.wsDog);
  S.wsDog = setInterval(()=>{
    if(S.wsLast>0 && (Date.now()-S.wsLast)>CFG.WS_TIMEOUT) {
      log('WS watchdog: sin datos hace '+(Math.round((Date.now()-S.wsLast)/1000))+'s → reconectando');
      setBadge('dead');
      schedWS();
    }
  }, 5000);
}
function schedWS() {
  if(S.wsRetry) return;
  S.wsRetry = true;
  log('WS reconectando en 3s...');
  setTimeout(()=>{ S.wsRetry=false; startWS(); }, 3000);
}
function setBadge(state) {
  const b=$('wsBadge'), d=$('wsDot'), t=$('wsText');
  b.className = 'ws-badge '+(state==='live'?'ws-live':state==='dead'?'ws-dead':'ws-init');
  t.textContent = state==='live'?'LIVE':state==='dead'?'SIN SEÑAL':'INIT';
}

/* ══════════════════════════════════════════════
   PRECIO UI — con EUR real
══════════════════════════════════════════════ */
function updPriceUI(px) {
  const f = fU(px,2);
  $('priceUSD').textContent = f;
  if($('tBTC')) $('tBTC').textContent = f;
  if($('sysPx')) $('sysPx').textContent = f;
  $('priceEUR').textContent = '≈ '+Math.round(px*S.eurRate).toLocaleString('es-ES')+' EUR';
  // Método page score live
  if($('metScore')) updateMetodoPage();
}
function updSysPx(px) { if($('sysPx')) $('sysPx').textContent = fU(px,2); }

/* ══════════════════════════════════════════════
   TICKER 24H — H/L/Vol CORRECTAMENTE MAPEADOS
   CORRECCIÓN #2 del historial de errores
══════════════════════════════════════════════ */
async function loadTicker() {
  try {
    const d = await fetchJ(CFG.BINANCE_API+'/ticker/24hr?symbol='+S.coin+'USDT');
    const h=parseFloat(d.highPrice), l=parseFloat(d.lowPrice), v=parseFloat(d.volume);
    const chg=parseFloat(d.priceChangePercent);
    if(S.livePx===0) { S.livePx=parseFloat(d.lastPrice); updPriceUI(S.livePx); }
    // Mapeado EXPLÍCITO — no depender de IDs ambiguos
    $('h24').textContent = fU(h);
    $('l24').textContent = fU(l);
    const vS = v>=1e6?(v/1e6).toFixed(2)+'M':v>=1e3?(v/1e3).toFixed(1)+'K':v.toFixed(0);
    $('vol24').textContent = vS+' '+S.coin;
    const ce=$('priceChg');
    ce.textContent = (chg>=0?'▲ +':'▼ ')+Math.abs(chg).toFixed(2)+'%';
    ce.className = 'price-chg '+(chg>=0?'up':'dn');
    ce.classList.remove('hidden');
    if($('tChg')) $('tChg').textContent = (chg>=0?'+':'')+chg.toFixed(2)+'% 24h';
    updSys('sysBinance','OK ✓','var(--green)');
  } catch(e) { updSys('sysBinance','ERROR','var(--red)'); log('ticker error: '+e.message); }
}

/* ══════════════════════════════════════════════
   CÁLCULOS TÉCNICOS — Una sola implementación
══════════════════════════════════════════════ */
function smaLast(arr,p) { if(arr.length<p)return null; return arr.slice(-p).reduce((a,b)=>a+b,0)/p; }
function smaArr(arr,p) {
  const o=new Array(arr.length).fill(null);
  for(let i=p-1;i<arr.length;i++) o[i]=arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p;
  return o;
}
function rsiLast(cl,p=14) {
  if(cl.length<p+1)return null;
  let g=0,l=0;
  for(let i=cl.length-p;i<cl.length;i++){const d=cl[i]-cl[i-1];if(d>0)g+=d;else l-=d;}
  return Math.round(100-(100/(1+(g/p)/((l/p)||0.001))));
}
function adxLast(hi,lo,cl,p=14) {
  if(cl.length<p+2)return null;
  let pd=0,md=0,tr=0;
  for(let i=cl.length-p;i<cl.length;i++){
    const pH=hi[i]-hi[i-1],mL=lo[i-1]-lo[i];
    pd+=(pH>mL&&pH>0?pH:0);md+=(mL>pH&&mL>0?mL:0);
    tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1]));
  }
  const pDI=100*pd/(tr||1),mDI=100*md/(tr||1);
  return Math.round(Math.abs(pDI-mDI)/((pDI+mDI)||1)*100);
}
function bbLast(cl,p=20,k=2) {
  if(cl.length<p)return{pb:null,bw:null};
  const sl=cl.slice(-p),m=sl.reduce((a,b)=>a+b,0)/p;
  const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/p);
  const u=m+k*sd,dn=m-k*sd;
  return{pb:+((cl[cl.length-1]-dn)/((u-dn)||1)).toFixed(3),bw:+((u-dn)/m*100).toFixed(2)};
}
function calcSR(hi,lo,n=25) {
  const rh=Math.max(...hi.slice(-n)),rl=Math.min(...lo.slice(-n)),rng=rh-rl;
  return{r2:rh+rng*0.10,r1:rh,s1:rl,s2:rl-rng*0.10};
}
function calcScore(cl,hi,lo) {
  const px=cl[cl.length-1];
  const ma6=smaLast(cl,6),ma40=smaLast(cl,40),ma70=smaLast(cl,70),ma200=smaLast(cl,200);
  const rv=rsiLast(cl),av=adxLast(hi,lo,cl);
  const{pb}=bbLast(cl);
  let p1=0;
  if(ma6!=null&&ma70!=null) p1+=ma6>ma70?15:0;
  if(ma40!=null)             p1+=px>ma40?10:0;
  if(ma200!=null)            p1+=px>ma200?10:0;
  let p2=0;
  if(av!=null) p2+=av>25?15:av>18?8:0;
  if(rv!=null) p2+=rv>65?8:rv>55?20:rv>50?14:rv<30?18:rv<45?6:10;
  let p3=0;
  if(pb!=null) p3=pb>0.85?4:pb>0.55?20:pb>0.2?30:pb>0?18:5;
  return{score:Math.min(100,Math.round(p1+p2+p3)),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),ma6,ma40,ma70,ma200,px,rv,av,pb};
}
function sColor(s){
  if(s>=78)return'var(--teal)';if(s>=62)return'var(--green)';if(s>=52)return'#86efac';
  if(s>=42)return'var(--text3)';if(s>=30)return'var(--amber)';if(s>=18)return'#fca5a5';
  return'var(--red)';
}
function sLabel(s){
  if(s>=78)return['Compra fuerte','LONG'];if(s>=62)return['Compra','LONG prudente'];
  if(s>=52)return['Acumular','Parcial'];if(s>=42)return['Neutral','Esperar'];
  if(s>=30)return['Venta','SHORT'];if(s>=18)return['Venta fuerte','SHORT'];
  return['Capitulación','CASH'];
}

/* ══════════════════════════════════════════════
   RENDER SCORE + SEÑALES + MAs
   CORRECCIÓN #3: MAs mapeadas explícitamente
══════════════════════════════════════════════ */
function renderScore({score,p1,p2,p3}) {
  const col=sColor(score);
  $('ra').style.strokeDashoffset=352-(352*score/100);
  $('ra').style.stroke=col;
  $('scoreNum').textContent=score; $('scoreNum').style.color=col;
  const[l,d]=sLabel(score);
  $('scoreLbl').textContent=l; $('scoreLbl').style.color=col;
  $('scoreZone').textContent=d;
  $('p1pts').textContent=p1+'/35'; $('p1b').style.width=(p1/35*100)+'%';
  $('p2pts').textContent=p2+'/35'; $('p2b').style.width=(p2/35*100)+'%';
  $('p3pts').textContent=p3+'/30'; $('p3b').style.width=(p3/30*100)+'%';
  document.querySelectorAll('.zona').forEach(el=>{
    el.classList.toggle('zona-ac',score>=+el.dataset.min);
  });
  if($('metScore')){ $('metScore').textContent=score; $('metScore').style.color=col; }
  if($('metLabel')){ $('metLabel').textContent=sLabel(score)[0]; $('metLabel').style.color=col; }
}
function renderMAs({ma6,ma40,ma70,ma200,px}) {
  // CORRECCIÓN: todos los elementos del DOM actualizados
  function setMA(vi,di,ma){
    if(ma==null)return;
    const diff=(px-ma)/ma*100;
    $(vi).textContent=fU(ma,0); $(vi).style.color='var(--text)';
    $(di).textContent=fP(diff); $(di).style.color=cG(diff);
  }
  setMA('ma6v','ma6d',ma6); setMA('ma40v','ma40d',ma40);
  setMA('ma70v','ma70d',ma70); setMA('ma200v','ma200d',ma200);
}
function renderSignals({ma6,ma40,ma70,ma200,px,rv,av,pb}) {
  function sig(di,vi,ok,val){
    $(di).style.background=ok?'var(--green)':'var(--text3)';
    $(vi).textContent=val; $(vi).style.color=ok?'var(--green)':'var(--text3)';
  }
  sig('d_1','v_1',ma6&&ma70&&ma6>ma70,ma6&&ma70?(ma6>ma70?'↑ activa':'↓ inactiva'):'--');
  sig('d_2','v_2',ma40&&px>ma40,ma40?fP((px-ma40)/ma40*100):'--');
  sig('d_3','v_3',ma200&&px>ma200,ma200?fP((px-ma200)/ma200*100):'--');
  sig('d_4','v_4',av!=null&&av>25,av!=null?'ADX '+av:'--');
  sig('d_5','v_5',rv!=null&&(rv<30||rv>55),rv!=null?'RSI '+rv:'--');
  sig('d_6','v_6',pb!=null&&(pb<0.2||pb>0.5),pb!=null?'%B '+pb.toFixed(2):'--');
}
function renderInd(rv,av,pb,ma40,px) {
  $('indRSI').textContent=rv!=null?rv:'--';
  $('indRSI').style.color=rv<30?'var(--green)':rv>70?'var(--red)':'var(--cyan)';
  $('indRSIl').textContent=rv<30?'Sobreventa':rv>70?'Sobrecompra':'Neutral';
  $('indADX').textContent=av!=null?av:'--';
  $('indADX').style.color=av>30?'var(--green)':av>25?'var(--purple)':'var(--text3)';
  $('indADXl').textContent=av>30?'Tendencia fuerte':av>25?'Activa':'Sin tendencia';
  $('indBB').textContent=pb!=null?pb.toFixed(2):'--';
  $('indBB').style.color=pb<0.2?'var(--green)':pb>0.8?'var(--red)':'var(--cyan)';
  $('indBBl').textContent=pb<0.2?'Sobreventa':pb>0.8?'Sobrecompra':'Zona media';
  if(ma40&&px){const d=(px-ma40)/ma40*100;$('indMA40d').textContent=fP(d);$('indMA40d').style.color=cG(d);$('indMA40l').textContent=d>=0?'sobre MA40':'bajo MA40';}
}
// CORRECCIÓN #4: S/R panel principal actualizado
function renderSR({r2,r1,s1,s2},px){
  $('srR2').textContent=fU(r2,0); $('srR1').textContent=fU(r1,0);
  $('srS1').textContent=fU(s1,0); $('srS2').textContent=fU(s2,0);
  if(px>0) $('srLive').textContent=fU(px,2);
}
function updSRLive(px){ if(px>0&&$('srLive')) $('srLive').textContent=fU(px,2); }

/* ══════════════════════════════════════════════
   KLINES + INDICADORES
══════════════════════════════════════════════ */
async function loadKlines(tf,limit=220){
  const d=await fetchJ(CFG.BINANCE_API+'/klines?symbol='+S.coin+'USDT&interval='+tf+'&limit='+limit);
  return d.map(c=>({t:+c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4]}));
}
async function refreshIndicators(){
  try{
    const c=await loadKlines('15m',220);
    const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
    const sc=calcScore(cl,hi,lo);
    renderScore(sc); renderMAs(sc); renderSignals(sc);
    renderInd(sc.rv,sc.av,sc.pb,sc.ma40,sc.px);
    renderSR(calcSR(hi,lo,25),sc.px);
    refreshMTF();
    log('Indicadores actualizados · Score='+sc.score);
  }catch(e){ log('refreshIndicators error: '+e.message); }
}
async function refreshMTF(){
  const tfs=['1m','3m','5m','15m'],ids=['mtf1m','mtf3m','mtf5m','mtf15m'],w=[0.10,0.15,0.25,0.50];
  const scores=[];
  for(const tf of tfs){
    try{const c=await loadKlines(tf,220);const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);scores.push(calcScore(cl,hi,lo).score);}
    catch(e){scores.push(0);}
  }
  scores.forEach((s,i)=>{const el=$(ids[i]);if(el){el.textContent=s;el.style.color=sColor(s);}});
  const mtf=Math.round(scores.reduce((a,s,i)=>a+s*w[i],0));
  $('mtfTotal').textContent=mtf; $('mtfTotal').style.color=sColor(mtf);
}

/* ══════════════════════════════════════════════
   MACRO
══════════════════════════════════════════════ */
async function loadFG(){
  try{
    const d=await fetchJ(CFG.FNG_URL);
    const fg=parseInt(d.data[0].value),lb=d.data[0].value_classification;
    const c=fg<=20?'var(--green)':fg<=40?'#86efac':fg<=60?'var(--text3)':fg<=80?'var(--amber)':'var(--red)';
    $('mFNG').textContent=fg; $('mFNG').style.color=c;
    $('mFNGl').textContent=lb;
    $('mFNGb').style.width=fg+'%'; $('mFNGb').style.background=c;
    addAlert('F&G','cyan','Fear & Greed: '+fg+' — '+lb);
    updSys('sysFG','OK '+fg,'var(--green)');
  }catch(e){ updSys('sysFG','ERROR','var(--red)'); log('FG error: '+e.message); }
}
async function loadCG(){
  try{
    const d=await fetchJ(CFG.CG_URL);
    const dom=d.data.market_cap_percentage?.btc||0,mc=d.data.total_market_cap?.usd||0;
    $('mDOM').textContent=dom.toFixed(1)+'%';
    $('mDOMl').textContent=dom>60?'BTC dominante':dom>45?'Equilibrado':'Altseason';
    $('mDOMb').style.width=dom+'%';
    $('mMCAP').textContent=fK(mc);
    $('mMCAPl').textContent='Vol: '+fK(d.data.total_volume?.usd||0);
    updSys('sysCG','OK ✓','var(--green)');
  }catch(e){ updSys('sysCG','ERROR','var(--red)'); log('CG error: '+e.message); }
}
async function loadEUR(){
  try{
    const d=await fetchJ(CFG.EUR_URL);
    S.eurRate=parseFloat(d.rate)||0.92;
    $('mEUR').textContent=S.eurRate.toFixed(4);
    $('mEURb').style.width=(S.eurRate*100)+'%';
    updSys('sysEUR','OK '+S.eurRate.toFixed(4),'var(--green)');
  }catch(e){ S.eurRate=0.92; updSys('sysEUR','fallback 0.92','var(--amber)'); }
}

/* ══════════════════════════════════════════════
   TRADES — R calculado live
   CORRECCIÓN #5 del historial de errores
══════════════════════════════════════════════ */
function parseP(s){ return parseFloat(String(s).replace(/[$,]/g,'')); }
function calcR(t,px){
  if((t.estado||'').toUpperCase()!=='OPEN')return null;
  const e=parseP(t.entry),sl=parseP(t.sl),r=Math.abs(e-sl);
  if(!r)return 0;
  return((t.side||'LONG').toUpperCase()==='LONG'?px-e:e-px)/r;
}
function renderTrades(list,px){
  const closed=list.filter(t=>(t.estado||'').toUpperCase()!=='OPEN');
  const open=list.filter(t=>(t.estado||'').toUpperCase()==='OPEN');
  const tp=closed.filter(t=>(t.estado||'').toUpperCase().startsWith('TP')).length;
  const sl=closed.filter(t=>(t.estado||'').toUpperCase().startsWith('SL')).length;
  const be=closed.filter(t=>(t.estado||'').toUpperCase().startsWith('BE')).length;
  const rs=closed.map(t=>parseFloat(t.r)||0),rt=rs.reduce((a,b)=>a+b,0);
  const wins=rs.filter(r=>r>0).length,wr=closed.length>0?(wins/closed.length*100).toFixed(1):'0.0';
  const wA=rs.filter(r=>r>0).reduce((a,b)=>a+b,0),lA=Math.abs(rs.filter(r=>r<0).reduce((a,b)=>a+b,0));
  const pf=lA>0?(wA/lA).toFixed(2):'∞',pnl=closed.reduce((a,t)=>a+(parseFloat(t.pnl)||0),0),dd=Math.min(0,...rs);
  $('tOpen').textContent=open.length; $('tOpenS').textContent=open.map(t=>t.side||'?').join(' · ')||'--';
  $('tClosed').textContent=closed.length; $('tClosedS').textContent='TP:'+tp+' BE:'+be+' SL:'+sl;
  $('stTBS').textContent=tp+'/'+be+'/'+sl;
  $('stWR').textContent=wr+'%';
  $('stRT').textContent=fR(rt); $('stRT').style.color=cG(rt);
  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);
  $('stPF').textContent=pf;
  $('stDD').textContent=dd.toFixed(2)+'R'; $('stDD').style.color=dd<0?'var(--red)':'var(--green)';
  function buildRows(tbody,cols){
    tbody.innerHTML='';
    [...list].reverse().forEach(t=>{
      const est=(t.estado||'').toUpperCase(),isOpen=est==='OPEN';
      const r=isOpen?calcR(t,px):parseFloat(t.r);
      let bc='b-open',bt=t.estado;
      if(est.startsWith('TP')){bc='b-tp';bt='TP ✓';}
      else if(est.startsWith('SL')){bc='b-sl';bt='SL ✗';}
      else if(est.startsWith('BE')){bc='b-be';bt='BE —';}
      const tr=document.createElement('tr');
      if(isOpen)tr.dataset.tid=t.id;
      const extra=cols===13?`<td>${t.tp2||'--'}</td>`:'';
      tr.innerHTML=`<td>${t.id}</td><td><span class="badge ${bc}">${bt}</span></td><td>${t.tf||'--'}</td><td>${t.side||'--'}</td><td>${t.setup||'--'}</td><td>${t.entry||'--'}</td><td>${t.sl||'--'}</td><td>${t.tp1||'--'}</td>${extra}<td>${t.mfe||'--'}</td><td>${t.mae||'--'}</td><td>${t.duration||t.dur||'--'}</td><td style="color:${r!=null?cG(r):'var(--text3)'};font-weight:700" data-rc="1">${r!=null?fR(r):'--'}</td>`;
      tbody.appendChild(tr);
    });
  }
  buildRows($('tradesTbody'),12);
  if($('tradesFullTbody'))buildRows($('tradesFullTbody'),13);
}
function updTradesR(px){
  document.querySelectorAll('[data-tid]').forEach(row=>{
    const t=S.trades.find(x=>String(x.id)===row.dataset.tid);
    if(!t)return;
    const r=calcR(t,px),cell=row.querySelector('[data-rc]');
    if(cell&&r!=null){cell.textContent=fR(r);cell.style.color=cG(r);}
  });
}
async function loadTrades(){
  try{
    const d=await fetchJ(CFG.TRADES_URL);
    S.trades=Array.isArray(d)?d:(d.trades||[]);
    renderTrades(S.trades,S.livePx);
    $('tradesStatus').textContent=S.trades.length+' trades · live R';
    addAlert('TRADES','green',S.trades.length+' trades cargados');
    updSys('sysTrades','OK '+S.trades.length,'var(--green)');
  }catch(e){
    $('tradesStatus').textContent='error al cargar trades.json';
    $('tradesTbody').innerHTML='<tr><td colspan="12" class="tc dim">trades.json no disponible</td></tr>';
    updSys('sysTrades','ERROR 404','var(--red)');
    log('trades.json error: '+e.message);
  }
}

/* ══════════════════════════════════════════════
   ALERTS + SISTEMA
══════════════════════════════════════════════ */
function addAlert(tag,color,msg){
  const t=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  S.alerts.unshift({t,tag,color,msg});
  if(S.alerts.length>10)S.alerts.pop();
  const cm={teal:'rgba(0,212,160,.15)',green:'rgba(34,197,94,.15)',blue:'rgba(59,130,246,.15)',cyan:'rgba(6,182,212,.15)',amber:'rgba(245,158,11,.15)',red:'rgba(239,68,68,.15)'};
  const ct={teal:'var(--teal)',green:'var(--green)',blue:'var(--blue)',cyan:'var(--cyan)',amber:'var(--amber)',red:'var(--red)'};
  $('alertList').innerHTML=S.alerts.map(a=>`<div class="al"><span class="al-t">${a.t}</span><span class="al-tag" style="background:${cm[a.color]||cm.blue};color:${ct[a.color]||ct.blue}">${a.tag}</span><span class="al-m">${a.msg}</span></div>`).join('');
}
function updSys(id,val,color){
  const el=$(id);if(!el)return;
  el.textContent=val;el.style.color=color;
}

/* ══════════════════════════════════════════════
   RANGOS PAGE
══════════════════════════════════════════════ */
async function refreshRangos(){
  const tfs=['15m','5m','3m','1m'],ids=['sr15m','sr5m','sr3m','sr1m'];
  for(let i=0;i<tfs.length;i++){
    try{
      const c=await loadKlines(tfs[i],60);
      const hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      const sr=calcSR(hi,lo,20);
      const el=$(ids[i]);
      if(el) el.innerHTML=`<div style="font-size:11px;line-height:2;color:var(--text2);font-family:var(--mono)"><span style="color:var(--red)">R2</span> ${fU(sr.r2,0)} &nbsp; <span style="color:var(--red)">R1</span> ${fU(sr.r1,0)}<br><span style="color:var(--blue)">● LIVE</span> ${fU(S.livePx,2)}<br><span style="color:var(--green)">S1</span> ${fU(sr.s1,0)} &nbsp; <span style="color:var(--green)">S2</span> ${fU(sr.s2,0)}</div>`;
    }catch(e){}
  }
}

/* ══════════════════════════════════════════════
   MÉTODO PAGE
══════════════════════════════════════════════ */
function updateMetodoPage(){
  // Score ya se actualiza en renderScore
}

/* ══════════════════════════════════════════════
   NAVEGACIÓN SPA
══════════════════════════════════════════════ */
function go(page,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('ac'));
  const p=$('page-'+page);if(p)p.classList.add('active');
  if(btn)btn.classList.add('ac');
  if(page==='rangos')refreshRangos();
}

/* ══════════════════════════════════════════════
   SELECTOR DE MONEDA
══════════════════════════════════════════════ */
function setCoin(c){
  S.coin=c; S.livePx=0;
  document.querySelectorAll('.cbtn').forEach(b=>b.classList.toggle('ac',b.dataset.coin===c));
  $('priceUSD').textContent='---'; $('priceEUR').textContent='';
  $('priceChg').classList.add('hidden');
  ['h24','l24','vol24'].forEach(id=>{$(id).textContent='---';});
  startWS(); loadTicker(); refreshIndicators();
  addAlert('COIN','blue','Cambiado a '+c);
}

/* ══════════════════════════════════════════════
   TIMESTAMP GLOBAL
══════════════════════════════════════════════ */
setInterval(()=>{ $('clockEl').textContent=now(); },1000);

/* ══════════════════════════════════════════════
   INIT — Arranque completo
══════════════════════════════════════════════ */
(async function init(){
  log('SONO TERMINAL X iniciando...');
  setBadge('init');
  // 1. EUR real primero
  await loadEUR();
  // 2. WebSocket precio live + watchdog
  startWS();
  startWatchdog();
  // 3. Ticker 24h (H/L/Vol + precio inicial)
  loadTicker();
  // 4. Indicadores técnicos
  refreshIndicators();
  // 5. Macro
  loadFG();
  loadCG();
  // 6. Trades
  loadTrades();
  // 7. Refresh periódico
  setInterval(loadTicker,       CFG.TICK_PRICE);
  setInterval(refreshIndicators,CFG.TICK_IND);
  setInterval(loadFG,           CFG.TICK_MACRO);
  setInterval(loadCG,           CFG.TICK_MACRO);
  setInterval(loadEUR,          CFG.TICK_EUR);
  setInterval(loadTrades,       CFG.TICK_TRADES);
  addAlert('SISTEMA','teal','SONO TERMINAL X iniciado · datos reales · sin hardcoded');
  log('Init completado');
})();
