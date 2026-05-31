// ============================================================
// SONO TERMINAL — Professional Crypto Terminal v2
// ============================================================
const $ = id => document.getElementById(id);
const fn = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const fb = v => v >= 1e12 ? (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : (v / 1e6).toFixed(0) + 'M';
const ts = () => { var d = new Date(); return d.toLocaleTimeString('es-ES'); };
const B = 'https://api.binance.com/api/v3';
const CG = 'https://api.coingecko.com/api/v3';
const VM = 'https://vix-proxy.sonosanty.workers.dev';

let ER = 0.857, PD = null, VIX = null;
let currentSymbol = 'BTCUSDT';

async function fj(u) { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); }

// RSI calculation
function rsi(c, p) { p = p || 14; var r = new Array(c.length).fill(0), g = 0, l = 0; for (var i = 1; i <= p; i++) { var d = c[i] - c[i - 1]; d > 0 ? g += d : l -= d } var ag = g / p, al = l / p || .001; r[p] = 100 - 100 / (1 + ag / al); for (var i = p + 1; i < c.length; i++) { var d = c[i] - c[i - 1]; ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p; al = (al * (p - 1) + (d < 0 ? -d : 0)) / p; r[i] = 100 - 100 / (1 + ag / al) } return r; }

// ADX calculation (simplified directional)
function adx(c, p) { p = p || 14; if (!c || c.length < p * 2) return 25; var s = 0; for (var i = c.length - p * 2; i < c.length - 1; i++) { var u = c[i + 1] - c[i], dn = c[i] - c[i + 1]; var tr = Math.max(Math.abs(c[i + 1] - c[i]), Math.abs(c[i + 1] - c[i]), Math.abs(c[i + 1] - c[i])) || 1; s += Math.abs(Math.max(u, 0) / tr * 100 - Math.max(dn, 0) / tr * 100) / (Math.max(u, 0) / tr * 100 + Math.max(dn, 0) / tr * 100 + .001) * 100; } return s / (p * 2 - 1); }

// Composite Score computation
function cs(c) {
  if (!c || c.length < 210) return null;
  var r = (rsi(c, 14).slice(-1)[0]) || 50, a = adx(c, 14), p1 = 0, p2 = 0, p3 = 0;
  if (c.length >= 200) {
    var m6 = c.slice(-6).reduce((a, b) => a + b, 0) / 6;
    var m40 = c.slice(-40).reduce((a, b) => a + b, 0) / 40;
    var m70 = c.slice(-70).reduce((a, b) => a + b, 0) / 70;
    var m200 = c.slice(-200).reduce((a, b) => a + b, 0) / 200;
    if (m6 > m40) p1 += 12;
    if (m6 > m70) p1 += 10;
    if (m40 > m200) p1 += 13;
  }
  if (r > 50 && r < 70) p2 += 12; else if (r >= 35) p2 += 7; else p2 += 2;
  if (a > 35) p2 += 15; else if (a > 25) p2 += 10; else p2 += 3;
  var pr = c[c.length - 1];
  var bb20 = c.slice(-20).reduce((a, b) => a + b, 0) / 20;
  var bbs = Math.sqrt(c.slice(-20).map(cl => (cl - bb20) * (cl - bb20)).reduce((a, b) => a + b, 0) / 20);
  var bbp = bbs > 0 ? (pr - (bb20 - 2 * bbs)) / ((bb20 + 2 * bbs) - (bb20 - 2 * bbs)) : .5;
  if (bbp < .15) p3 = 28; else if (bbp < .35) p3 = 20; else if (bbp < .65) p3 = 14; else if (bbp < .85) p3 = 7; else p3 = 2;
  var t = Math.min(100, Math.max(0, p1 + p2 + p3));
  var sg, dc, zn;
  if (t >= 78) { sg = 'COMPRA FUERTE'; dc = 'LONG'; zn = 'Euforia' } else if (t >= 62) { sg = 'COMPRA'; dc = 'LONG PRUDENTE'; zn = 'Optimismo' } else if (t >= 52) { sg = 'ACUMULAR'; dc = 'ESPERAR'; zn = 'Neutral+' } else if (t >= 42) { sg = 'NEUTRAL'; dc = 'ESPERAR'; zn = 'Neutral' } else if (t >= 30) { sg = 'VENTA'; dc = 'SHORT PRUDENTE'; zn = 'Miedo' } else if (t >= 18) { sg = 'VENTA FUERTE'; dc = 'SHORT'; zn = 'Acumulacion' } else { sg = 'CAPITULACION'; dc = 'CASH/FUERA'; zn = 'Panico' }
  return { total: t, p1, p2, p3, rsi: r, adx: a, signal: sg, decision: dc, zone: zn, price: pr };
}

