/* SONO TERMINAL X — stx-core.js v2
   Reescrito completamente para eliminar el bug INIT
   Causa raíz: await sin async en renderRangosPage → SyntaxError → init() nunca corre
   Verificado: sin ningún await fuera de función async
*/
'use strict';

/* ── APIs ── */
const BN_WS  = 'wss://stream.binance.com:9443/ws';
const BN_API = 'https://api.binance.com/api/v3';
const FNG    = 'https://api.alternative.me/fng/?limit=1';
const CG     = 'https://api.coingecko.com/api/v3/global';

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

/* ── DOM HELPER ── */
const $ = id => document.getElementById(id);
const set = (id, val) => { const e = $(id); if (e) e.textContent = val; };
const setC = (id, col) => { const e = $(id); if (e) e.style.color = col; };

/* ── FORMATO ── */
const fUSD  = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
const fPct  = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const fR    = n => (n >= 0 ? '+' : '') + n.toFixed(2) + 'R';
const fK    = n => n >= 1e12 ? '$' + (n/1e12).toFixed(2) + 'T' : n >= 1e9 ? '$' + (n/1e9).toFixed(1) + 'B' : '$' + Math.round(n).toLocaleString();
const green = 'var(--green)';
const red   = 'var(--red)';
const teal  = 'var(--teal)';
const cGR   = n => n >= 0 ? green : red;

function fetchJ(url) {
  return fetch(url, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw Error(r.status); return r.json(); });
}

/* ════════════════════════════════════════════
   WEBSOCKET con watchdog y reconexión
════════════════════════════════════════════ */
function startWS() {
  if (ws) { try { ws.close(); } catch(e) {} ws = null; }
  const sym = { BTC:'btcusdt', ETH:'ethusdt', SOL:'solusdt', XRP:'xrpusdt' }[coin];
  try { ws = new WebSocket(BN_WS + '/' + sym + '@aggTrade'); } 
  catch(e) { setBadge(false); scheduleWS(); return; }

  ws.onopen = () => {
    wsLast = Date.now();
    setBadge(true);
    addLog('WS', teal, 'WebSocket ' + coin + ' conectado');
  };

  ws.onmessage = e => {
    wsLast = Date.now();
    try {
      const d = JSON.parse(e.data);
      livePx = parseFloat(d.p);
      onPriceTick(livePx);
    } catch(err) {}
  };

  ws.onerror = () => setBadge(false);
  ws.onclose = () => { setBadge(false); scheduleWS(); };
}

function startWatchdog() {
  if (wsWatch) clearInterval(wsWatch);
  wsWatch = setInterval(() => {
    if (wsLast > 0 && Date.now() - wsLast > 15000) {
      setBadge(false);
      scheduleWS();
    }
  }, 5000);
}

function scheduleWS() {
  if (wsRetry) return;
  wsRetry = true;
  setTimeout(() => { wsRetry = false; startWS(); }, 3000);
}

function setBadge(live) {
  const b = $('wsBadge'), d = $('wsDot'), t = $('wsText');
  if (!b) return;
  b.className = 'ws-chip ' + (live ? 'ws-live' : 'ws-dead');
  if (d) d.className = 'ws-dot ' + (live ? 'dot-t' : 'dot-r');
  if (t) t.textContent = live ? 'LIVE' : 'SIN SEÑAL';
  // Sistema page
  set('sys-ws', live ? '✅ Conectado' : '❌ Sin señal');
}

function onPriceTick(px) {
  // Timestamp
  const ts = new Date().toLocaleTimeString('es-ES');
  set('clockEl', ts);
  set('tTick', 'Tick: ' + ts);
  set('sys-tick', ts);
  set('sys-price', fUSD(px, 2));

  // Precio en todas las secciones
  updatePriceDOM(px);

  // S/R live
  const srEl = $('srLive');
  if (srEl) srEl.textContent = fUSD(px, 2);

  // Rangos live dots
  document.querySelectorAll('[data-rl]').forEach(el => {
    el.textContent = fUSD(px, 2);
  });

  // Trades OPEN R actual
  updateOpenTradesR(px);
}

