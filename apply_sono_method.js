const fs = require('fs');
const { execSync } = require('child_process');

// ==========================================
// 1. LEER ARCHIVOS
// ==========================================
const htmlPath = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html';
const jsPath = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js';

let html = fs.readFileSync(htmlPath, 'utf8');
let js = fs.readFileSync(jsPath, 'utf8');

// ==========================================
// 2. REEMPLAZAR BLOQUE page-metodo EN HTML
// ==========================================
const conceptHtml = fs.readFileSync('C:/Users/sparreno/.openclaw/media/inbound/SONO_METHOD_CONCEPT---351de96a-7fa1-45d7-a603-48039ed0c671.html', 'utf8');

// Extraer solo body content
const bodyStart = conceptHtml.indexOf('<body>') + 6;
const bodyEnd = conceptHtml.indexOf('</body>');
const conceptBody = bodyStart > 5 ? conceptHtml.substring(bodyStart, bodyEnd).trim() : conceptHtml;

// Encontrar page-metodo
const metIdx = html.lastIndexOf('page-metodo');
if (metIdx < 0) { console.log('ERROR: page-metodo not found'); process.exit(1); }

// Encontrar el div page-metodo
const pageOpen = html.lastIndexOf('<div class="page" id="page-metodo">', metIdx);
const closeMet = html.indexOf('!-- /page-metodo -->', pageOpen);
const insertPoint = closeMet >= 0 ? closeMet + '!-- /page-metodo -->'.length : html.indexOf('TRADES', pageOpen);

console.log('page-metodo from', pageOpen, 'to', insertPoint);

// Reemplazar
const newSection = '<div class="page" id="page-metodo">\n' + conceptBody + '\n</div><!-- /page-metodo -->';
html = html.substring(0, pageOpen) + newSection + html.substring(insertPoint);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('OK index.html');

// ==========================================
// 3. PARCHES AL JS
// ==========================================

// A. initSonoMethod() call inside init()
// Hooks ya existentes: initSonoModule() -> cambiarlo a initSonoMethod()
js = js.replace('initSonoModule();', 'initSonoMethod();');
js = js.replace('initSonoModule()', 'initSonoMethod()');
// En caso no exista, buscamos init() function
if (!js.includes('initSonoMethod()')) {
  const initFn = js.indexOf('async function init()');
  if (initFn >= 0) {
    const bodyStart = js.indexOf('{', initFn) + 1;
    js = js.substring(0, bodyStart) + '\n  initSonoMethod();\n' + js.substring(bodyStart);
    console.log('initSonoMethod inserted in init()');
  }
}

// B. updateSonoMethod(sc) in renderScore
const rsIdx = js.indexOf('function renderScore');
if (rsIdx >= 0) {
  const rsEnd = js.indexOf('function', rsIdx + 20);
  const segment = rsEnd > 0 ? js.substring(rsIdx, rsEnd) : js.substring(rsIdx);
  const lastBrace = segment.lastIndexOf('}');
  if (lastBrace > 0 && !segment.includes('updateSonoMethod')) {
    const absPos = rsIdx + lastBrace;
    js = js.substring(0, absPos) + '\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n' + js.substring(absPos);
    console.log('updateSonoMethod inserted in renderScore');
  }
}

// C. updateSonoMethod at end of loadTicker
const ltIdx = js.indexOf('async function loadTicker');
if (ltIdx >= 0) {
  const nextFn = js.indexOf('async function', ltIdx + 10);
  const segment = nextFn > 0 ? js.substring(ltIdx, nextFn) : js.substring(ltIdx);
  const lastBrace = segment.lastIndexOf('}');
  if (lastBrace > 0 && !js.includes('updateSonoMethod(', ltIdx)) {
    const absPos = ltIdx + lastBrace;
    js = js.substring(0, absPos) + '\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n' + js.substring(absPos);
    console.log('updateSonoMethod inserted in loadTicker');
  }
}

// D. updateSonoMethod at end of refreshIndicators
const riIdx = js.indexOf('async function refreshIndicators');
if (riIdx >= 0) {
  const nextFn = js.indexOf('async function', riIdx + 10);
  const segment = nextFn > 0 ? js.substring(riIdx, nextFn) : js.substring(riIdx);
  const lastBrace = segment.lastIndexOf('}');
  if (lastBrace > 0 && !js.includes('updateSonoMethod(', riIdx)) {
    const absPos = riIdx + lastBrace;
    js = js.substring(0, absPos) + '\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n' + js.substring(absPos);
    console.log('updateSonoMethod inserted in refreshIndicators');
  }
}