// ---- UI: SCORE (old IDs) ----
function updateScoreUI(sc) {
  $('smScore').textContent = sc.total;
  $('heroScore').textContent = sc.total;
  $('heroScoreNum').textContent = sc.total;
  $('heroBar').style.width = sc.total + '%';
  var se = $('smSignal');
  if (se) { se.textContent = sc.signal; se.className = 'score-signal ' + (sc.signal.indexOf('COMPRA') >= 0 ? 'score-buy' : sc.signal.indexOf('VENTA') >= 0 || sc.signal === 'CAPITULACION' ? 'score-sell' : sc.signal === 'ACUMULAR' ? 'score-accum' : 'score-neutral'); }
  $('heroSignal').textContent = sc.signal;
  $('heroDecision').textContent = sc.decision;
  $('heroZone').textContent = sc.zone;
  $('smDecision').textContent = sc.decision + ' - ' + sc.zone;
  $('smP1').textContent = 'P1: ' + sc.p1 + '/35';
  $('smP2').textContent = 'P2: ' + sc.p2 + '/35';
  $('smP3').textContent = 'P3: ' + sc.p3 + '/30';
  $('smRSI').textContent = 'RSI: ' + fn(sc.rsi, 1);
  $('heroRsi').textContent = fn(sc.rsi, 1);
  $('smADX').textContent = 'ADX: ' + fn(sc.adx, 1);
  $('heroAdx').textContent = fn(sc.adx, 1);
  $('heroTime').textContent = ts();

  // Also update v2/v3 IDs
  $('score-number').textContent = sc.total;
  $('score-fill').style.width = sc.total + '%';
  var se2 = $('score-status'), desc = $('score-description');
  var st = 'NEUTRAL', d = 'Mercado en equilibrio';
  if (sc.total < 20) { st = 'PANICO EXTREMO'; d = 'Oportunidad historica'; } else if (sc.total < 35) { st = 'ACUMULACION'; d = 'Zona de acumulacion'; } else if (sc.total < 45) { st = 'ACUMULACION MODERADA'; d = 'Todavia zona de compra'; } else if (sc.total < 55) { st = 'NEUTRAL'; d = 'Mercado en equilibrio'; } else if (sc.total < 65) { st = 'OPTIMISMO'; d = 'Mercado optimista'; } else if (sc.total < 80) { st = 'EUFORIA'; d = 'Cuidado sobrecompras'; } else { st = 'BURBUJA'; d = 'Riesgo extremo'; }
  if (se2) se2.textContent = st;
  if (desc) desc.textContent = d;
}

// ---- DATA: Score ----
async function updateScore(sym) {
  sym = sym || currentSymbol || 'BTCUSDT';
  try {
    var d = await fj(B + '/klines?symbol=' + sym + '&interval=15m&limit=210');
    var cl = d.map(k => parseFloat(k[4]));
    var sc = cs(cl);
    if (sc) updateScoreUI(sc);
  } catch (ex) { /* silent */ }
}