/* ════════════════════════════════════════════
   TICKER 24h — precio, H, L, Vol
════════════════════════════════════════════ */
async function loadTicker() {
  try {
    const sym = { BTC:'BTCUSDT', ETH:'ETHUSDT', SOL:'SOLUSDT', XRP:'XRPUSDT' }[coin];
    const d = await fetchJ(BN_API + '/ticker/24hr?symbol=' + sym);
    const px  = parseFloat(d.lastPrice);
    const h   = parseFloat(d.highPrice);
    const l   = parseFloat(d.lowPrice);
    const vol = parseFloat(d.volume);
    const chg = parseFloat(d.priceChangePercent);

    if (livePx === 0) { livePx = px; updatePriceDOM(px); }

    set('h24',  fUSD(h));
    set('l24',  fUSD(l));

    const vs = vol >= 1e6 ? (vol/1e6).toFixed(2)+'M' : vol >= 1e3 ? (vol/1e3).toFixed(1)+'K' : vol.toFixed(0);
    set('vol24', vs + ' ' + coin);

    const ce = $('priceChg');
    if (ce) {
      ce.textContent = (chg >= 0 ? '▲ +' : '▼ ') + Math.abs(chg).toFixed(2) + '%';
      ce.className = 'price-chg ' + (chg >= 0 ? 'up' : 'dn');
      ce.style.display = '';
    }
    set('tBTCChg', (chg >= 0 ? '+' : '') + chg.toFixed(2) + '% 24h');
    set('sys-rest', '✅ OK');

  } catch(e) {
    console.error('ticker', e);
    set('sys-rest', '❌ Error');
  }
}

function updatePriceDOM(px) {
  const eur = Math.round(px * eurRate).toLocaleString('es-ES');
  set('priceUSD', fUSD(px, 2));
  set('tBTCPx',  fUSD(px, 2));
  set('priceEUR', '≈ ' + eur + ' EUR');
  const rp = $('rangePx'); if (rp) rp.textContent = fUSD(px, 2);
}

/* ════════════════════════════════════════════
   MATEMÁTICAS — sma, rsi, adx, bollinger, atr, vwap
════════════════════════════════════════════ */
function smaLast(arr, p) {
  if (arr.length < p) return null;
  return arr.slice(-p).reduce((a, b) => a + b, 0) / p;
}

function rsiLast(cl, p=14) {
  if (cl.length < p + 1) return null;
  let g = 0, l = 0;
  for (let i = cl.length - p; i < cl.length; i++) {
    const d = cl[i] - cl[i-1];
    if (d > 0) g += d; else l -= d;
  }
  return Math.round(100 - (100 / (1 + (g/p) / ((l/p) || 0.001))));
}

function adxLast(hi, lo, cl, p=14) {
  if (cl.length < p + 2) return null;
  let pd = 0, md = 0, tr = 0;
  for (let i = cl.length - p; i < cl.length; i++) {
    const pH = hi[i] - hi[i-1], mL = lo[i-1] - lo[i];
    pd += (pH > mL && pH > 0 ? pH : 0);
    md += (mL > pH && mL > 0 ? mL : 0);
    tr += Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1]));
  }
  const pDI = 100*pd/(tr||1), mDI = 100*md/(tr||1);
  return Math.round(Math.abs(pDI - mDI) / ((pDI + mDI) || 1) * 100);
}

function bbLast(cl, p=20, k=2) {
  if (cl.length < p) return { pb: null, bw: null };
  const sl = cl.slice(-p), m = sl.reduce((a,b) => a+b, 0) / p;
  const sd = Math.sqrt(sl.reduce((a,b) => a + (b-m)**2, 0) / p);
  const u = m + k*sd, dn = m - k*sd;
  return {
    pb: +((cl[cl.length-1] - dn) / ((u - dn) || 1)).toFixed(3),
    bw: +((u - dn) / m * 100).toFixed(2)
  };
}

function calcVWAP(candles) {
  if (!candles || !candles.length) return null;
  let tv = 0, tpv = 0;
  candles.slice(-50).forEach(c => { const tp=(c.h+c.l+c.c)/3, v=c.v||1; tpv+=tp*v; tv+=v; });
  return tv > 0 ? Math.round(tpv / tv) : null;
}

function calcATR(hi, lo, cl, p=14) {
  if (cl.length < p + 1) return null;
  const trs = [];
  for (let i = cl.length - p; i < cl.length; i++) {
    trs.push(Math.max(hi[i]-lo[i], Math.abs(hi[i]-cl[i-1]), Math.abs(lo[i]-cl[i-1])));
  }
  return Math.round(trs.reduce((a,b) => a+b, 0) / p);
}

