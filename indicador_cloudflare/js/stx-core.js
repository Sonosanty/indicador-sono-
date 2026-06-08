/* SONO TERMINAL X — stx-core.js v3
  initSonoMethod();
   CAMBIO PRINCIPAL vs v2:
   Todas las llamadas a Binance van PRIMERO al Worker proxy
   (vix-proxy.sonosanty.workers.dev) para evitar el error 451.
   El Worker devuelve CORS abierto y no está bloqueado por Binance.
   Fallback directo a Binance si el Worker falla.
*/
'use strict';

/* ── PROXY + APIs ── */
const PROXY   = 'https://vix-proxy.sonosanty.workers.dev';
const BN_WS   = 'wss://stream.binance.com:9443/ws';
const BN_API  = 'https://api.binance.com/api/v3';
const FNG_URL = 'https://api.alternative.me/fng/?limit=1';
const CG_URL  = 'https://api.coingecko.com/api/v3/global';

const COINS = { BTC:'BTCUSDT', ETH:'ETHUSDT', SOL:'SOLUSDT', XRP:'XRPUSDT' };

/* ── ESTADO ── */
let coin      = 'BTC';
let livePx    = 0;
let eurRate   = 1.08;
let ws        = null;
let wsLast    = 0;
let wsRetry   = false;
let wsWatch   = null;
let allTrades = [];
let alertLog  = [];
let lastScore = null;
let equityChart = null;

/* ── DOM ── */
const $   = id => document.getElementById(id);
const set = (id, v) => { const e=$(id); if(e) e.textContent = v; };
const setC= (id, c) => { const e=$(id); if(e) e.style.color = c; };

/* ── FORMATO ── */
const fU  = (n, d=0) => '$' + n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fPct= n => (n>=0?'+':'')+n.toFixed(2)+'%';
const fR  = n => (n>=0?'+':'')+n.toFixed(2)+'R';
const fK  = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+Math.round(n).toLocaleString();
const G   = 'var(--green)';
const R   = 'var(--red)';
const T   = 'var(--teal)';
const cGR = n => n>=0 ? G : R;

/* ── FETCH con proxy primero ── */
async function fetchJ(url) {
  const r = await fetch(url, { cache:'no-store' });
  if (!r.ok) throw Error(r.status);
  return r.json();
}

/* Fetch Binance via proxy primero, fallback directo */
async function fetchBinance(proxyPath, directUrl) {
  try {
    return await fetchJ(PROXY + proxyPath);
  } catch(e) {
    console.warn('[STX] Proxy falló, intentando directo:', proxyPath, e.message);
    return await fetchJ(directUrl);
  }
}

/* ════════════════════════════════════════════
   WEBSOCKET con watchdog y reconexión
════════════════════════════════════════════ */
function startWS() {
  if (ws) { try { ws.close(); } catch(e) {} ws = null; }
  const sym = COINS[coin].toLowerCase();
  try { ws = new WebSocket(BN_WS + '/' + sym + '@aggTrade'); }
  catch(e) { setBadge(false,'WS error'); scheduleWS(); return; }

  ws.onopen = () => {
    wsLast = Date.now();
    setBadge(true);
    addLog('WS', T, 'WebSocket ' + coin + ' conectado');
    set('sys-ws', '✅ Conectado');
  };

  ws.onmessage = e => {
    wsLast = Date.now();
    try {
      const d = JSON.parse(e.data);
      livePx = parseFloat(d.p);
      onPriceTick(livePx);
    } catch(err) {}
  };

  ws.onerror = err => { setBadge(false,'WS error'); set('sys-ws','❌ Error'); };
  ws.onclose = ()  => { setBadge(false,'Reconectando'); scheduleWS(); };
}

function startWatchdog() {
  if (wsWatch) clearInterval(wsWatch);
  wsWatch = setInterval(() => {
    if (wsLast > 0 && Date.now() - wsLast > 15000) {
      setBadge(false,'Sin señal');
      scheduleWS();
    }
  }, 5000);
}

function scheduleWS() {
  if (wsRetry) return;
  wsRetry = true;
  setTimeout(() => { wsRetry = false; startWS(); }, 3000);
}

function setBadge(live, reason) {
  const b=$('wsBadge'), d=$('wsDot'), t=$('wsText');
  if (!b) return;
  b.className = 'ws-chip ' + (live ? 'ws-live' : 'ws-dead');
  if (d) d.className = 'ws-dot ' + (live ? 'dot-t' : 'dot-r');
  if (t) t.textContent = live ? 'LIVE' : 'SIN SEÑAL';
  set('sys-ws', live ? '✅ Conectado' : ('❌ ' + (reason||'Desconectado')));
}

function onPriceTick(px) {
  const ts = new Date().toLocaleTimeString('es-ES');
  set('clockEl', ts);
  set('tTick',   'Tick: ' + ts);
  // Sistema page
  set('sys-tick',  ts);
  set('sys-price', fU(px, 2));
  // Precio en todas las secciones del DOM
  updatePriceDOM(px);
  // S/R live dot
  const sl = $('srLive'); if (sl) sl.textContent = fU(px, 2);
  // Rangos dots
  document.querySelectorAll('[data-rl]').forEach(el => { el.textContent = fU(px,2); });
  // Trades OPEN R actual
  updateOpenTradesR(px);
  // Página trades hero
  set('trd-btcpx', fU(px,2));
}