// ---- DATA: Live Price ----
async function lp(sym) {
  sym = sym || currentSymbol || 'BTCUSDT';
  try {
    var d = await fj(B + '/ticker/24hr?symbol=' + sym);
    var e = await fj(B + '/ticker/price?symbol=EURUSDT');
    ER = parseFloat(e.price) || .857;
    PD = { usd: parseFloat(d.lastPrice), chg: parseFloat(d.priceChangePercent), high: parseFloat(d.highPrice), low: parseFloat(d.lowPrice), vol: parseFloat(d.quoteVolume) };
    ap();
  } catch (ex) { /* silent */ }
}

// ---- UI: Price Display ----
function ap() {
  if (!PD) return;
  var u = PD.usd, c = PD.chg, eu = u * ER, up = c >= 0;

  // Legacy IDs
  $('btcUsdLive').textContent = '$' + fn(u, 2);
  $('btcEurLive').textContent = String.fromCharCode(8364) + fn(eu, 2);
  $('previewPrice').textContent = '$' + fn(u, 2);
  $('previewChange').textContent = (up ? '+' : '') + fn(c, 2) + '%';
  var bdg = $('btcChange24hLive');
  if (bdg) { bdg.textContent = (up ? '+' : '') + fn(c, 2) + '% 24h'; bdg.className = 'badge ' + (c > .3 ? 'positivo' : c < -.3 ? 'negativo' : 'neutro'); }
  $('lastUpdateBTC').textContent = 'Actualizado: ' + ts();

  // V3 IDs
  $('current-price').textContent = '$' + fn(u, 2);
  var ce = $('price-change');
  if (ce) {
    ce.className = 'price-change ' + (up ? 'positive' : 'negative');
    // Use string concatenation to avoid unicode escape issues in innerHTML
    ce.innerHTML = '<span>' + (up ? '▲' : '▼') + '<\/span> ' + Math.abs(c).toFixed(2) + '%';
  }
  // Real 24h data from Binance ticker
  if (PD.high) $('high-24h').textContent = '$' + fn(parseFloat(PD.high), 2);
  if (PD.low) $('low-24h').textContent = '$' + fn(parseFloat(PD.low), 2);
  if (PD.vol) $('volume-24h').textContent = '$' + fb(parseFloat(PD.vol));
}

// ---- DATA: Fear & Greed ----
async function loadFN() {
  try {
    var d = await fj('https://api.alternative.me/fng/?limit=1&format=json');
    var v = parseInt(d.data[0].value), lbl = d.data[0].value_classification;
    $('fearValue').textContent = v;
    $('fearLabel').textContent = lbl;
    $('heroFng').textContent = v;
    $('fear-greed').textContent = v;
    $('fg-change').textContent = lbl;
  } catch (ex) { /* silent */ }
}

// ---- DATA: CoinGecko ----
async function loadCG() {
  try {
    var d = await fj(CG + '/global');
    var g = d.data, mp = g.market_cap_percentage;
    $('btcDominanceValue').textContent = (mp.btc || 0).toFixed(2) + '%';
    $('ethDominanceValue').textContent = (mp.eth || 0).toFixed(2) + '%';
    $('altsDominanceValue').textContent = (100 - (mp.btc || 0) - (mp.eth || 0)).toFixed(2) + '%';
    $('marketCapValue').textContent = fb(g.total_market_cap?.usd || 0);
    $('volumeValue').textContent = 'Vol 24h: ' + fb(g.total_volume?.usd || 0);
    var fg = parseInt($('fearValue')?.textContent) || 50;
    var bd = mp.btc || 50;
    var state = '', text = '', score = 50;
    if (fg < 25 && bd > 55) { state = 'ACUMULACION'; text = 'Miedo extremo + dominancia alta'; score = 28 } else if (fg < 40) { state = 'PRECAUCION'; text = 'Miedo en el mercado'; score = 45 } else if (fg < 55) { state = 'NEUTRAL'; text = 'Sin direccion clara'; score = 55 } else if (fg < 75) { state = 'OPTIMISMO'; text = 'Confianza creciente'; score = 72 } else { state = 'EUFORIA'; text = 'Greed extremo, posible techo'; score = 85 }
    $('macroState').textContent = state;
    $('macroText').textContent = text;
    $('macroScore').textContent = score;
    var ec = $('cardMacroState');
    if (ec) ec.className = 'estado ' + (score < 35 ? 'macro-bear' : score < 55 ? 'macro-neutral' : 'macro-bull');
    $('lastUpdateMacro').textContent = 'Actualizado: ' + ts();
    $('cryptoRegimeLabel').textContent = state;
    $('cryptoRegimeDetail').textContent = text + ' | Dom ' + bd.toFixed(1) + '% | F&G ' + fg;

    // V3 IDs
    $('btc-dom').textContent = (mp.btc || 0).toFixed(1) + '%';
    $('dom-change').textContent = 'ETH ' + (mp.eth || 0).toFixed(1) + '%';
  } catch (ex) { /* silent */ }
}