function computeScore(cl, hi, lo) {
  const px   = cl[cl.length-1];
  const ma6  = smaLast(cl, 6), ma40 = smaLast(cl, 40);
  const ma70 = smaLast(cl, 70), ma200 = smaLast(cl, 200);
  const rv   = rsiLast(cl), av = adxLast(hi, lo, cl);
  const { pb, bw } = bbLast(cl);

  let p1 = 0;
  if (ma6 != null && ma70 != null) p1 += ma6 > ma70 ? 15 : 0;
  if (ma40 != null) p1 += px > ma40 ? 10 : 0;
  if (ma200 != null) p1 += px > ma200 ? 10 : 0;

  let p2 = 0;
  if (av != null) p2 += av > 25 ? 15 : av > 18 ? 8 : 0;
  if (rv != null) p2 += rv > 65 ? 8 : rv > 55 ? 20 : rv > 50 ? 14 : rv < 30 ? 18 : rv < 45 ? 6 : 10;

  let p3 = 0;
  if (pb != null) p3 = pb > 0.85 ? 4 : pb > 0.55 ? 20 : pb > 0.2 ? 30 : pb > 0 ? 18 : 5;

  return { score: Math.min(100, Math.round(p1+p2+p3)), p1: Math.round(p1), p2: Math.round(p2), p3: Math.round(p3), ma6, ma40, ma70, ma200, px, rv, av, pb, bw };
}

function scoreColor(s) {
  if (s >= 78) return 'var(--blue)';
  if (s >= 62) return green;
  if (s >= 52) return '#86efac';
  if (s >= 42) return 'var(--tx3)';
  if (s >= 30) return 'var(--amber)';
  if (s >= 18) return '#fca5a5';
  return red;
}

function scoreLabel(s) {
  if (s >= 78) return ['Compra fuerte', 'LONG'];
  if (s >= 62) return ['Compra', 'LONG prudente'];
  if (s >= 52) return ['Acumular', 'Parcial'];
  if (s >= 42) return ['Neutral', 'Esperar'];
  if (s >= 30) return ['Venta', 'SHORT'];
  if (s >= 18) return ['Venta fuerte', 'SHORT'];
  return ['Capitulación', 'CASH'];
}

async function loadKlines(tf, limit=220) {
  const sym = { BTC:'BTCUSDT', ETH:'ETHUSDT', SOL:'SOLUSDT', XRP:'XRPUSDT' }[coin];
  const d = await fetchJ(BN_API + '/klines?symbol=' + sym + '&interval=' + tf + '&limit=' + limit);
  return d.map(c => ({ t:+c[0], o:+c[1], h:+c[2], l:+c[3], c:+c[4], v:+c[5] }));
}

/* ════════════════════════════════════════════
   RENDER SCORE — Dashboard y Método
════════════════════════════════════════════ */
function renderScore(sc) {
  const { score, p1, p2, p3 } = sc;
  const col = scoreColor(score);
  const [lbl, dec] = scoreLabel(score);

  // Dashboard ring
  const arc = $('ringArc');
  if (arc) { arc.style.strokeDashoffset = 326 - (326*score/100); arc.style.stroke = col; }
  set('scoreNum', score); setC('scoreNum', col);
  set('scoreLbl', lbl); setC('scoreLbl', col);
  set('scoreZone', dec);

  // Pilares dashboard
  const p1b = $('p1bar'); if (p1b) p1b.style.width = (p1/35*100) + '%';
  const p2b = $('p2bar'); if (p2b) p2b.style.width = (p2/35*100) + '%';
  const p3b = $('p3bar'); if (p3b) p3b.style.width = (p3/30*100) + '%';
  set('p1pts', p1 + '/35'); set('p2pts', p2 + '/35'); set('p3pts', p3 + '/30');

  // Zonas highlight
  document.querySelectorAll('#zonaLst .zona-r').forEach(el => {
    el.classList.toggle('zac', score >= +el.dataset.min);
  });

  // Método page
  set('met-score', score); setC('met-score', col);
  set('met-lbl', lbl); setC('met-lbl', col);
  const mp1b = $('met-p1bar'); if(mp1b) mp1b.style.width = (p1/35*100)+'%';
  const mp2b = $('met-p2bar'); if(mp2b) mp2b.style.width = (p2/35*100)+'%';
  const mp3b = $('met-p3bar'); if(mp3b) mp3b.style.width = (p3/30*100)+'%';
  set('met-p1', p1 + ' pts'); set('met-p2', p2 + ' pts'); set('met-p3', p3 + ' pts');
}