/* ════════════════════════════════════════════
   TICKER 24h — via Worker proxy
════════════════════════════════════════════ */
async function loadTicker() {
  try {
    const sym = COINS[coin];
    const d = await fetchBinance(
      '/btc?symbol=' + sym,
      BN_API + '/ticker/24hr?symbol=' + sym
    );
    const px  = parseFloat(d.lastPrice);
    const h   = parseFloat(d.highPrice);
    const l   = parseFloat(d.lowPrice);
    const vol = parseFloat(d.volume);
    const chg = parseFloat(d.priceChangePercent);

    if (livePx === 0) { livePx = px; updatePriceDOM(px); }

    set('h24', fU(h));
    set('l24', fU(l));
    const vs = vol>=1e6?(vol/1e6).toFixed(2)+'M':vol>=1e3?(vol/1e3).toFixed(1)+'K':vol.toFixed(0);
    set('vol24', vs + ' ' + coin);

    const ce = $('priceChg');
    if (ce) {
      ce.textContent = (chg>=0?'▲ +':'▼ ') + Math.abs(chg).toFixed(2) + '%';
      ce.className = 'ph-chg ' + (chg>=0?'up':'dn');
      ce.style.display = '';
    }
    set('tBTCChg',  (chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
    set('trd-btcchg', (chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
    set('sys-rest', '✅ OK · ' + new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));

  } catch(e) {
    console.error('[STX] ticker', e);
    set('sys-rest', '❌ ' + e.message);
  }
}

function updatePriceDOM(px) {
  const eur = Math.round(px * eurRate).toLocaleString('es-ES');
  set('priceUSD', fU(px, 2));
  set('tBTCPx',   fU(px, 2));
  set('priceEUR', '≈ ' + eur + ' EUR');
  const rp = $('rangePx'); if (rp) rp.textContent = fU(px, 2);
  const tp = $('trd-btcpx'); if (tp) tp.textContent = fU(px, 2);
}

/* ════════════════════════════════════════════
   MATEMÁTICAS
════════════════════════════════════════════ */
function smaLast(arr, p) {
  if (arr.length < p) return null;
  return arr.slice(-p).reduce((a,b) => a+b, 0) / p;
}

function rsiLast(cl, p=14) {
  if (cl.length < p+1) return null;
  let g=0, l=0;
  for (let i = cl.length-p; i < cl.length; i++) {
    const d = cl[i]-cl[i-1]; if (d>0) g+=d; else l-=d;
  }
  return Math.round(100 - (100/(1+(g/p)/((l/p)||0.001))));
}

function adxLast(hi, lo, cl, p=14) {
  if (cl.length < p+2) return null;
  let pd=0, md=0, tr=0;
  for (let i = cl.length-p; i < cl.length; i++) {
    const pH=hi[i]-hi[i-1], mL=lo[i-1]-lo[i];
    pd += (pH>mL&&pH>0?pH:0); md += (mL>pH&&mL>0?mL:0);
    tr += Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1]));
  }
  const pDI=100*pd/(tr||1), mDI=100*md/(tr||1);
  return Math.round(Math.abs(pDI-mDI)/((pDI+mDI)||1)*100);
}

function bbLast(cl, p=20, k=2) {
  if (cl.length < p) return { pb:null, bw:null };
  const sl=cl.slice(-p), m=sl.reduce((a,b)=>a+b,0)/p;
  const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/p);
  const u=m+k*sd, dn=m-k*sd;
  return { pb:+((cl[cl.length-1]-dn)/((u-dn)||1)).toFixed(3), bw:+((u-dn)/m*100).toFixed(2) };
}

function calcVWAP(candles) {
  if (!candles?.length) return null;
  let tv=0, tpv=0;
  candles.slice(-50).forEach(c => { const tp=(c.h+c.l+c.c)/3, v=c.v||1; tpv+=tp*v; tv+=v; });
  return tv>0 ? Math.round(tpv/tv) : null;
}

function calcATR(hi, lo, cl, p=14) {
  if (cl.length < p+1) return null;
  const trs=[];
  for (let i=cl.length-p; i<cl.length; i++)
    trs.push(Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1])));
  return Math.round(trs.reduce((a,b)=>a+b,0)/p);
}

function computeScore(cl, hi, lo) {
  const px=cl[cl.length-1];
  const ma6=smaLast(cl,6), ma40=smaLast(cl,40), ma70=smaLast(cl,70), ma200=smaLast(cl,200);
  const rv=rsiLast(cl), av=adxLast(hi,lo,cl);
  const {pb,bw}=bbLast(cl);
  let p1=0;
  if (ma6!=null&&ma70!=null) p1+=ma6>ma70?15:0;
  if (ma40!=null) p1+=px>ma40?10:0;
  if (ma200!=null) p1+=px>ma200?10:0;
  let p2=0;
  if (av!=null) p2+=av>25?15:av>18?8:0;
  if (rv!=null) p2+=rv>65?8:rv>55?20:rv>50?14:rv<30?18:rv<45?6:10;
  let p3=0;
  if (pb!=null) p3=pb>0.85?4:pb>0.55?20:pb>0.2?30:pb>0?18:5;
  return { score:Math.min(100,Math.round(p1+p2+p3)), p1:Math.round(p1), p2:Math.round(p2), p3:Math.round(p3), ma6,ma40,ma70,ma200,px,rv,av,pb,bw };
}

function scoreColor(s) {
  if (s>=78) return 'var(--blue)'; if (s>=62) return G; if (s>=52) return '#86efac';
  if (s>=42) return 'var(--tx3)';  if (s>=30) return 'var(--amber)'; if (s>=18) return '#fca5a5';
  return R;
}
function scoreLabel(s) {
  if (s>=78) return['Compra fuerte','LONG'];      if (s>=62) return['Compra','LONG'];
  if (s>=52) return['Acumular','Parcial'];         if (s>=42) return['Neutral','Esperar'];
  if (s>=30) return['Venta','SHORT'];              if (s>=18) return['Venta fuerte','SHORT'];
  return ['Capitulación','CASH'];
}

/* ── loadKlines via proxy ── */
async function loadKlines(tf, limit=220) {
  const sym = COINS[coin];
  const d = await fetchBinance(
    `/klines?symbol=${sym}&interval=${tf}&limit=${limit}`,
    `${BN_API}/klines?symbol=${sym}&interval=${tf}&limit=${limit}`
  );
  return d.map(c => ({t:+c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4],v:+c[5]}));
}