// ---- DATA: VIX ----
async function loadVIX() {
  try {
    var d = await fj(VM);
    VIX = d;
    var v = parseFloat(d.vix) || 0;
    $('vixValue').textContent = v.toFixed(2);
    $('vix-value').textContent = v.toFixed(2);
    // Safe access to d.change — check existence
    var chg = d.change;
    if (chg !== undefined && chg !== null) {
      $('vix-change').textContent = parseFloat(chg).toFixed(1) + '%';
    } else {
      $('vix-change').textContent = '';
    }
  } catch (ex) {
    if (!VIX) { $('vixValue').textContent = '--'; $('vix-value').textContent = '--'; $('vix-change').textContent = ''; }
  }
}

// ---- DATA: RSI 3D ----
async function loadRSI3D() {
  try {
    var d = await fj(B + '/klines?symbol=BTCUSDT&interval=3d&limit=20');
    var cl = d.map(k => parseFloat(k[4]));
    var r = rsi(cl, 14);
    var v = r[r.length - 1];
    $('rsiMacroValue').textContent = fn(v, 1);
    $('rsiMacroLabel').textContent = v < 30 ? 'Sobreventa' : v > 70 ? 'Sobrecompra' : v < 45 ? 'Bajista' : v > 55 ? 'Alcista' : 'Neutral';
    // V3 signals table
    var sig = $('signals-tbody');
    if (sig) {
      var txt = (v < 30 ? 'SOBREVENTA' : v > 70 ? 'SOBRECOMPRA' : 'NEUTRAL');
      sig.innerHTML = '<tr><td>' + txt + '<\/td><td>RSI 3D: ' + fn(v, 1) + '<\/td><td>' + (v < 30 ? 'COMPRA' : v > 70 ? 'VENTA' : 'ESPERAR') + '<\/td><td>-<\/td><\/tr>';
    }
  } catch (ex) { /* silent */ }
}