function renderMAs(sc) {
  const { ma6, ma40, ma70, ma200, px } = sc;
  function setMA(vi, di, ma) {
    if (ma == null) return;
    const d = (px - ma) / ma * 100;
    set(vi, fUSD(ma, 0)); set(di, fPct(d)); setC(di, cGR(d));
  }
  setMA('ma6v','ma6d',ma6); setMA('ma40v','ma40d',ma40);
  setMA('ma70v','ma70d',ma70); setMA('ma200v','ma200d',ma200);

  // Método detail
  const md1 = $('met-p1d');
  if (md1) md1.textContent = 'MA6:' + (ma6?fUSD(ma6,0):'--') + ' · MA40:' + (ma40?fUSD(ma40,0):'--') + ' · MA200:' + (ma200?fUSD(ma200,0):'--');
}

function renderSignals(sc) {
  const { ma6, ma40, ma70, ma200, px, rv, av, pb } = sc;
  function sig(di, vi, ok, val) {
    const de=$(di), ve=$(vi);
    if (de) de.style.background = ok ? teal : 'var(--tx3)';
    if (ve) { ve.textContent = val; ve.style.color = ok ? teal : 'var(--tx3)'; }
  }
  sig('d_ma6x70','v_ma6x70', ma6&&ma70&&ma6>ma70, ma6&&ma70?(ma6>ma70?'↑ activa':'↓ inact'):'--');
  sig('d_ma40','v_ma40', ma40&&px>ma40, ma40?fPct((px-ma40)/ma40*100):'--');
  sig('d_ma200','v_ma200', ma200&&px>ma200, ma200?fPct((px-ma200)/ma200*100):'--');
  sig('d_adx','v_adx', av!=null&&av>25, av!=null?'ADX '+av:'--');
  sig('d_rsi','v_rsi', rv!=null&&(rv<30||rv>55), rv!=null?'RSI '+rv:'--');
  sig('d_bb','v_bb', pb!=null&&(pb<0.2||pb>0.5), pb!=null?'%B '+pb.toFixed(2):'--');
}

function renderInd(sc) {
  const { rv, av, pb, ma40, px } = sc;
  set('indRSI', rv != null ? rv : '--');
  setC('indRSI', rv < 30 ? teal : rv > 70 ? red : 'var(--cyan)');
  set('indRSIl', rv < 30 ? 'Sobreventa' : rv > 70 ? 'Sobrecompra' : 'Neutral');

  set('indADX', av != null ? av : '--');
  setC('indADX', av > 30 ? green : av > 25 ? 'var(--purple)' : 'var(--tx3)');
  set('indADXl', av > 30 ? 'Tendencia fuerte' : av > 25 ? 'Tendencia activa' : 'Sin tendencia');

  set('indBB', pb != null ? pb.toFixed(2) : '--');
  setC('indBB', pb < 0.2 ? teal : pb > 0.8 ? red : 'var(--cyan)');
  set('indBBl', pb < 0.2 ? 'Sobreventa' : pb > 0.8 ? 'Sobrecompra' : 'Zona media');

  if (ma40 && px) {
    const d = (px - ma40) / ma40 * 100;
    set('indMA40d', fPct(d)); setC('indMA40d', cGR(d));
    set('indMA40l', d >= 0 ? 'sobre MA40' : 'bajo MA40');
  }
  // Método detail P2 y P3
  const { rv:r, av:a, pb:p, bw } = sc;
  const md2 = $('met-p2d'); if(md2) md2.textContent = 'ADX: '+(a??'--')+' · RSI: '+(r??'--');
  const md3 = $('met-p3d'); if(md3) md3.textContent = '%B: '+(p!=null?p.toFixed(2):'--')+' · BW: '+(bw!=null?bw+'%':'--');
}

function renderSR(sr, px) {
  set('srR2', fUSD(sr.r2, 0)); set('srR1', fUSD(sr.r1, 0));
  set('srS1', fUSD(sr.s1, 0)); set('srS2', fUSD(sr.s2, 0));
  if (px > 0) set('srLive', fUSD(px, 2));
}

/* ════════════════════════════════════════════
   INDICADORES — carga y refresco
════════════════════════════════════════════ */
async function refreshIndicators() {
  try {
    const candles = await loadKlines('15m', 220);
    const cl = candles.map(c => c.c);
    const hi = candles.map(c => c.h);
    const lo = candles.map(c => c.l);

    const sc = computeScore(cl, hi, lo);
    lastScore = sc;

    renderScore(sc);
    renderMAs(sc);
    renderSignals(sc);
    renderInd(sc);

    // S/R
    const n = 25;
    const rh = Math.max(...hi.slice(-n)), rl = Math.min(...lo.slice(-n)), rng = rh - rl;
    renderSR({ r2: rh+rng*0.1, r1: rh, s1: rl, s2: rl-rng*0.1 }, livePx || sc.px);

    // VWAP y ATR
    const vwap = calcVWAP(candles);
    const atr  = calcATR(hi, lo, cl);
    if (vwap) set('vwapEl', fUSD(vwap));
    if (atr)  set('atrEl',  fUSD(atr));

    addLog('IND', teal, 'Score ' + sc.score + '/100 · RSI ' + (sc.rv??'--') + ' · ADX ' + (sc.av??'--'));

  } catch(e) {
    console.error('refreshIndicators', e);
    addLog('IND', red, 'Error cargando indicadores');
  }
}