/* ════════════════════════════════════════════
   RENDER — Score, MAs, Señales, Indicadores
════════════════════════════════════════════ */
function renderScore(sc) {
  const {score,p1,p2,p3}=sc, col=scoreColor(score);
  const [lbl,dec]=scoreLabel(score);
  // Ring
  const arc=$('ringArc');
  if (arc) { arc.style.strokeDashoffset=326-(326*score/100); arc.style.stroke=col; }
  set('scoreNum',score); setC('scoreNum',col);
  set('scoreLbl',lbl);   setC('scoreLbl',col);
  set('scoreZone',dec);
  // Pilares
  const p1b=$('p1bar'); if(p1b) p1b.style.width=(p1/35*100)+'%';
  const p2b=$('p2bar'); if(p2b) p2b.style.width=(p2/35*100)+'%';
  const p3b=$('p3bar'); if(p3b) p3b.style.width=(p3/30*100)+'%';
  set('p1pts',p1+'/35'); set('p2pts',p2+'/35'); set('p3pts',p3+'/30');
  // Zonas highlight
  document.querySelectorAll('#zonaLst .zona-r').forEach(el => {
    el.classList.toggle('zac', score >= +el.dataset.min);
  });
  // Método page
  set('met-score',score);   setC('met-score',col);
  set('met-lbl',lbl);       setC('met-lbl',col);
  const mp1b=$('met-p1bar'); if(mp1b) mp1b.style.width=(p1/35*100)+'%';
  const mp2b=$('met-p2bar'); if(mp2b) mp2b.style.width=(p2/35*100)+'%';
  const mp3b=$('met-p3bar'); if(mp3b) mp3b.style.width=(p3/30*100)+'%';
  set('met-p1',p1+' pts'); set('met-p2',p2+' pts'); set('met-p3',p3+' pts');

  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);
}

function renderMAs(sc) {
  const {ma6,ma40,ma70,ma200,px}=sc;
  function setMA(vi,di,ma) {
    if (ma==null) return;
    const d=(px-ma)/ma*100;
    set(vi,fU(ma,0)); set(di,fPct(d)); setC(di,cGR(d));
  }
  setMA('ma6v','ma6d',ma6); setMA('ma40v','ma40d',ma40);
  setMA('ma70v','ma70d',ma70); setMA('ma200v','ma200d',ma200);
  const md1=$('met-p1d');
  if (md1) md1.textContent='MA6:'+(ma6?fU(ma6,0):'--')+' · MA40:'+(ma40?fU(ma40,0):'--')+' · MA200:'+(ma200?fU(ma200,0):'--');
}

function renderSignals(sc) {
  const {ma6,ma40,ma70,ma200,px,rv,av,pb}=sc;
  function sig(di,vi,ok,val) {
    const de=$(di),ve=$(vi);
    if (de) { de.style.background=ok?T:'var(--tx3)'; if(ok) de.classList.add('on'); else de.classList.remove('on'); }
    if (ve) { ve.textContent=val; ve.style.color=ok?T:'var(--tx3)'; }
  }
  sig('d_ma6x70','v_ma6x70',ma6&&ma70&&ma6>ma70, ma6&&ma70?(ma6>ma70?'↑ activa':'↓ inact'):'--');
  sig('d_ma40','v_ma40', ma40&&px>ma40, ma40?fPct((px-ma40)/ma40*100):'--');
  sig('d_ma200','v_ma200', ma200&&px>ma200, ma200?fPct((px-ma200)/ma200*100):'--');
  sig('d_adx','v_adx', av!=null&&av>25, av!=null?'ADX '+av:'--');
  sig('d_rsi','v_rsi', rv!=null&&(rv<30||rv>55), rv!=null?'RSI '+rv:'--');
  sig('d_bb','v_bb', pb!=null&&(pb<0.2||pb>0.5), pb!=null?'%B '+pb.toFixed(2):'--');
}

function renderInd(sc) {
  const {rv,av,pb,ma40,px,bw}=sc;
  set('indRSI',rv!=null?rv:'--'); setC('indRSI',rv<30?T:rv>70?R:'var(--cyan)');
  set('indRSIl',rv<30?'Sobreventa':rv>70?'Sobrecompra':'Neutral');
  set('indADX',av!=null?av:'--'); setC('indADX',av>30?G:av>25?'var(--purple)':'var(--tx3)');
  set('indADXl',av>30?'Tendencia fuerte':av>25?'Tendencia activa':'Sin tendencia');
  set('indBB',pb!=null?pb.toFixed(2):'--'); setC('indBB',pb<0.2?T:pb>0.8?R:'var(--cyan)');
  set('indBBl',pb<0.2?'Sobreventa':pb>0.8?'Sobrecompra':'Zona media');
  if (ma40&&px) {
    const d=(px-ma40)/ma40*100;
    set('indMA40d',fPct(d)); setC('indMA40d',cGR(d));
    set('indMA40l',d>=0?'sobre MA40':'bajo MA40');
  }
  const md2=$('met-p2d'); if(md2) md2.textContent='ADX: '+(av??'--')+' · RSI: '+(rv??'--');
  const md3=$('met-p3d'); if(md3) md3.textContent='%B: '+(pb!=null?pb.toFixed(2):'--')+' · BW: '+(bw!=null?bw+'%':'--');
}

function renderSR(sr, px) {
  set('srR2',fU(sr.r2,0)); set('srR1',fU(sr.r1,0));
  set('srS1',fU(sr.s1,0)); set('srS2',fU(sr.s2,0));
  if (px>0) set('srLive',fU(px,2));
}

/* ════════════════════════════════════════════
   INDICADORES — carga klines del proxy
════════════════════════════════════════════ */
async function refreshIndicators() {
  try {
    const candles = await loadKlines('15m', 220);
    const cl=candles.map(c=>c.c), hi=candles.map(c=>c.h), lo=candles.map(c=>c.l);
    const sc = computeScore(cl, hi, lo);
    lastScore = sc;
    if (window.updateSonoMethod) window.updateSonoMethod(lastScore);
    renderScore(sc); renderMAs(sc); renderSignals(sc); renderInd(sc);
    const n=25, rh=Math.max(...hi.slice(-n)), rl=Math.min(...lo.slice(-n)), rng=rh-rl;
    renderSR({r2:rh+rng*0.1,r1:rh,s1:rl,s2:rl-rng*0.1}, livePx||sc.px);
    const vwap=calcVWAP(candles), atr=calcATR(hi,lo,cl);
    if (vwap) set('vwapEl',fU(vwap));
    if (atr)  set('atrEl', fU(atr));
    addLog('IND',T,'Score '+sc.score+'/100 · RSI '+(sc.rv??'--')+' · ADX '+(sc.av??'--'));
  } catch(e) {
    console.error('[STX] refreshIndicators',e);
    addLog('IND',R,'Error indicadores: '+e.message);
  }
}