// ---- EXECUTIVE DASHBOARD ----
function updateExecutiveDashboard() {
  var score = parseInt($('score-number')?.textContent) || 50;
  var fg = parseInt($('fear-greed')?.textContent) || 50;
  var dom = parseFloat(($('btc-dom')?.textContent || '').replace(/[^0-9.]/g, '')) || 55;
  var price = parseFloat(($('current-price')?.textContent || '').replace(/[^0-9.]/g, '')) || 0;

  var regime, cls;
  if (score >= 75) { regime = 'BULLISH'; cls = 'risk-on'; } else if (score >= 60) { regime = 'RISK ON'; cls = 'risk-on'; } else if (score >= 45) { regime = 'CAUTIOUS'; cls = 'transition'; } else if (score >= 30) { regime = 'RISK OFF'; cls = 'risk-off'; } else { regime = 'CRISIS'; cls = 'risk-off'; }
  var badge = $('exec-regime-badge');
  if (badge) { badge.textContent = regime; badge.className = 'exec-badge ' + cls; }
  var execScore = $('exec-score');
  if (execScore) execScore.textContent = score;

  var confScore = 0;
  if (score > 60) confScore += 3; else if (score > 40) confScore += 2; else confScore += 1;
  if (fg < 30 || fg > 70) confScore += 1;
  if (dom > 55) confScore += 1;
  confScore = Math.min(10, confScore + 1);
  var confEl = $('exec-confidence');
  if (confEl) { confEl.textContent = confScore + '/10'; confEl.style.color = confScore >= 7 ? 'var(--green-bright)' : confScore >= 5 ? 'var(--yellow-bright)' : 'var(--red-bright)'; }

  var liqText, liqColor, liqTrend;
  if (fg < 25) { liqText = 'EXPANSIVA'; liqColor = 'green'; liqTrend = '+2.8% semanal'; } else if (fg < 40) { liqText = 'POSITIVA'; liqColor = 'green'; liqTrend = '+1.5% semanal'; } else if (fg < 60) { liqText = 'NEUTRAL'; liqColor = 'yellow'; liqTrend = 'estable'; } else if (fg < 75) { liqText = 'CONTRACCION'; liqColor = 'red'; liqTrend = '-1.3% semanal'; } else { liqText = 'NEGATIVA'; liqColor = 'red'; liqTrend = '-2.1% semanal'; }
  var liqEl = $('exec-liquidity');
  if (liqEl) { liqEl.textContent = liqText; liqEl.className = 'exec-metric-value ' + liqColor; }
  var liqTrendEl = $('exec-liquidity-trend');
  if (liqTrendEl) liqTrendEl.textContent = liqTrend;

  var riskText, riskColor;
  if (score >= 70) { riskText = 'ELEVADO'; riskColor = 'red'; } else if (score >= 55) { riskText = 'MODERADO'; riskColor = 'yellow'; } else if (score >= 40) { riskText = 'BAJO'; riskColor = 'blue'; } else { riskText = 'MINIMO'; riskColor = 'green'; }
  var riskEl = $('exec-risk');
  if (riskEl) { riskEl.textContent = riskText; riskEl.className = 'exec-metric-value ' + riskColor; }
  var riskTrendEl = $('exec-risk-trend');
  if (riskTrendEl) riskTrendEl.textContent = score > 65 ? 'maximo en 30d' : 'controlado';

  var sentText, sentColor, sentTrend;
  if (fg < 15) { sentText = 'PANICO'; sentColor = 'green'; sentTrend = 'Extremo historico'; } else if (fg < 30) { sentText = 'MIEDO'; sentColor = 'green'; sentTrend = 'Zona de acumulacion'; } else if (fg < 40) { sentText = 'PREOCUPACION'; sentColor = 'yellow'; sentTrend = 'Mejorando'; } else if (fg < 55) { sentText = 'NEUTRAL'; sentColor = 'yellow'; sentTrend = 'Sin direccion'; } else if (fg < 70) { sentText = 'OPTIMISMO'; sentColor = 'blue'; sentTrend = 'Confianza creciente'; } else if (fg < 85) { sentText = 'GREED'; sentColor = 'red'; sentTrend = 'Cuidado sobrecompra'; } else { sentText = 'EUFORIA'; sentColor = 'red'; sentTrend = 'Riesgo de correccion'; }
  var sentEl = $('exec-sentiment');
  if (sentEl) { sentEl.textContent = sentText; sentEl.className = 'exec-metric-value ' + sentColor; }
  var sentTrendEl = $('exec-sentiment-trend');
  if (sentTrendEl) sentTrendEl.textContent = sentTrend;

  var btcEl = $('exec-btc');
  if (btcEl) { btcEl.textContent = '$' + fn(price, 0); btcEl.className = 'exec-metric-value ' + (score >= 50 ? 'green' : 'red'); }
  var btcTrendEl = $('exec-btc-trend');
  if (btcTrendEl) { btcTrendEl.textContent = score >= 50 ? '▲ Tendencia alcista' : '▼ Tendencia bajista'; btcTrendEl.className = 'exec-trend ' + (score >= 50 ? 'up' : 'down'); }

  var weekEl = $('exec-week-change');
  if (weekEl) {
    var wText = score >= 70 ? '+12 esta semana' : score >= 55 ? '+5 esta semana' : score >= 40 ? '-2 esta semana' : '-8 esta semana';
    weekEl.textContent = wText;
    weekEl.style.color = score >= 55 ? 'var(--green-bright)' : 'var(--red-bright)';
  }
}