async function refreshMTF() {
  const tfs = ['1m','3m','5m','15m'];
  const ids = ['mtf1m','mtf3m','mtf5m','mtf15m'];
  const w   = [0.10, 0.15, 0.25, 0.50];
  const scores = [];

  for (const tf of tfs) {
    try {
      const c  = await loadKlines(tf, 220);
      const cl = c.map(x => x.c), hi = c.map(x => x.h), lo = c.map(x => x.l);
      scores.push(computeScore(cl, hi, lo).score);
    } catch(e) { scores.push(0); }
  }

  scores.forEach((s, i) => {
    const el = $(ids[i]);
    if (el) { el.textContent = s; el.style.color = scoreColor(s); }
  });

  const mtf = Math.round(scores.reduce((a, s, i) => a + s * w[i], 0));
  const mt = $('mtfTotal');
  if (mt) { mt.textContent = mtf; mt.style.color = scoreColor(mtf); }
}

/* ════════════════════════════════════════════
   RANGOS — async function (bug D4 corregido)
════════════════════════════════════════════ */
async function renderRangosPage() {
  const grid = $('rangeGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;padding:1rem;color:var(--tx3);font-family:var(--mono);font-size:11px">Calculando rangos multi-TF...</div>';

  const tfs = ['15m', '5m', '3m', '1m'];
  const results = [];

  for (const tf of tfs) {
    try {
      const c  = await loadKlines(tf, 60);
      const cl = c.map(x => x.c), hi = c.map(x => x.h), lo = c.map(x => x.l);
      const px = cl[cl.length-1];
      const rh = Math.max(...hi.slice(-20)), rl = Math.min(...lo.slice(-20));
      const rng = rh - rl;
      const pct = rng > 0 ? (px - rl) / rng : 0.5;
      const zona = pct > 0.7 ? '⬆ ZONA ALTA' : pct < 0.3 ? '⬇ ZONA BAJA' : '◆ ZONA MEDIA';
      const rv = rsiLast(cl), av = adxLast(hi, lo, cl);
      const pres = av && av > 25 ? (rv && rv > 50 ? 'Compradora' : 'Vendedora') : 'Neutra';
      results.push({ tf, px, r2: Math.round(rh+rng*0.1), r1: Math.round(rh), s1: Math.round(rl), s2: Math.round(rl-rng*0.1), zona, pres, rv, av });
    } catch(e) {
      results.push({ tf, px: livePx, r2: 0, r1: 0, s1: 0, s2: 0, zona: '--', pres: '--', rv: null, av: null });
    }
  }

  grid.innerHTML = results.map((r, i) => `
    <div class="range-card">
      <div class="rng-hd">
        <div>
          <div class="rng-tf">${r.tf}${i===0?' <span style="font-size:9px;padding:1px 7px;border-radius:4px;background:rgba(0,212,160,.15);color:var(--teal)">DOM</span>':''}</div>
          <div class="rng-state">${r.zona}</div>
        </div>
        <div class="rng-pres">
          <div style="font-size:9px;color:var(--tx3);font-family:var(--mono)">Presión</div>
          <div class="rng-pres-v">${r.pres.toUpperCase()}</div>
          <div class="rng-pres-s">${r.rv!=null?'RSI '+r.rv:'--'} · ${r.av!=null?'ADX '+r.av:'--'}</div>
        </div>
      </div>
      <div class="rng-levels">
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--red)">R2</div><div class="rng-lv-px">${r.r2>0?fUSD(r.r2):'---'}</div><div class="rng-lv-tp">resistencia</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--red)">R1</div><div class="rng-lv-px">${r.r1>0?fUSD(r.r1):'---'}</div><div class="rng-lv-tp">resistencia</div></div>
        <div class="rng-lv rng-lv-live"><div class="rng-lv-lb" style="color:var(--teal)">●</div><div class="rng-lv-px" style="color:var(--teal)" data-rl="${r.tf}">${livePx>0?fUSD(livePx,2):fUSD(r.px,2)}</div><div class="rng-lv-tp">live</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--green)">S1</div><div class="rng-lv-px">${r.s1>0?fUSD(r.s1):'---'}</div><div class="rng-lv-tp">soporte</div></div>
        <div class="rng-lv"><div class="rng-lv-lb" style="color:var(--green)">S2</div><div class="rng-lv-px">${r.s2>0?fUSD(r.s2):'---'}</div><div class="rng-lv-tp">soporte</div></div>
      </div>
      <div class="rng-meta">
        <div class="rng-mi"><div class="rng-mi-lb">RSI</div><div class="rng-mi-v" style="color:${r.rv!=null?(r.rv<30?'var(--teal)':r.rv>70?red:'var(--tx2)'):'var(--tx3)'}">${r.rv??'--'}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">ADX</div><div class="rng-mi-v" style="color:${r.av!=null&&r.av>25?green:'var(--tx3)'}">${r.av??'--'}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">Zona</div><div class="rng-mi-v">${r.zona.split(' ').slice(1,3).join(' ')}</div></div>
        <div class="rng-mi"><div class="rng-mi-lb">Presión</div><div class="rng-mi-v">${r.pres}</div></div>
      </div>
    </div>
  `).join('');

  const rb = $('rangeBias');
  if (rb && results[0]) {
    rb.textContent = 'Bias 15m: ' + results[0].zona + ' · ' + results[0].pres;
    rb.style.color = results[0].pres === 'Compradora' ? teal : results[0].pres === 'Vendedora' ? red : 'var(--tx3)';
  }
}

/* ════════════════════════════════════════════
   TRADES — geEstado normaliza status/estado
   calcRActual recalcula en cada tick WS
════════════════════════════════════════════ */
function geEstado(t) {
  return ((t.status || t.estado || '')).toUpperCase().trim();
}

function calcRActual(t, px) {
  if (geEstado(t) !== 'OPEN') return null;
  const e = parseFloat(t.entry), sl = parseFloat(t.sl);
  const risk = Math.abs(e - sl);
  if (!risk) return 0;
  const side = (t.side || 'long').toUpperCase();
  return (side === 'LONG' ? px - e : e - px) / risk;
}

function updateOpenTradesR(px) {
  ['tradesTbody', 'tradesFullTbody'].forEach(tbId => {
    const tb = $(tbId); if (!tb) return;
    tb.querySelectorAll('tr[data-trade-id]').forEach(row => {
      const t = allTrades.find(x => String(x.id) === row.dataset.tradeId);
      if (!t) return;
      const r = calcRActual(t, px);
      const cell = row.querySelector('[data-r]');
      if (cell && r != null) { cell.textContent = fR(r); cell.style.color = cGR(r); }
    });
  });
}

function buildTradeRow(t, px) {
  const est = geEstado(t), isOpen = est === 'OPEN';
  const r = isOpen ? calcRActual(t, px) : parseFloat(t.r_actual ?? t.r);
  const rStr = r != null ? fR(r) : '--';
  const rClr = r != null ? cGR(r) : 'var(--tx3)';
  let bc = 'b-op', bt = t.status || t.estado || '?';
  if (est.startsWith('TP')) { bc = 'b-tp'; bt = 'TP ✓'; }
  else if (est.startsWith('SL')) { bc = 'b-sl'; bt = 'SL ✗'; }
  else if (est.startsWith('BE')) { bc = 'b-be'; bt = 'BE —'; }
  const tr = document.createElement('tr');
  if (isOpen) tr.dataset.tradeId = t.id;
  tr.innerHTML = `<td>${t.id}</td><td><span class="badge ${bc}">${bt}</span></td><td>${t.tf||'--'}</td><td>${t.side||'--'}</td><td>${t.setup||'--'}</td><td>${t.entry||'--'}</td><td>${t.sl||'--'}</td><td>${t.tp1||'--'}</td><td>${t.tp2||'--'}</td><td>${t.mfe||'--'}</td><td>${t.mae||'--'}</td><td>${t.dur||'--'}</td><td style="color:${rClr};font-weight:700" data-r="1">${rStr}</td>`;
  return tr;
}

function renderTrades(list, px) {
  const closed = list.filter(t => geEstado(t) !== 'OPEN');
  const open   = list.filter(t => geEstado(t) === 'OPEN');
  const tp = closed.filter(t => geEstado(t).startsWith('TP')).length;
  const sl = closed.filter(t => geEstado(t).startsWith('SL')).length;
  const be = closed.filter(t => geEstado(t).startsWith('BE')).length;
  const rs  = closed.map(t => parseFloat(t.r_actual ?? t.r) || 0);
  const rt  = rs.reduce((a,b) => a+b, 0);
  const wins = rs.filter(r => r > 0).length;
  const wr  = closed.length > 0 ? (wins/closed.length*100).toFixed(1) : '0.0';
  const wA  = rs.filter(r => r > 0).reduce((a,b) => a+b, 0);
  const lA  = Math.abs(rs.filter(r => r < 0).reduce((a,b) => a+b, 0));
  const pf  = lA > 0 ? (wA/lA).toFixed(2) : '∞';
  const pnl = closed.reduce((a,t) => a + (parseFloat(t.pnl)||0), 0);
  const dd  = Math.min(0, ...rs, 0);

  set('tOpen', open.length);
  set('tOpenSub', open.map(t => t.side||'?').join(' · ') || '--');
  set('tClosed', closed.length);
  set('tClosedSub', 'TP:' + tp + ' BE:' + be + ' SL:' + sl);
  set('stTPBESL', tp + '/' + be + '/' + sl);
  set('stWR', wr + '%');
  set('stRT', fR(rt)); setC('stRT', cGR(rt));
  set('stPnL', (pnl>=0?'+':'') + pnl.toFixed(2) + '$'); setC('stPnL', cGR(pnl));
  set('stPF', pf);
  set('stDD', dd.toFixed(2) + 'R'); setC('stDD', dd < 0 ? red : green);
  set('tradesStatus', 'trades.json · ' + list.length + ' trades');

  // Render en dashboard mini (tradesTbody)
  const tb1 = $('tradesTbody');
  if (tb1) {
    tb1.innerHTML = '';
    [...list].reverse().forEach(t => tb1.appendChild(buildTradeRow(t, px)));
  }
}

/* Render en página Trades completa (tradesFullTbody) */
function renderTradesPage() {
  const tb = $('tradesFullTbody');
  if (!tb) return;
  if (!allTrades.length) {
    tb.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--tx3);padding:1rem">Sin datos de trades</td></tr>';
    return;
  }
  tb.innerHTML = '';
  [...allTrades].reverse().forEach(t => tb.appendChild(buildTradeRow(t, livePx)));
}