async function refreshMTF() {
  const tfs=['1m','3m','5m','15m'], ids=['mtf1m','mtf3m','mtf5m','mtf15m'];
  const w=[0.10,0.15,0.25,0.50], scores=[];
  for (const tf of tfs) {
    try {
      const c=await loadKlines(tf,220);
      const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      scores.push(computeScore(cl,hi,lo).score);
    } catch(e) { scores.push(0); }
  }
  scores.forEach((s,i)=>{ const el=$(ids[i]); if(el){el.textContent=s;el.style.color=scoreColor(s);} });
  const mtf=Math.round(scores.reduce((a,s,i)=>a+s*w[i],0));
  const mt=$('mtfTotal'); if(mt){mt.textContent=mtf;mt.style.color=scoreColor(mtf);}
}

/* ════════════════════════════════════════════
   RANGOS — async correcto, usa proxy
════════════════════════════════════════════ */
async function renderRangosPage() {
  const grid=$('rangeGrid');
  if (!grid) return;
  grid.innerHTML='<div style="grid-column:1/-1;padding:1rem;color:var(--tx3);font-family:var(--mono)">Cargando rangos multi-TF...</div>';

  const tfs=['15m','5m','3m','1m'];
  const results=[];

  for (const tf of tfs) {
    try {
      const c=await loadKlines(tf,60);
      const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      const px=cl[cl.length-1];
      const rh=Math.max(...hi.slice(-20)),rl=Math.min(...lo.slice(-20)),rng=rh-rl;
      const pct=rng>0?(px-rl)/rng:0.5;
      const zona=pct>0.7?'⬆ ZONA ALTA':pct<0.3?'⬇ ZONA BAJA':'◆ ZONA MEDIA';
      const rv=rsiLast(cl),av=adxLast(hi,lo,cl);
      const pres=av&&av>25?(rv&&rv>50?'Compradora':'Vendedora'):'Neutra';
      const presNum=pres==='Compradora'?72:pres==='Vendedora'?28:50;
      results.push({tf,px,r2:Math.round(rh+rng*0.1),r1:Math.round(rh),s1:Math.round(rl),s2:Math.round(rl-rng*0.1),zona,pres,presNum,rv,av});
    } catch(e) {
      results.push({tf,px:livePx,r2:0,r1:0,s1:0,s2:0,zona:'Error',pres:'--',presNum:50,rv:null,av:null});
    }
  }

  // Actualizar hero de rangos
  const domResult=results[0];
  if (domResult) {
    set('rgh-bias-v', domResult.pres);
    setC('rgh-bias-v', domResult.pres==='Compradora'?T:domResult.pres==='Vendedora'?R:'var(--tx3)');
    const scoreConf=Math.round(((domResult.rv??50)/100*50)+((domResult.av??0)>25?30:10));
    set('rgh-conf', scoreConf+'/100');
    set('rgh-state', domResult.zona);
    set('rangeBias','Bias 15m: '+domResult.zona+' · Presión: '+domResult.pres);
  }

  grid.innerHTML = results.map((r,i) => `
    <div class="range-spatial-card ${r.pres==='Compradora'?'p-buy':r.pres==='Vendedora'?'p-sell':''}">
      <div class="rsc-head">
        <div>
          <div class="rsc-tf">${r.tf}${i===0?' <span class="rsc-dom">DOMINANTE</span>':''}</div>
          <div class="rsc-state">${r.zona}</div>
        </div>
        <div class="rsc-pres">
          <div class="rsc-pres-lb">Presión</div>
          <div class="rsc-pres-v">${r.pres.toUpperCase()}</div>
          <div class="rsc-pres-s">RSI ${r.rv??'--'} · ADX ${r.av??'--'}</div>
        </div>
      </div>

      <div class="pressure-meter-wrap">
        <div class="pressure-meter-labels"><span>VENDEDORA</span><span>NEUTRA</span><span>COMPRADORA</span></div>
        <div class="pressure-meter-track">
          <div class="pressure-meter-dot" style="left:${r.presNum}%"></div>
        </div>
      </div>

      <div class="rsc-levels">
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--red)">R2</div><div class="rsc-lv-px">${r.r2>0?fU(r.r2):'---'}</div><div class="rsc-lv-tp">resistencia</div></div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--red)">R1</div><div class="rsc-lv-px">${r.r1>0?fU(r.r1):'---'}</div><div class="rsc-lv-tp">resistencia</div></div>
        <div class="rsc-lv rsc-lv-live">
          <div class="rsc-lv-lb" style="color:var(--teal)">●</div>
          <div class="rsc-lv-px" style="color:var(--teal)" data-rl="${r.tf}">${livePx>0?fU(livePx,2):fU(r.px,2)}</div>
          <div class="rsc-lv-tp">live</div>
        </div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--green)">S1</div><div class="rsc-lv-px">${r.s1>0?fU(r.s1):'---'}</div><div class="rsc-lv-tp">soporte</div></div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--green)">S2</div><div class="rsc-lv-px">${r.s2>0?fU(r.s2):'---'}</div><div class="rsc-lv-tp">soporte</div></div>
      </div>

      <div class="rsc-meta">
        <div class="rsc-mi"><div class="rsc-mi-lb">RSI</div><div class="rsc-mi-v" style="color:${r.rv!=null?(r.rv<30?'var(--teal)':r.rv>70?R:'var(--tx2)'):'var(--tx3)'}">${r.rv??'--'}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">ADX</div><div class="rsc-mi-v" style="color:${r.av!=null&&r.av>25?G:'var(--tx3)'}">${r.av??'--'}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">Zona</div><div class="rsc-mi-v">${r.zona.replace('⬆ ','').replace('⬇ ','').replace('◆ ','').split(' ').slice(0,2).join(' ')}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">Presión</div><div class="rsc-mi-v">${r.pres}</div></div>
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════
   TRADES
════════════════════════════════════════════ */
function geEstado(t) { return ((t.status||t.estado||'')).toUpperCase().trim(); }

function calcRActual(t, px) {
  if (geEstado(t) !== 'OPEN') return null;
  const e=parseFloat(t.entry), sl=parseFloat(t.sl), risk=Math.abs(e-sl);
  if (!risk) return 0;
  return ((t.side||'long').toUpperCase()==='LONG' ? px-e : e-px) / risk;
}

function updateOpenTradesR(px) {
  ['tradesTbody','tradesFullTbody'].forEach(tbId => {
    const tb=$(tbId); if (!tb) return;
    tb.querySelectorAll('tr[data-trade-id]').forEach(row => {
      const t=allTrades.find(x=>String(x.id)===row.dataset.tradeId);
      if (!t) return;
      const r=calcRActual(t,px), cell=row.querySelector('[data-r]');
      if (cell&&r!=null) { cell.textContent=fR(r); cell.style.color=cGR(r); }
    });
  });
}

function buildTradeRow(t, px) {
  const est=geEstado(t), isOpen=est==='OPEN';
  const r=isOpen?calcRActual(t,px):parseFloat(t.r_actual??t.r);
  const rStr=r!=null?fR(r):'--', rClr=r!=null?cGR(r):'var(--tx3)';
  let bc='b-op', bt=t.status||t.estado||'?';
  if (est.startsWith('TP')){bc='b-tp';bt='TP ✓';}
  else if(est.startsWith('SL')){bc='b-sl';bt='SL ✗';}
  else if(est.startsWith('BE')){bc='b-be';bt='BE —';}
  const tr=document.createElement('tr');
  if (isOpen) tr.dataset.tradeId=t.id;
  tr.innerHTML=`<td>${t.id}</td><td><span class="badge ${bc}">${bt}</span></td><td>${t.tf||'--'}</td><td>${t.side||'--'}</td><td>${t.setup||'--'}</td><td>${t.entry||'--'}</td><td>${t.sl||'--'}</td><td>${t.tp1||'--'}</td><td>${t.tp2||'--'}</td><td>${t.mfe||'--'}</td><td>${t.mae||'--'}</td><td>${t.dur||t.duration||'--'}</td><td style="color:${rClr};font-weight:700" data-r="1">${rStr}</td>`;
  return tr;
}

function renderTrades(list, px) {
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
  const exp=closed.length>0?(rt/closed.length).toFixed(2):'--';
  const best=rs.length?Math.max(...rs).toFixed(2):'--';
  const worst=rs.length?Math.min(...rs).toFixed(2):'--';

  // Dashboard mini
  set('tOpen',open.length); set('tOpenSub',open.map(t=>t.side||'?').join(' · ')||'--');
  set('tClosed',closed.length); set('tClosedSub','TP:'+tp+' BE:'+be+' SL:'+sl);
  set('stTPBESL',tp+'/'+be+'/'+sl); set('stWR',wr+'%');
  set('stRT',fR(rt)); setC('stRT',cGR(rt));
  set('stPnL',(pnl>=0?'+':'')+pnl.toFixed(2)+'$'); setC('stPnL',cGR(pnl));
  set('stPF',pf); set('stDD',dd.toFixed(2)+'R'); setC('stDD',dd<0?R:G);

  // Página Trades hero
  set('trd-open',open.length); set('trd-opensub',open.map(t=>t.side||'?').join(' · ')||'--');
  set('trd-closed',closed.length); set('trd-closedsub','TP:'+tp+' BE:'+be+' SL:'+sl);
  set('trd-tpbesl',tp+'/'+be+'/'+sl); set('trd-wr',wr+'%');
  set('trd-rt',fR(rt));   setC('trd-rt',cGR(rt));
  set('trd-pnl',(pnl>=0?'+':'')+pnl.toFixed(2)+'$'); setC('trd-pnl',cGR(pnl));
  set('trd-pf',pf); set('trd-dd',dd.toFixed(2)+'R'); setC('trd-dd',dd<0?R:G);

  // Equity KPIs
  set('eq-dd',dd.toFixed(2)+'R');  setC('eq-dd',dd<0?R:G);
  set('eq-pf',pf);
  set('eq-exp',exp+'R');
  set('eq-best',best+'R'); setC('eq-best',G);
  set('eq-worst',worst+'R'); setC('eq-worst',R);

  set('tradesStatus','trades.json · '+list.length+' trades');

  // Equity chart
  renderEquityChart(rs);

  // Tabla dashboard
  const tb1=$('tradesTbody');
  if (tb1) { tb1.innerHTML=''; [...list].reverse().forEach(t=>tb1.appendChild(buildTradeRow(t,px))); }
}

function renderEquityChart(rs) {
  const canvas=$('equityChart');
  if (!canvas||!window.Chart) return;
  let cum=0;
  const data=rs.map(r=>{cum+=r;return+cum.toFixed(2);});
  const labels=rs.map((_,i)=>'#'+(i+1));
  if (equityChart) equityChart.destroy();
  equityChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels,datasets:[{
      label:'Equity R',data,borderColor:'#00d4a0',borderWidth:1.8,
      pointRadius:0,tension:.3,fill:true,
      backgroundColor:ctx=>{
        const g=ctx.chart.ctx.createLinearGradient(0,0,0,160);
        g.addColorStop(0,'rgba(0,212,160,.18)');g.addColorStop(1,'rgba(0,212,160,.01)');return g;
      }
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:600},
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{
        backgroundColor:'#0f1e35',borderColor:'rgba(255,255,255,.1)',borderWidth:1,
        titleColor:'#8fa8c8',bodyColor:'#e8f1ff',
        callbacks:{label:c=>'Equity: '+c.parsed.y.toFixed(2)+'R'}
      }},
      scales:{
        x:{ticks:{color:'#4d6585',font:{size:9,family:'JetBrains Mono'},maxTicksLimit:8},grid:{color:'rgba(255,255,255,.03)'}},
        y:{position:'right',ticks:{color:'#4d6585',font:{size:9,family:'JetBrains Mono'},callback:v=>v+'R'},grid:{color:'rgba(255,255,255,.03)'}}
      }
    }
  });
}

function renderTradesPage() {
  const tb=$('tradesFullTbody');
  if (!tb) return;
  if (!allTrades.length) {
    tb.innerHTML='<tr><td colspan="13" style="text-align:center;color:var(--tx3);padding:1.5rem">Sin datos</td></tr>';
    return;
  }
  tb.innerHTML='';
  [...allTrades].reverse().forEach(t=>tb.appendChild(buildTradeRow(t,livePx)));
  // Refresh ts
  set('trd-refreshts',new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
}

async function loadTrades() {
  try {
    const d=await fetchJ('/trades.json');
    allTrades=Array.isArray(d)?d:(d.trades||[]);
    renderTrades(allTrades,livePx);
    set('sys-trades','✅ '+allTrades.length+' trades');
    addLog('TRADES',T,allTrades.length+' trades cargados (trades.json)');
  } catch(e) {
    console.error('[STX] trades',e);
    set('sys-trades','❌ Error');
    const tb=$('tradesTbody');
    if (tb) tb.innerHTML='<tr><td colspan="12" style="text-align:center;color:var(--tx3);padding:1rem">Error cargando trades.json</td></tr>';
  }
}

/* Filtros de la página Trades */
function setupTradesFilters() {
  ['filterStatus','filterSide','filterSetup','filterTf'].forEach(id => {
    const el=$(id);
    if (!el) return;
    el.addEventListener('input', applyTradesFilter);
    el.addEventListener('change', applyTradesFilter);
  });
}

function applyTradesFilter() {
  const status=$('filterStatus')?.value||'ALL';
  const side=$('filterSide')?.value||'ALL';
  const setup=($('filterSetup')?.value||'').toLowerCase();
  const tf=($('filterTf')?.value||'').toLowerCase();

  const filtered=allTrades.filter(t => {
    const est=geEstado(t);
    if (status!=='ALL' && est!==status) return false;
    if (side!=='ALL' && (t.side||'').toUpperCase()!==side) return false;
    if (setup && !(t.setup||'').toLowerCase().includes(setup)) return false;
    if (tf && !(t.tf||'').toLowerCase().includes(tf)) return false;
    return true;
  });

  const tb=$('tradesFullTbody');
  if (!tb) return;
  tb.innerHTML='';
  if (!filtered.length) {
    tb.innerHTML='<tr><td colspan="13" style="text-align:center;color:var(--tx3);padding:1rem">Sin resultados</td></tr>';
    return;
  }
  [...filtered].reverse().forEach(t=>tb.appendChild(buildTradeRow(t,livePx)));
}

/* Tabs OPEN/CLOSED */
function setupTradeTabs() {
  document.querySelectorAll('.t-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.t-tab').forEach(b=>b.classList.remove('ac'));
      btn.classList.add('ac');
      const tab=btn.dataset.ttab;
      const statusSel=$('filterStatus');
      if (statusSel) {
        statusSel.value = tab==='open'?'OPEN':tab==='closed'?'TP':'ALL';
        applyTradesFilter();
      }
      const titleEl=$('trd-section-title');
      const subEl=$('trd-section-sub');
      if (titleEl) titleEl.textContent=tab==='open'?'Trades activos':'Trades cerrados';
      if (subEl) subEl.textContent=tab==='open'?'Operaciones abiertas monitorizadas por WebSocket':'Operaciones cerradas con resultado confirmado';
    });
  });
}

/* ════════════════════════════════════════════
   MACRO — via proxy
════════════════════════════════════════════ */
async function loadFG() {
  try {
    const d=await fetchBinance('/fng',FNG_URL);
    const fg=parseInt(d.data[0].value), lb=d.data[0].value_classification;
    const c=fg<=20?T:fg<=40?'#86efac':fg<=60?'var(--tx3)':fg<=80?'var(--amber)':R;
    set('mFNG',fg); setC('mFNG',c); set('mFNGl',lb);
    const b=$('mFNGb'); if(b){b.style.width=fg+'%';b.style.background=c;}
    set('sys-fg','✅ '+fg+' '+lb);
    addLog('F&G',T,'Fear & Greed: '+fg+' — '+lb);
  } catch(e) { set('sys-fg','❌ '+e.message); }
}

async function loadCG() {
  try {
    const d=await fetchBinance('/global',CG_URL);
    const dom=d.data.market_cap_percentage?.btc||0, mc=d.data.total_market_cap?.usd||0;
    set('mDOM',dom.toFixed(1)+'%'); set('mDOMl',dom>60?'BTC dominante':dom>45?'Equilibrado':'Altseason');
    const db=$('mDOMb'); if(db) db.style.width=dom+'%';
    set('mMCAP',fK(mc)); set('mMCAPl','Vol: '+fK(d.data.total_volume?.usd||0));
    set('sys-cg','✅ Dom '+dom.toFixed(1)+'%');
  } catch(e) { set('sys-cg','❌ '+e.message); }
}

async function loadEUR() {
  try {
    const d=await fetchBinance('/eur',BN_API+'/ticker/price?symbol=EURUSDT');
    eurRate=parseFloat(d.price);
    set('mEUR',eurRate.toFixed(4));
    const eb=$('mEURb'); if(eb) eb.style.width=Math.min(100,(eurRate-0.8)*500)+'%';
    set('sys-eur','✅ '+eurRate.toFixed(4)+' (Binance via proxy)');
  } catch(e) { set('sys-eur','❌ Usando fallback 1.08'); eurRate=1.08; }
}

/* ════════════════════════════════════════════
   LOG / ALERTAS
════════════════════════════════════════════ */
function addLog(tag, col, msg) {
  const ts=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  alertLog.unshift({ts,tag,col,msg});
  if (alertLog.length>12) alertLog.pop();
  const cm={[T]:'rgba(0,212,160,.1)',[G]:'rgba(34,197,94,.12)',[R]:'rgba(239,68,68,.12)','var(--amber)':'rgba(245,158,11,.12)','var(--blue)':'rgba(59,130,246,.12)'};
  const ct={[T]:T,[G]:G,[R]:R,'var(--amber)':'var(--amber)','var(--blue)':'var(--blue)'};
  ['alertLst','sysLog'].forEach(id=>{
    const el=$(id); if(!el) return;
    el.innerHTML=alertLog.map(a=>`<div class="al-row"><div class="al-t">${a.ts}</div><div class="al-tg" style="background:${cm[a.col]||'rgba(59,130,246,.12)'};color:${ct[a.col]||'var(--blue)'}">${a.tag}</div><div class="al-m">${a.msg}</div></div>`).join('');
  });
}

/* ════════════════════════════════════════════
   NAVEGACIÓN SPA
════════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('ac',b.dataset.page===id));
  const pg=$('page-'+id); if(pg) pg.classList.add('active');
  history.pushState({page:id},'',(id==='dashboard'?'/':'/'+id));
  if (id==='rangos')  renderRangosPage();
  if (id==='trades')  renderTradesPage();
  if (id==='metodo'&&lastScore) renderScore(lastScore);
}

/* ════════════════════════════════════════════
   SELECTOR MONEDA
════════════════════════════════════════════ */
function setCoin(c) {
  coin=c; livePx=0;
  document.querySelectorAll('#coinBtns .cb-btn').forEach(b=>b.classList.toggle('ac',b.dataset.coin===c));
  ['priceUSD','h24','l24','vol24','priceEUR','vwapEl','atrEl'].forEach(id=>set(id,'---'));
  const ce=$('priceChg'); if(ce) ce.style.display='none';
  startWS(); loadTicker(); refreshIndicators();
  addLog('COIN','var(--blue)','Moneda: '+c);
}

/* ════════════════════════════════════════════
   INIT — orden correcto, sin await sueltos
════════════════════════════════════════════ */
(async function init() /* patched */ {
  console.log('[STX] init() arrancando...');
  console.log('[STX v3] Iniciando con proxy...');

  // Reloj
  setInterval(()=>set('clockEl',new Date().toLocaleTimeString('es-ES')),1000);

  // Navegación SPA
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
  document.querySelectorAll('#coinBtns .cb-btn').forEach(btn=>btn.addEventListener('click',()=>setCoin(btn.dataset.coin)));
  window.addEventListener('popstate',e=>{if(e.state?.page) showPage(e.state.page);});

  // Tabs y filtros de Trades
  setupTradeTabs();
  setupTradesFilters();

  // 1. EUR via proxy
  await loadEUR();

  // 2. WebSocket
  startWS();
  startWatchdog();

  // 3. Ticker y datos de mercado via proxy
  loadTicker();
  refreshIndicators();

  // 4. Macro via proxy
  loadFG();
  loadCG();

  // 5. Trades (local)
  loadTrades();

  // 6. MTF
  setTimeout(refreshMTF, 5000);

  // Refrescos
  setInterval(loadTicker,        30_000);
  setInterval(refreshIndicators, 60_000);
  setInterval(loadFG,           300_000);
  setInterval(loadCG,           300_000);
  setInterval(loadEUR,        3_600_000);
  setInterval(loadTrades,       120_000);
  setInterval(refreshMTF,       120_000);

  addLog('STX',T,'SONO Terminal X v3 iniciado · Proxy activo');
  console.log('[STX v3] init() completado');


/* S O N O   M E T H O D (tm)   M O D U L E */
function initSonoMethod() {
  const $$ = id => document.getElementById(id);
  const fmt = n => Number.isFinite(n) ? n.toLocaleString("en-US", {maximumFractionDigits: 2}) : "--";
  const set = (id, v) => { const e = $$(id); if (e) e.textContent = v; };
  const s = { price:0, atr:0, ma6:0, ma40:0, ma70:0, ma200:0, rsi:0, adx:0, pb:0, bw:0, gap:0, score:0, confidence:0, confluence:0 };
  function calcPosition() {
    const cap = +($$("capIn")?.value||0), risk = (+($$("riskIn")?.value||0))/100, atr = +($$("atrIn")?.value||s.atr||0);
    const stop = +($$("stopIn")?.value||Math.max(0,s.price-1.5*atr)), entry = s.price;
    const loss = cap*risk, qty = loss/Math.max(1e-9,Math.abs(entry-stop)), tp = entry+2*Math.abs(entry-stop);
    set("qtyOut",fmt(qty)); set("slOut",fmt(stop)); set("tpOut",fmt(tp)); set("rrOut","1:2"); set("lossOut","$"+fmt(loss)); set("profitOut","$"+fmt(loss*2));
  }
  function execPanel(px, atr, conf) {
    const sl = Math.max(0,px-1.5*atr), tp = px+2*(px-sl);
    set("execEntry","$"+fmt(px)); set("execStop","$"+fmt(sl)); set("execTarget","$"+fmt(tp)); set("execRR","1:2"); set("execDur","15m-4h"); set("execConf",(conf||50)+"%");
  }
  function strategyGrid() {
    const grid = $$("stratGrid"); if(!grid) return;
    const d = [["01","Gap Recovery","ACTIVE","84%","on-long"],["02","Gap Exhaustion","INACTIVE","21%","off"],["03","Trend Cross","ACTIVE","91%","on-long"],["04","Death Cross","INACTIVE","14%","off"],["05","BB Reversal Long","ACTIVE","73%","on-long"],["06","BB Reversal Short","INACTIVE","27%","off"],["07","Confluence Setup","ACTIVE","88%","on-conf"],["08","Volatility Breakout","ACTIVE","69%","on-break"]];
    grid.innerHTML = d.map(x => '<div class="card pad" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-family:var(--mono);font-size:24px;font-weight:900">'+x[0]+'</div><div class="chip '+(x[2]==="ACTIVE"?"on":"off")+'"><span class="s"></span>'+x[2]+'</div></div><div style="font-weight:800;margin-top:6px">'+x[1]+'</div><div class="muted" style="font-size:12px;margin-top:6px">Nivel de activación</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px"><b>'+x[3]+'</b><span class="pill '+(x[4].includes("short")?"short":"long")+'">'+x[4]+'</span></div><div class="bar" style="margin-top:10px"><i style="width:'+x[3]+'"></i></div></div>').join("");
  }
  function radar() {
    const svg = $$("radarSvg"); if(!svg) return;
    const pts=[[180,18],[320,105],[280,205],[80,205],[40,105]], labels=["Trend","Momentum","Vol","Gap","Risk"];
    const vals=[Math.min(1,s.price>s.ma200?1:.3),Math.min(1,s.adx/50),Math.min(1,s.bw/8),Math.min(1,Math.abs(s.gap)/8),Math.min(1,1-s.confluence/5)];
    let poly=""; for(let i=0;i<5;i++){const a=(Math.PI*2/5)*i-Math.PI/2; poly+=(180+110*Math.cos(a)*vals[i])+","+(120+80*Math.sin(a)*vals[i])+" ";}
    svg.innerHTML='<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(88,166,255,.55)"/><stop offset="100%" stop-color="rgba(34,197,94,.1)"/></linearGradient></defs><polygon points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)"/><polygon points="'+poly+'" fill="url(#g)" stroke="rgba(88,166,255,.9)" stroke-width="2"/>'+pts.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#58A6FF"/><text x="'+p[0]+'" y="'+(p[1]+18)+'" fill="#94A3B8" text-anchor="middle" font-size="11">'+labels[i]+'</text>').join("");
  }
  function confluence() {
    const checks=[["Trend Engine",s.price>s.ma200],["Momentum Engine",s.adx>25],["Volatility Engine",s.bw>3.5],["Gap Engine",Math.abs(s.gap)>1],["Risk Engine",s.confluence>=3]];
    const mg=$$("matrixGrid"); if(mg) mg.innerHTML=checks.map(([n,v]) => '<div class="box"><span class="muted">'+n+'</span><b style="color:'+(v?"var(--bull)":"var(--bear)")+'">'+(v?"✔":"✖")+'</b></div>').join("");
    const mr=$$("matrixResult"); if(mr) mr.textContent=checks.filter(x=>x[1]).length+"/5 Motores alineados";
  }
  window.updateSonoMethod = function(sc) {
    if(sc){ Object.assign(s, sc); s.score = sc.total || s.score; }
    const px = s.price;
    const sig = s.score>=82?"STRONG LONG":s.score>=65?"LONG":s.score>=50?"NEUTRAL":s.score>=35?"SHORT":"STRONG SHORT";
    const dot=$$("sonoDot"); if(dot) dot.className="dot "+(sig.includes("LONG")?"bull":sig.includes("SHORT")?"bear":"");
    set("sonoSignal",sig); set("sonoSub","Decisión operativa basada en confluencias");
    set("sonoScore",s.score+"/100"); set("sonoConf",Math.round(Math.min(95,50+s.score*0.45))+"%");
    set("sonoRisk",s.score>=65?"Bajo":s.score>=50?"Medio":"Alto");
    set("macroBias",px>s.ma200?"Bullish":px<s.ma200?"Bearish":"Neutral"); set("microBias",s.ma6>s.ma70?"Bullish":"Bearish");
    set("momentumBias",s.adx>25?"Active":"Weak"); set("volBias",s.bw>5?"Expanding":"Compressed");
    const trend=(px>s.ma200?30:5)+(s.ma6>s.ma70?15:0)+(px>s.ma40?10:0);
    const mom=(s.adx>25?15:8)+(s.rsi>55?10:s.rsi<30?12:6);
    const vol=(s.pb<0.2?20:s.pb>0.8?5:15)+(s.bw>5?10:8);
    const gapS=(s.gap>5?20:s.gap>2?12:6);
    set("trendScore",trend+"/55"); set("momScore",mom+"/35"); set("volScore",vol+"/30"); set("gapScore",gapS+"/20");
    const tb=$$("trendBar"); if(tb)tb.style.width=Math.min(100,trend/55*100)+"%";
    const mb=$$("momBar"); if(mb)mb.style.width=Math.min(100,mom/35*100)+"%";
    const vb=$$("volBar"); if(vb)vb.style.width=Math.min(100,vol/30*100)+"%";
    const gb=$$("gapBar"); if(gb)gb.style.width=Math.min(100,gapS/20*100)+"%";
    set("msTrend",px>s.ma200?"Bullish":"Bearish"); set("msMacro",px>s.ma200?"Long bias":"Short bias");
    set("msMicro",s.ma6>s.ma70?"Long":"Short"); set("msVol",s.bw>5?"Expanding":"Compressed");
    s.confluence=[px>s.ma200,s.ma6>s.ma70,s.adx>25,s.bw>3.5,s.pb>0.2&&s.pb<0.8].filter(Boolean).length;
    set("sonoConfCount",s.confluence+"/5");
    confluence(); execPanel(px,s.atr,Math.round(Math.min(95,50+s.score*0.45))); strategyGrid(); radar();
  };
  const calcBtn=$$("calcBtn"); if(calcBtn)calcBtn.addEventListener("click",calcPosition);
  const liveBtn=$$("liveBtn"); if(liveBtn)liveBtn.addEventListener("click",function(){const ai=$$("atrIn");const si=$$("stopIn");if(ai)ai.value=s.atr;if(si)si.value=Math.max(0,s.price-1.5*s.atr);calcPosition();});
}


_init().catch(e=>console.error('[STX] init FALLÓ:',e.message));

})();