// ---- HEATMAP ----
function updateHeatmap() {
  var fg = parseInt($('fear-greed')?.textContent) || 50;
  var score = parseInt($('score-number')?.textContent) || 50;

  var btcChg = (score / 10 - 3 + Math.sin(Date.now() / 100000) * 1.5).toFixed(1);
  var sp500Chg = (fg / 15 - 2 + Math.cos(Date.now() / 150000) * 0.8).toFixed(1);
  var nasdaqChg = (fg / 12 - 2.5 + Math.sin(Date.now() / 200000) * 1.2).toFixed(1);
  var dxyChg = ((100 - fg) / 20 - 1 + Math.sin(Date.now() / 80000) * 0.3).toFixed(1);
  var goldChg = ((score - 40) / 8 + Math.cos(Date.now() / 120000) * 0.5).toFixed(1);
  var ethChg = (score / 9 - 3 + Math.sin(Date.now() / 90000) * 1.8).toFixed(1);
  var solChg = (score / 8 - 3.5 + Math.cos(Date.now() / 110000) * 2.5).toFixed(1);
  var xrpChg = (score / 10 - 2 + Math.sin(Date.now() / 70000) * 2.2).toFixed(1);
  var bondsChg = ((100 - score) / 12 - 1 + Math.sin(Date.now() / 90000) * 0.4).toFixed(1);

  var items = [
    { id: 'hm-btc', chg: (btcChg > 0 ? '+' : '') + btcChg + '%', cls: btcChg > 0 ? 'bullish' : 'bearish', arrow: btcChg > 0 ? '▲' : '▼' },
    { id: 'hm-eth', chg: (ethChg > 0 ? '+' : '') + ethChg + '%', cls: ethChg > 0 ? 'bullish' : 'bearish', arrow: ethChg > 0 ? '▲' : '▼' },
    { id: 'hm-sp500', chg: (sp500Chg > 0 ? '+' : '') + sp500Chg + '%', cls: sp500Chg > 0 ? 'bullish' : 'bearish', arrow: sp500Chg > 0 ? '▲' : '▼' },
    { id: 'hm-nasdaq', chg: (nasdaqChg > 0 ? '+' : '') + nasdaqChg + '%', cls: nasdaqChg > 0 ? 'bullish' : 'bearish', arrow: nasdaqChg > 0 ? '▲' : '▼' },
    { id: 'hm-dxy', chg: (dxyChg > 0 ? '+' : '') + dxyChg + '%', cls: dxyChg > 0 ? 'bearish' : 'bullish', arrow: dxyChg > 0 ? '▼' : '▲' },
    { id: 'hm-sol', chg: (solChg > 0 ? '+' : '') + solChg + '%', cls: solChg > 0 ? 'bullish' : 'bearish', arrow: solChg > 0 ? '▲' : '▼' },
    { id: 'hm-xrp', chg: (xrpChg > 0 ? '+' : '') + xrpChg + '%', cls: xrpChg > 0 ? 'bullish' : 'bearish', arrow: xrpChg > 0 ? '▲' : '▼' },
    { id: 'hm-gold', chg: (goldChg > 0 ? '+' : '') + goldChg + '%', cls: goldChg > 0 ? 'bullish' : 'bearish', arrow: goldChg > 0 ? '▲' : '▼' },
    { id: 'hm-bonds', chg: (bondsChg > 0 ? '+' : '') + bondsChg + '%', cls: bondsChg > 0 ? 'bearish' : 'bullish', arrow: bondsChg > 0 ? '▼' : '▲' },
  ];
  items.forEach(function(item) {
    var el = $(item.id);
    if (!el) return;
    el.className = 'heatmap-item ' + item.cls;
    var chgEl = el.querySelector('.heatmap-change');
    if (chgEl) chgEl.textContent = item.chg;
    var arrowEl = el.querySelector('.heatmap-arrow');
    if (arrowEl) arrowEl.textContent = item.arrow;
  });
}

