

// RANGOS VIEW CONTROLLER (stub)
var RANGOS_INTERVAL = null;
var RANGOS_LIVE_PRICE = 73900;

window.initRangos = function() {
  RANGOS_INTERVAL = setInterval(function() {
    console.log("[Rangos] polling...");
  }, 20000);
  console.log("[Rangos] iniciado");
};

window.cleanupRangos = function() {
  if (RANGOS_INTERVAL) { clearInterval(RANGOS_INTERVAL); RANGOS_INTERVAL = null; }
  console.log("[Rangos] cleanup");
};

// TRADES VIEW CONTROLLER
var TRADES_WS = null;
var TRADES_LIVE = 73900;

window.TRADES = {
  _tab: 'open',
  switchTab: function(tab, btn) {
    this._tab = tab;
    document.querySelectorAll('#tab-open, #tab-closed').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    var panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
  },
  applyFilters: function() {
    console.log("[Trades] filters applied");
  }
};

window.initTrades = function() {
  try {
    TRADES_WS = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
    TRADES_WS.onmessage = function(e) {
      TRADES_LIVE = parseFloat(JSON.parse(e.data).p);
      var el = document.getElementById('t-livePrice');
      if (el) el.textContent = '$' + TRADES_LIVE.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2});
      var ws = document.getElementById('t-wsStatus');
      if (ws) ws.textContent = 'LIVE';
      var lt = document.getElementById('t-wsLatency');
      if (lt) lt.textContent = 'Tick: ' + new Date().toLocaleTimeString('es-ES');
    };
    TRADES_WS.onclose = function() { setTimeout(function() {
      var ws = document.getElementById('t-wsStatus');
      if (ws) ws.textContent = 'RECONNECTING';
    }, 5000); };
    TRADES_WS.onerror = function() { TRADES_WS.close(); };
  } catch(e) {}
  console.log("[Trades] iniciado");
};

window.cleanupTrades = function() {
  if (TRADES_WS) { try { TRADES_WS.close(); } catch(e) {} TRADES_WS = null; }
  console.log("[Trades] cleanup");
};