async function loadTrades() {
  try {
    const d = await fetchJ('/trades.json');
    allTrades = Array.isArray(d) ? d : (d.trades || []);
    renderTrades(allTrades, livePx);
    set('sys-trades', '✅ ' + allTrades.length + ' trades');
    addLog('TRADES', teal, allTrades.length + ' trades cargados');
  } catch(e) {
    console.error('trades', e);
    set('sys-trades', '❌ Error');
    const tb = $('tradesTbody');
    if (tb) tb.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--tx3);padding:1rem">Error cargando trades.json</td></tr>';
  }
}

/* ════════════════════════════════════════════
   MACRO — F&G, CoinGecko, EUR via Binance
════════════════════════════════════════════ */
async function loadFG() {
  try {
    const d = await fetchJ(FNG);
    const fg = parseInt(d.data[0].value);
    const lb = d.data[0].value_classification;
    const c = fg<=20?teal:fg<=40?'#86efac':fg<=60?'var(--tx3)':fg<=80?'var(--amber)':red;
    set('mFNG', fg); setC('mFNG', c);
    set('mFNGl', lb);
    const b = $('mFNGb'); if(b){b.style.width=fg+'%';b.style.background=c;}
    set('sys-fg', '✅ ' + fg + ' ' + lb);
    addLog('F&G', teal, 'Fear & Greed: ' + fg + ' — ' + lb);
  } catch(e) { set('sys-fg', '❌ Error'); }
}