// ==========================================
// 4. BLOQUE JS COMPLETO initSonoMethod
// ==========================================
const moduleCode = `
/* S S S S S S O N O   M E T H O D (tm) M O D U L E S S S S S S */
function initSonoMethod() {
  const $ = id => document.getElementById(id);
  const fmt = n => Number.isFinite(n) ? n.toLocaleString('en-US', {maximumFractionDigits: 2}) : '--';
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };

  const s = {
    price: 0, atr: 0, ma6: 0, ma40: 0, ma70: 0, ma200: 0,
    rsi: 0, adx: 0, pb: 0, bw: 0, gap: 0, score: 0,
    confidence: 0, confluence: 0
  };

  function calcPosition() {
    const cap = +($('capIn')?.value || 0);
    const risk = (+($('riskIn')?.value || 0)) / 100;
    const atr = +($('atrIn')?.value || s.atr || 0);
    const stop = +($('stopIn')?.value || Math.max(0, s.price - 1.5 * atr));
    const entry = s.price;
    const loss = cap * risk;
    const qty = loss / Math.max(1e-9, Math.abs(entry - stop));
    const tp = entry + 2 * Math.abs(entry - stop);
    set('qtyOut', fmt(qty));
    set('slOut', fmt(stop));
    set('tpOut', fmt(tp));
    set('rrOut', '1:2');
    set('lossOut', '$' + fmt(loss));
    set('profitOut', '$' + fmt(loss * 2));
  }

  function execPanel(px, atr, conf) {
    const sl = Math.max(0, px - 1.5 * atr);
    const tp = px + 2 * (px - sl);
    set('execEntry', '$' + fmt(px));
    set('execStop', '$' + fmt(sl));
    set('execTarget', '$' + fmt(tp));
    set('execRR', '1:2');
    set('execDur', '15m-4h');
    set('execConf', (conf || 50) + '%');
  }

  function strategyGrid() {
    const grid = $('stratGrid');
    if (!grid) return;
    const data = [
      ['01','Gap Recovery','ACTIVE','84%','on-long'],
      ['02','Gap Exhaustion','INACTIVE','21%','off'],
      ['03','Trend Cross','ACTIVE','91%','on-long'],
      ['04','Death Cross','INACTIVE','14%','off'],
      ['05','BB Reversal Long','ACTIVE','73%','on-long'],
      ['06','BB Reversal Short','INACTIVE','27%','off'],
      ['07','Confluence Setup','ACTIVE','88%','on-conf'],
      ['08','Volatility Breakout','ACTIVE','69%','on-break']
    ];
    grid.innerHTML = data.map(x => '' +
      '<div class="card pad" style="padding:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div style="font-family:var(--mono);font-size:24px;font-weight:900">' + x[0] + '</div>' +
          '<div class="chip ' + (x[2] === 'ACTIVE' ? 'on' : 'off') + '"><span class="s"></span>' + x[2] + '</div></div>' +
        '<div style="font-weight:800;margin-top:6px">' + x[1] + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">Nivel de activaci\u00f3n</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">' +
          '<b>' + x[3] + '</b><span class="pill ' + (x[4].includes('short') ? 'short' : 'long') + '">' + x[4] + '</span></div>' +
        '<div class="bar" style="margin-top:10px"><i style="width:' + x[3] + '"></i></div></div>'
    ).join('');
  }

  window.updateSonoMethod = function(sc) {
    if (sc) {
      s.price = sc.price || s.price;
      s.atr = sc.atr || s.atr;
      s.ma6 = sc.ma6 || s.ma6;
      s.ma40 = sc.ma40 || s.ma40;
      s.ma70 = sc.ma70 || s.ma70;
      s.ma200 = sc.ma200 || s.ma200;
      s.rsi = sc.rsi || s.rsi;
      s.adx = sc.adx || s.adx;
      s.pb = sc.pb ?? s.pb;
      s.bw = sc.bw ?? s.bw;
      s.gap = sc.gap ?? s.gap;
      s.score = sc.total || s.score;
    }

    const px = s.price;
    const sig = s.score >= 82 ? 'STRONG LONG' : s.score >= 65 ? 'LONG' : s.score >= 50 ? 'NEUTRAL' : s.score >= 35 ? 'SHORT' : 'STRONG SHORT';

    const dot = $('sonoDot');
    if (dot) dot.className = 'dot ' + (sig.includes('LONG') ? 'bull' : sig.includes('SHORT') ? 'bear' : '');
    set('sonoSignal', sig);
    set('sonoSub', 'Decisi\u00f3n operativa basada en confluencias');
    set('sonoScore', s.score + '/100');
    set('sonoConf', Math.round(Math.min(95, 50 + s.score * 0.45)) + '%');
    set('sonoRisk', s.score >= 65 ? 'Bajo' : s.score >= 50 ? 'Medio' : 'Alto');
    set('macroBias', px > s.ma200 ? 'Bullish' : px < s.ma200 ? 'Bearish' : 'Neutral');
    set('microBias', s.ma6 > s.ma70 ? 'Bullish' : 'Bearish');
    set('momentumBias', s.adx > 25 ? 'Active' : 'Weak');
    set('volBias', s.bw > 5 ? 'Expanding' : 'Compressed');

    const trend = (px > s.ma200 ? 30 : 5) + (s.ma6 > s.ma70 ? 15 : 0) + (px > s.ma40 ? 10 : 0);
    const mom = (s.adx > 25 ? 15 : 8) + (s.rsi > 55 ? 10 : s.rsi < 30 ? 12 : 6);
    const vol = (s.pb < 0.2 ? 20 : s.pb > 0.8 ? 5 : 15) + (s.bw > 5 ? 10 : 8);
    const gapS = (s.gap > 5 ? 20 : s.gap > 2 ? 12 : 6);

    set('trendScore', trend + '/55');
    set('momScore', mom + '/35');
    set('volScore', vol + '/30');
    set('gapScore', gapS + '/20');

    const tb = $('trendBar'); if (tb) tb.style.width = Math.min(100, trend / 55 * 100) + '%';
    const mb = $('momBar'); if (mb) mb.style.width = Math.min(100, mom / 35 * 100) + '%';
    const vb = $('volBar'); if (vb) vb.style.width = Math.min(100, vol / 30 * 100) + '%';
    const gb = $('gapBar'); if (gb) gb.style.width = Math.min(100, gapS / 20 * 100) + '%';

    set('msTrend', px > s.ma200 ? 'Bullish' : 'Bearish');
    set('msMacro', px > s.ma200 ? 'Long bias' : 'Short bias');
    set('msMicro', s.ma6 > s.ma70 ? 'Long' : 'Short');
    set('msVol', s.bw > 5 ? 'Expanding' : 'Compressed');

    s.confluence = [px > s.ma200, s.ma6 > s.ma70, s.adx > 25, s.bw > 3.5, s.pb > 0.2 && s.pb < 0.8].filter(Boolean).length;
    set('sonoConfCount', s.confluence + '/5');

    const mg = $('matrixGrid');
    if (mg) {
      const checks = [
        ['Trend Engine', px > s.ma200],
        ['Momentum Engine', s.adx > 25],
        ['Volatility Engine', s.bw > 3.5],
        ['Gap Engine', Math.abs(s.gap) > 1],
        ['Risk Engine', s.confluence >= 3]
      ];
      mg.innerHTML = checks.map(([n, v]) =>
        '<div class="box"><span class="muted">' + n + '</span><b style="color:' + (v ? 'var(--bull)' : 'var(--bear)') + '">' + (v ? '\u2714' : '\u2716') + '</b></div>'
      ).join('');
      const mr = $('matrixResult');
      if (mr) mr.textContent = checks.filter(x => x[1]).length + '/5 Motores alineados';
    }

    execPanel(px, s.atr, Math.round(Math.min(95, 50 + s.score * 0.45)));
    strategyGrid();
  };

  const calcBtn = $('calcBtn');
  if (calcBtn) calcBtn.addEventListener('click', calcPosition);
  const liveBtn = $('liveBtn');
  if (liveBtn) liveBtn.addEventListener('click', function () {
    const atrIn = $('atrIn');
    const stopIn = $('stopIn');
    if (atrIn) atrIn.value = s.atr;
    if (stopIn) stopIn.value = Math.max(0, s.price - 1.5 * s.atr);
    calcPosition();
  });
}
`;