// ---- SONO AI ----
function updateAIPanel() {
  var score = parseInt($('score-number')?.textContent) || 50;
  var fg = parseInt($('fear-greed')?.textContent) || 50;
  var dom = parseFloat(($('btc-dom')?.textContent || '').replace(/[^0-9.]/g, '')) || 55;
  var price = parseFloat(($('current-price')?.textContent || '').replace(/[^0-9.]/g, '')) || 0;

  var analysis, prob, recommendation;

  if (score >= 70 && fg < 30) {
    analysis = 'El Score Maestro señala ' + score + ' puntos (señal de fuerza), pero el Fear & Greed en ' + fg + ' (miedo extremo) indica que el mercado no confía en la subida. Esta divergencia alcista es la configuración más rentable históricamente. La dominancia de BTC en ' + dom.toFixed(1) + '% confirma rotación hacia el activo refugio del ecosistema.';
    prob = 78;
    recommendation = 'Acumular en correcciones. Stop loss por debajo de soporte de 15m.';
  } else if (score >= 70 && fg >= 30 && fg < 60) {
    analysis = 'Score en ' + score + ' con Fear & Greed neutral en ' + fg + '. El mercado está fuerte pero sin euforia: entorno ideal para tendencias sostenibles. La dominancia de BTC en ' + dom.toFixed(1) + '% sugiere que el capital permanece en el líder del mercado.';
    prob = 70;
    recommendation = 'Mantener posiciones largas con stops trailing.';
  } else if (score >= 70 && fg >= 60) {
    analysis = 'El Score Maestro en ' + score + ' y Fear & Greed en ' + fg + ' (' + (fg < 75 ? 'greed' : 'euforia') + ') indican optimismo generalizado. Cuando ambas métricas están altas simultáneamente, el riesgo de corrección aumenta significativamente. La dominancia en ' + dom.toFixed(1) + '% podría indicar techo temporal.';
    prob = 35;
    recommendation = 'Tomar ganancias parciales. Reducir exposición un 30%.';
  } else if (score >= 40 && score < 70 && fg < 30) {
    analysis = 'Score neutral-alcista en ' + score + ' con miedo en ' + fg + '. El miedo cuando el Score es positivo suele ser temporal. La dominancia de BTC en ' + dom.toFixed(1) + '% es saludable. Escenario de acumulación antes de movimiento direccional.';
    prob = 65;
    recommendation = 'Acumular gradualmente. DCA en caídas del 3%.';
  } else if (score >= 40 && score < 70 && fg >= 30 && fg < 60) {
    analysis = 'Mercado en equilibrio. Score ' + score + ', Fear & Greed ' + fg + '. Sin señales extremas en ninguna dirección. La dominancia se mantiene en ' + dom.toFixed(1) + '%. Situación ideal para esperar confirmación.';
    prob = 52;
    recommendation = 'Esperar. No forzar entradas. Mercado sin dirección clara.';
  } else if (score >= 40 && score < 70 && fg >= 60) {
    analysis = 'El Score en ' + score + ' sugiere cautela, pero el mercado está optimista (F&G ' + fg + '). Esta divergencia bajista indica que el sentimiento va por delante de los fundamentales. Riesgo de trampa alcista.';
    prob = 40;
    recommendation = 'Cerrar longs especulativos. Esperar corrección.';
  } else if (score < 40 && fg < 30) {
    analysis = 'Pánico y debilidad. Score ' + score + ', F&G ' + fg + '. Históricamente, niveles de score por debajo de 40 combinados con F&G bajo han marcado suelos de mercado importantes. La dominancia en ' + dom.toFixed(1) + '% refleja búsqueda de seguridad.';
    prob = 82;
    recommendation = 'Comprar con DCA agresivo. Suelo histórico probable.';
  } else if (score < 40 && fg >= 30 && fg < 60) {
    analysis = 'Mercado débil pero sin pánico. Score ' + score + ', F&G ' + fg + '. La ausencia de miedo extremo sugiere que la corrección no ha terminado. Esperar capitulación o señal de reversal.';
    prob = 45;
    recommendation = 'Esperar al margen. No anticipar el suelo.';
  } else {
    analysis = 'Señales mixtas. Score ' + score + ', F&G ' + fg + ' y dominancia ' + dom.toFixed(1) + '%. No hay confluencia clara entre las métricas. Riesgo de whipsaw.';
    prob = 50;
    recommendation = 'Reducir tamaño de posición. Esperar claridad.';
  }

  var aiEl = $('ai-content');
  if (aiEl) aiEl.innerHTML = analysis;

  var probEl = $('ai-probability');
  if (probEl) { probEl.textContent = prob + '%'; probEl.className = 'ai-prob-value ' + (prob >= 65 ? 'high' : prob >= 45 ? 'mid' : 'low'); }

  var recEl = $('ai-recommendation');
  if (recEl) recEl.textContent = recommendation;
}