async function loadCG() {
  try {
    const d = await fetchJ(CG);
    const dom = d.data.market_cap_percentage?.btc || 0;
    const mc  = d.data.total_market_cap?.usd || 0;
    set('mDOM', dom.toFixed(1) + '%');
    set('mDOMl', dom > 60 ? 'BTC dominante' : dom > 45 ? 'Equilibrado' : 'Altseason');
    const db = $('mDOMb'); if(db) db.style.width = dom+'%';
    set('mMCAP', fK(mc));
    set('mMCAPl', 'Vol: ' + fK(d.data.total_volume?.usd||0));
    addLog('CG', teal, 'Dom BTC: ' + dom.toFixed(1) + '% · MCap: ' + fK(mc));
  } catch(e) { console.error('CG', e); }
}

async function loadEUR() {
  try {
    const d = await fetchJ(BN_API + '/ticker/price?symbol=EURUSDT');
    eurRate = parseFloat(d.price);
    set('mEUR', eurRate.toFixed(4));
    const eb = $('mEURb'); if(eb) eb.style.width = Math.min(100,(eurRate-0.8)*500)+'%';
    set('sys-eur', '✅ ' + eurRate.toFixed(4));
  } catch(e) { set('sys-eur', '❌ Error'); }
}

/* ════════════════════════════════════════════
   LOG DE SISTEMA
════════════════════════════════════════════ */
function addLog(tag, col, msg) {
  const ts = new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
  alertLog.unshift({ ts, tag, col, msg });
  if (alertLog.length > 10) alertLog.pop();

  const cm = { [teal]:'rgba(0,212,160,.12)', [green]:'rgba(34,197,94,.15)', [red]:'rgba(239,68,68,.15)', 'var(--amber)':'rgba(245,158,11,.15)', 'var(--blue)':'rgba(59,130,246,.15)' };
  const ct = { [teal]:teal, [green]:green, [red]:red, 'var(--amber)':'var(--amber)', 'var(--blue)':'var(--blue)' };

  ['alertLst', 'sysLog'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = alertLog.map(a => `<div class="al-row"><div class="al-t">${a.ts}</div><div class="al-tg" style="background:${cm[a.col]||'rgba(59,130,246,.15)'};color:${ct[a.col]||'var(--blue)'}">${a.tag}</div><div class="al-m">${a.msg}</div></div>`).join('');
  });
}

