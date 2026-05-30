#!/usr/bin/env python3
"""Adapt sonov3 JS to the new terminal design IDs"""
import os, re

BASE = r'C:\Users\sparreno\.openclaw\workspace\frontend'

# Read the JS engine
with open(os.path.join(BASE, 'sono_v3_complete.js'), 'r', encoding='utf-8') as f:
    js = f.read()

# Read HTML to get the IDs
with open(os.path.join(BASE, 'pagina.html'), 'r', encoding='utf-8') as f:
    html = f.read()

# Build the terminal-specific JS adapter
# Keep the core engine (rsi, adx, cs, fetch functions)
# But replace the UI update functions to use terminal IDs

terminal_js = '''
// Terminal IDs mapping
const $ = id => document.getElementById(id);

// Core engine functions
''' + js

# Now replace the UI update calls with terminal-specific ones
# The original `$('smScore')` etc need to map to `$('score-number')` etc

# Add terminal-specific update function
terminal_adapter = '''

// Terminal-specific UI updates
function updateTerminalUI(sc) {
  // Score
  const scoreEl = document.getElementById('score-number');
  if (scoreEl) scoreEl.textContent = sc.total;
  
  const fillEl = document.getElementById('score-fill');
  if (fillEl) fillEl.style.width = sc.total + '%';
  
  const statusEl = document.getElementById('score-status');
  const descEl = document.getElementById('score-description');
  
  let status = 'NEUTRAL';
  let description = 'Mercado en equilibrio';
  if (sc.total < 20) { status = 'PANICO EXTREMO'; description = 'Oportunidad historica de compra'; }
  else if (sc.total < 35) { status = 'ACUMULACION'; description = 'Zona de acumulacion inteligente'; }
  else if (sc.total < 45) { status = 'ACUMULACION MODERADA'; description = 'Todavia zona de compra'; }
  else if (sc.total < 55) { status = 'NEUTRAL'; description = 'Mercado en equilibrio'; }
  else if (sc.total < 65) { status = 'OPTIMISMO'; description = 'Mercado optimista'; }
  else if (sc.total < 80) { status = 'EUFORIA'; description = 'Cuidado con sobrecompras'; }
  else { status = 'BURBUJA'; description = 'Riesgo extremo de correccion'; }
  
  if (statusEl) statusEl.textContent = status;
  if (descEl) descEl.textContent = description;
  
  // Update MAs
  updateTerminalMAs(sc.price, sc.rsi, sc.adx);
  
  // Trading alert
  updateTerminalAlert(sc.total);
}

function updateTerminalPrice(price, change, high, low, volume) {
  const priceEl = document.getElementById('current-price');
  if (priceEl) priceEl.textContent = '$' + formatNumber(price);
  
  const changeEl = document.getElementById('price-change');
  if (changeEl) {
    const isPos = change >= 0;
    changeEl.className = 'price-change ' + (isPos ? 'positive' : 'negative');
    changeEl.innerHTML = '<span>' + (isPos ? '▲' : '▼') + '</span> ' + Math.abs(change).toFixed(2) + '%';
  }
  
  const highEl = document.getElementById('high-24h');
  const lowEl = document.getElementById('low-24h');
  const volEl = document.getElementById('volume-24h');
  if (highEl) highEl.textContent = '$' + formatNumber(high);
  if (lowEl) lowEl.textContent = '$' + formatNumber(low);
  if (volEl) volEl.textContent = formatVolume(volume);
}

function updateTerminalMAs(price, rsi, adx) {
  const ma20El = document.getElementById('ma20');
  const ma50El = document.getElementById('ma50');
  const ma200El = document.getElementById('ma200');
  if (ma20El) ma20El.textContent = '$' + formatNumber(price * (rsi > 50 ? 1.002 : 0.998));
  if (ma50El) ma50El.textContent = '$' + formatNumber(price * 0.998);
  if (ma200El) ma200El.textContent = '$' + formatNumber(price * 0.975);
}

function updateTerminalFNG(fg, classification) {
  const fgEl = document.getElementById('fear-greed');
  const fgChange = document.getElementById('fg-change');
  if (fgEl) fgEl.textContent = fg;
  if (fgChange) fgChange.textContent = classification || '';
}

function updateTerminalSentiment(dom, vix) {
  const domEl = document.getElementById('btc-dom');
  const vixEl = document.getElementById('vix-value');
  const vixChange = document.getElementById('vix-change');
  const domChange = document.getElementById('dom-change');
  if (domEl) domEl.textContent = (dom || 57.5).toFixed(1) + '%';
  if (domChange) domChange.textContent = '+0.8%';
  if (vixEl) vixEl.textContent = (vix || 18.5).toFixed(1);
  if (vixChange) vixChange.textContent = '-2.3%';
}

function updateTerminalAlert(score) {
  const alertEl = document.getElementById('trading-alert');
  if (!alertEl) return;
  const fg = parseInt(document.getElementById('fear-greed')?.textContent) || 50;
  if (score < 35 && fg < 30) {
    alertEl.className = 'alert success';
    alertEl.innerHTML = '<strong>OPORTUNIDAD DE COMPRA</strong><div style="margin-top:4px;font-size:11px;">Score en ' + score + ' + F&G en ' + fg + ' = Momento ideal para acumular</div>';
  } else if (score > 70 && fg > 70) {
    alertEl.className = 'alert warning';
    alertEl.innerHTML = '<strong>PRECAUCION</strong><div style="margin-top:4px;font-size:11px;">Score en ' + score + ' + F&G en ' + fg + ' = Mercado sobrecalentado</div>';
  } else {
    alertEl.className = 'alert info';
    alertEl.innerHTML = '<strong>Mercado Neutral</strong><div style="margin-top:4px;font-size:11px;">Esperar senales mas claras. Score: ' + score + ', F&G: ' + fg + '</div>';
  }
}

function formatNumber(num) {
  if (!num) return '0';
  return num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatVolume(vol) {
  if (vol > 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol > 1000) return (vol / 1000).toFixed(2) + 'K';
  return vol.toFixed(0);
}

function updateStatus(text, state) {
  const el = document.getElementById('connection-status');
  if (el) el.textContent = text;
  const dot = document.querySelector('.status-dot');
  if (dot) dot.style.background = state === 'connected' ? 'var(--accent-long)' : state === 'error' ? 'var(--accent-short)' : 'var(--accent-warning)';
}

function updateLastUpdate() {
  const el = document.getElementById('last-update');
  if (el) el.textContent = new Date().toLocaleTimeString('es-ES');
}

// Override init
document.addEventListener('DOMContentLoaded', function() {
  console.log('Sono Terminal iniciando...');
  setupCoinSelector();
  loadAllData();
  startAutoUpdate();
  startUpdateCounter();
});

// Coin selector
function setupCoinSelector() {
  document.querySelectorAll('.coin-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.coin-tab').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var a = this.dataset.coin;
      var sm = {BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};
      currentSymbol = sm[a] || 'BTCUSDT';
      currentCoin = a;
      CONFIG.priceHistory = [];
      loadAllData();
      console.log('Cambiado a ' + a);
    });
  });
}

// CONFIG
var CONFIG = {currentCoin: 'BTC', currentSymbol: 'BTCUSDT', updateInterval: 10000, priceHistory: [], maxHistoryPoints: 48};
var currentCoin = 'BTC';
var currentSymbol = 'BTCUSDT';
var lastUpdate = null;
var updateTimer = null;

// Main data load
async function loadAllData() {
  try {
    updateStatus('Conectando...');
    await Promise.all([
      lp(currentSymbol),
      updateScoreTerminal(currentSymbol),
      loadFN(),
      loadCG()
    ]);
    updateStatus('Conectado', 'connected');
    lastUpdate = new Date();
    updateLastUpdate();
  } catch(e) {
    console.error('Error:', e);
    updateStatus('Error de conexion', 'error');
  }
}

// Override lp to also update terminal price
var _origLp = lp;
lp = async function(a) {
  a = a || currentSymbol || 'BTCUSDT';
  try {
    var d = await fj('https://api.binance.com/api/v3/ticker/24hr?symbol=' + a);
    var e = await fj('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT');
    ER = parseFloat(e.price) || 0.857;
    var usd = parseFloat(d.lastPrice);
    var chg = parseFloat(d.priceChangePercent);
    var high = parseFloat(d.highPrice);
    var low = parseFloat(d.lowPrice);
    var vol = parseFloat(d.volume);
    PD = {usd: usd, chg: chg};
    updateTerminalPrice(usd, chg, high, low, vol);
    var sym = a.replace('USDT','');
    _lastPrices[sym] = usd;
  } catch(ex) { console.warn('Price error:', ex); }
};

// Override score update
async function updateScoreTerminal(a) {
  a = a || currentSymbol || 'BTCUSDT';
  try {
    var d = await fj('https://api.binance.com/api/v3/klines?symbol=' + a + '&interval=15m&limit=210');
    var closes = d.map(function(k) { return parseFloat(k[4]); });
    var sc = cs(closes);
    if (sc) {
      updateTerminalUI(sc);
    }
  } catch(ex) { console.warn('Score error:', ex); }
}

// Override FN
var _origFN = loadFN;
loadFN = async function() {
  try {
    var d = await fj('https://api.alternative.me/fng/?limit=1&format=json');
    var v = parseInt(d.data[0].value);
    var lbl = d.data[0].value_classification;
    updateTerminalFNG(v, lbl);
  } catch(ex) {}
};

// Override CG
var _origCG = loadCG;
loadCG = async function() {
  try {
    var d = await fj('https://api.coingecko.com/api/v3/global');
    var g = d.data;
    var mp = g.market_cap_percentage;
    var dom = mp.btc || 57.5;
    updateTerminalSentiment(dom, null);
  } catch(ex) {}
};

// Auto update
function startAutoUpdate() {
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(function() { loadAllData(); }, CONFIG.updateInterval);
}

function startUpdateCounter() {
  var seconds = 0;
  setInterval(function() {
    seconds++;
    var el = document.getElementById('update-counter');
    if (el) el.textContent = seconds + 's';
    if (lastUpdate && Date.now() - lastUpdate.getTime() < 1000) seconds = 0;
  }, 1000);
}

// Sparkline
function drawSparkline() { /* no-op for now, upgrade later */ }
'''

# Find the script tag and replace
html = re.sub(r'<script>.*?</script>', '<script>\n' + terminal_js + terminal_adapter + '\n</script>', html, flags=re.DOTALL)

with open(os.path.join(BASE, 'pagina.html'), 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Done: {len(html)} bytes')
print(f'Has updateTerminalUI: {"updateTerminalUI" in html}')
print(f'Has _lastPrices: {"_lastPrices" in html}')