// Insert before the last ')();'
const lastCall = js.lastIndexOf('})();');
if (lastCall >= 0) {
  js = js.substring(0, lastCall) + '\n' + moduleCode + '\n' + js.substring(lastCall);
} else {
  js += '\n' + moduleCode;
}
console.log('initSonoMethod module appended');

fs.writeFileSync(jsPath, js, 'utf8');

// ==========================================
// 5. VERIFICACION
// ==========================================
console.log('\n=== VERIFICACION ===');
const h2 = fs.readFileSync(htmlPath, 'utf8');
const j2 = fs.readFileSync(jsPath, 'utf8');
console.log('HTML: sonoMethod=', h2.includes('sonoMethod'), '| sonoSignal=', h2.includes('sonoSignal'));
console.log('JS: initSonoMethod function=', j2.includes('function initSonoMethod('));
console.log('JS: initSonoMethod() call=', j2.includes('initSonoMethod();'));
console.log('JS: updateSonoMethod =', j2.includes('window.updateSonoMethod'));
console.log('JS: updateSonoMethod(lastScore)=', j2.includes('updateSonoMethod(lastScore)'));

try {
  execSync('node --check "' + jsPath + '"', { encoding: 'utf8' });
  console.log('node --check: OK');
} catch (e) {
  console.log('node --check: FAIL', e.stderr ? e.stderr.substring(0, 120) : 'unknown');
}