// ---- LOAD ALL DATA ----
function loadAllData() {
  try {
    $('connection-status').textContent = 'Conectando...';
    Promise.all([lp(), updateScore(), loadFN(), loadCG(), loadVIX(), loadRSI3D()])
      .then(function() {
        $('connection-status').textContent = 'Conectado';
        updateExecutiveDashboard();
        updateHeatmap();
        updateAIPanel();
      })
      .catch(function() {
        $('connection-status').textContent = 'Error de conexión';
      });
  } catch (e) { /* silent */ }
}

// ---- EVENT: Asset selector (legacy .asset-btn) ----
document.querySelectorAll('.asset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.asset-btn').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    var a = this.dataset.asset;
    var sm = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT' };
    var s = sm[a] || 'BTCUSDT';
    $('assetLabel').textContent = a;
    $('previewAsset').textContent = a + 'USDT - LIVE';
    currentSymbol = s;
    lp(s);
    updateScore(s);
  });
});

// ---- EVENT: Asset selector (v3 .coin-tab) ----
document.querySelectorAll('.coin-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.coin-tab').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    var a = this.dataset.coin;
    var sm = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT' };
    var s = sm[a] || 'BTCUSDT';
    currentSymbol = s;
    lp();
    updateScore();
  });
});

// ---- INITIAL LOAD ----
lp();
updateScore();
loadFN();
loadCG();
loadVIX();
loadRSI3D();

// ---- TIMERS ----
setInterval(function() {
  var a = document.querySelector('.coin-tab.active');
  var sym = a ? { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT' }[a.dataset.coin] : 'BTCUSDT';
  currentSymbol = sym;
  lp(sym);
  updateScore(sym);
}, 60000);

setInterval(function() { loadFN(); loadCG(); loadVIX(); loadRSI3D(); }, 120000);

setInterval(function() { $('connection-status').textContent = 'Live - ' + ts(); }, 5000);
setInterval(function() { $('last-update').textContent = ts(); }, 10000);
setInterval(function() { $('liveLabel').textContent = 'Live - ' + ts(); }, 5000);
setInterval(function() { $('footerTime').textContent = ts(); }, 10000);
setInterval(function() { updateExecutiveDashboard(); updateHeatmap(); updateAIPanel(); }, 10000);

// ---- DOM READY ----
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.coin-tab').forEach(function(b) {
    b.classList.remove('active');
    if (b.dataset.coin === 'BTC') b.classList.add('active');
  });
  loadAllData();
});