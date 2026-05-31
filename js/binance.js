/* ══════════════════════════════════════════════════════════════
   BINANCE DATA LAYER v5.0
   WebSocket precio en tiempo real + REST klines históricos
   ══════════════════════════════════════════════════════════════ */

const BinanceData = (() => {
  const BASE_WS   = 'wss://stream.binance.com:9443/ws';
  const BASE_REST = 'https://api.binance.com/api/v3';

  let ws = null;
  let reconnectTimer = null;
  let frozenTimer = null;
  let currentSymbol = 'BTCUSDT';
  let currentTF = '3m';

  const state = {
    price: null, change24h: null, high24h: null, low24h: null, vol24h: null,
    klines: {},           // { '3m': [], '5m': [], ... }
    lastTick: null,
    connected: false,
    onPrice: null,
    onKlines: null,
    onStatus: null,
  };

  const TF_MAP = { '1m':'1m', '3m':'3m', '5m':'5m', '15m':'15m', '1h':'1h', '4h':'4h' };
  const KLINE_LIMIT = 350;

  /* ── REST: ticker 24h ────────────────────────────────────── */
  async function fetchTicker(symbol) {
    try {
      const r = await fetch(`${BASE_REST}/ticker/24hr?symbol=${symbol}`);
      if (!r.ok) throw new Error('ticker fail');
      const d = await r.json();
      state.price    = parseFloat(d.lastPrice);
      state.change24h= parseFloat(d.priceChangePercent);
      state.high24h  = parseFloat(d.highPrice);
      state.low24h   = parseFloat(d.lowPrice);
      state.vol24h   = parseFloat(d.volume);
      if (state.onPrice) state.onPrice({ ...state });
    } catch(e) {
      setStatus('err', 'Ticker error');
    }
  }

  /* ── REST: klines ────────────────────────────────────────── */
  async function fetchKlines(symbol, tf) {
    try {
      const r = await fetch(`${BASE_REST}/klines?symbol=${symbol}&interval=${TF_MAP[tf]}&limit=${KLINE_LIMIT}`);
      if (!r.ok) throw new Error('klines fail');
      const raw = await r.json();
      const klines = raw.map(k => ({
        t:  k[0],
        o:  parseFloat(k[1]),
        h:  parseFloat(k[2]),
        l:  parseFloat(k[3]),
        c:  parseFloat(k[4]),
        v:  parseFloat(k[5]),
      }));
      state.klines[tf] = klines;
      if (state.onKlines) state.onKlines(tf, klines);
      return klines;
    } catch(e) {
      setStatus('err', `Klines ${tf} error`);
      return null;
    }
  }

  /* ── WebSocket ───────────────────────────────────────────── */
  function connectWS(symbol, tf) {
    if (ws) { ws.close(); ws = null; }
    clearTimeout(reconnectTimer);

    const streamName = `${symbol.toLowerCase()}@kline_${TF_MAP[tf]}`;
    ws = new WebSocket(`${BASE_WS}/${streamName}`);

    ws.onopen = () => {
      state.connected = true;
      setStatus('ok', 'LIVE');
      resetFrozenTimer();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (!msg.k) return;
        const k = msg.k;
        state.price = parseFloat(k.c);
        state.lastTick = Date.now();
        resetFrozenTimer();

        // Actualizar la última vela en klines
        if (state.klines[tf] && state.klines[tf].length > 0) {
          const arr = state.klines[tf];
          const last = arr[arr.length - 1];
          if (last.t === k.t) {
            last.c = parseFloat(k.c); last.h = parseFloat(k.h);
            last.l = parseFloat(k.l); last.v = parseFloat(k.v);
          } else if (k.x) { // vela cerrada → añadir nueva
            arr.push({ t: k.t, o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c), v: parseFloat(k.v) });
            if (arr.length > KLINE_LIMIT) arr.shift();
          }
          if (state.onKlines) state.onKlines(tf, arr);
        }

        if (state.onPrice) state.onPrice({ ...state });
      } catch {}
    };

    ws.onerror = () => setStatus('err', 'WS error');
    ws.onclose = () => {
      state.connected = false;
      setStatus('load', 'Reconectando...');
      reconnectTimer = setTimeout(() => connectWS(symbol, tf), 4000);
    };
  }

  function resetFrozenTimer() {
    clearTimeout(frozenTimer);
    frozenTimer = setTimeout(() => {
      setStatus('err', 'Sin datos (4min)');
    }, 4 * 60 * 1000);
  }

  function setStatus(type, msg) {
    if (state.onStatus) state.onStatus(type, msg);
  }

  /* ── API pública ─────────────────────────────────────────── */
  async function init(symbol, tf, callbacks = {}) {
    currentSymbol = symbol;
    currentTF = tf;
    Object.assign(state, callbacks);
    setStatus('load', 'Conectando...');
    await Promise.all([
      fetchTicker(symbol),
      ...Object.keys(TF_MAP).map(t => fetchKlines(symbol, t))
    ]);
    connectWS(symbol, tf);
    // Refresh ticker cada 12s
    setInterval(() => fetchTicker(currentSymbol), 12000);
  }

  async function changeAsset(symbol) {
    currentSymbol = symbol;
    state.klines = {};
    setStatus('load', 'Cargando...');
    await Promise.all([
      fetchTicker(symbol),
      ...Object.keys(TF_MAP).map(t => fetchKlines(symbol, t))
    ]);
    connectWS(symbol, currentTF);
  }

  function changeTF(tf) {
    currentTF = tf;
    connectWS(currentSymbol, tf);
  }

  function getState() { return { ...state }; }

  return { init, changeAsset, changeTF, getState };
})();