/* ════════════════════════════════════════════
   NAVEGACIÓN SPA
   Sin onclick inline — addEventListener en init
════════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('ac', b.dataset.page === id));
  const pg = $('page-' + id);
  if (pg) pg.classList.add('active');
  history.pushState({ page: id }, '', id === 'dashboard' ? '/' : '/' + id);

  if (id === 'rangos') renderRangosPage();
  if (id === 'trades') renderTradesPage();
  if (id === 'metodo' && lastScore) renderScore(lastScore);
}

/* ════════════════════════════════════════════
   SELECTOR DE MONEDA
════════════════════════════════════════════ */
function setCoin(c) {
  coin = c;
  livePx = 0;
  document.querySelectorAll('#coinBtns .cb-btn').forEach(b => b.classList.toggle('ac', b.dataset.coin === c));
  ['priceUSD','h24','l24','vol24','priceEUR','vwapEl','atrEl'].forEach(id => set(id, '---'));
  const ce = $('priceChg'); if(ce) ce.style.display = 'none';
  startWS();
  loadTicker();
  refreshIndicators();
  addLog('COIN', 'var(--blue)', 'Moneda: ' + c);
}

/* ════════════════════════════════════════════
   INIT — orden de carga correcto
   Sin ningún await fuera de función async
════════════════════════════════════════════ */
(async function init() {
  console.log('[STX] Iniciando SONO TERMINAL X v2...');

  // Reloj cada segundo
  setInterval(() => set('clockEl', new Date().toLocaleTimeString('es-ES')), 1000);

  // Navegación SPA sin onclick inline
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  document.querySelectorAll('#coinBtns .cb-btn').forEach(btn => {
    btn.addEventListener('click', () => setCoin(btn.dataset.coin));
  });
  window.addEventListener('popstate', e => {
    if (e.state?.page) showPage(e.state.page);
  });

  // 1. EUR primero (sin CORS, Binance EURUSDT)
  await loadEUR();

  // 2. WebSocket precio live
  startWS();
  startWatchdog();

  // 3. Ticker 24h (H/L/Vol)
  loadTicker();

  // 4. Indicadores y Score (15m)
  refreshIndicators();

  // 5. Macro
  loadFG();
  loadCG();

  // 6. Trades
  loadTrades();

  // 7. MTF (después de 5s para no saturar Binance)
  setTimeout(refreshMTF, 5000);

  // Refrescos periódicos
  setInterval(loadTicker,        30_000);
  setInterval(refreshIndicators, 60_000);
  setInterval(loadFG,           300_000);
  setInterval(loadCG,           300_000);
  setInterval(loadEUR,        3_600_000);
  setInterval(loadTrades,       120_000);
  setInterval(refreshMTF,       120_000);

  addLog('STX', teal, 'SONO Terminal X v2 iniciado · datos reales activos');
  console.log('[STX] init() completado');
})();
