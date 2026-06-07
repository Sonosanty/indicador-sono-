// ═══════════════════════════════════════════════════════════════
// VIX Proxy v4.0 — Multi-endpoint proxy para SONO TERMINAL X
// Sin KV. Sin dependencias externas. Cache opcional vía Cache API.
// Endpoints:
//   /vix         → Yahoo Finance VIX
//   /eur         → Frankfurter EUR/USD
//   /global      → CoinGecko global data (dominance, mcap)
//   /price       → Binance ticker price (proxy)
//   /ticker      → Binance 24hr ticker (proxy)
//   /klines      → Binance klines/candles (proxy)
//   /            → health check
// ═══════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=30'
};

const BINANCE_API = 'https://api.binance.com/api/v3';

async function jsonFetch(url, fallback) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw e;
  }
}

// ── HELPERS ──
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── ROUTES ──
async function handleVIX() {
  const data = await jsonFetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
    { vix: 15.32, change: -2.67, data: [], error: 'fallback' }
  );
  if (data.vix) return jsonResponse(data); // already fallback

  const result = data?.chart?.result?.[0];
  if (!result) return jsonResponse({ vix: 15.32, change: 0, data: [], error: 'no data' });

  const quotes = result.indicators?.quote?.[0];
  const timestamps = result.timestamp || [];
  const closes = quotes?.close || [];
  const opens = quotes?.open || [];
  const data_points = timestamps.map((t, i) => ({
    time: t * 1000,
    open: opens[i],
    close: closes[i],
    high: (quotes?.high || [])[i],
    low: (quotes?.low || [])[i]
  })).filter(d => d.close);

  return jsonResponse({
    vix: closes[closes.length - 1],
    change: closes.length >= 2 ? +(closes[closes.length - 1] - closes[closes.length - 2]).toFixed(2) : 0,
    data: data_points
  });
}

async function handleEUR() {
  try {
    const resp = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!resp.ok) throw new Error(`Frankfurter ${resp.status}`);
    const d = await resp.json();
    return jsonResponse({ rate: d.rates?.EUR || 0.92, source: 'frankfurter' });
  } catch (e) {
    // Fallback: try exchangerate.host
    try {
      const resp2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const d2 = await resp2.json();
      return jsonResponse({ rate: d2.rates?.EUR || 0.92, source: 'exchangerate-api' });
    } catch (e2) {
      return jsonResponse({ rate: 0.92, source: 'fallback' });
    }
  }
}

async function handleGlobal() {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const d = await resp.json();
    if (!d?.data) throw new Error('no data');
    return jsonResponse({
      data: {
        total_market_cap: d.data.total_market_cap?.usd || 0,
        total_volume: d.data.total_volume?.usd || 0,
        dominance: d.data.market_cap_percentage?.btc || 0,
        eth_dominance: d.data.market_cap_percentage?.eth || 0
      }
    });
  } catch (e) {
    return jsonResponse({
      data: { total_market_cap: 0, total_volume: 0, dominance: 55, eth_dominance: 10 },
      error: e.message
    });
  }
}

async function handleBinancePrice(symbol) {
  try {
    const d = await jsonFetch(`${BINANCE_API}/ticker/price?symbol=${symbol}`);
    return jsonResponse({ symbol: d.symbol, price: parseFloat(d.price) });
  } catch (e) {
    return jsonResponse({ error: `Binance price failed: ${e.message}`, symbol }, 502);
  }
}

async function handleBinanceTicker(symbol) {
  try {
    const d = await jsonFetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`);
    return jsonResponse({
      symbol: d.symbol,
      lastPrice: parseFloat(d.lastPrice),
      highPrice: parseFloat(d.highPrice),
      lowPrice: parseFloat(d.lowPrice),
      volume: parseFloat(d.volume),
      priceChangePercent: parseFloat(d.priceChangePercent)
    });
  } catch (e) {
    return jsonResponse({ error: e.message, symbol }, 502);
  }
}

async function handleBinanceKlines(symbol, interval, limit) {
  try {
    const d = await jsonFetch(
      `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const mapped = d.map(c => ({
      t: c[0], o: parseFloat(c[1]), h: parseFloat(c[2]),
      l: parseFloat(c[3]), c: parseFloat(c[4]), v: parseFloat(c[5])
    }));
    return jsonResponse(mapped);
  } catch (e) {
    return jsonResponse({ error: e.message, symbol, interval }, 502);
  }
}

// ── MAIN ──
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ status: 'ok', version: '4.0', time: Date.now() });
    }

    // Route dispatch
    switch (url.pathname) {
      case '/vix':
        return handleVIX();

      case '/eur':
        return handleEUR();

      case '/global':
        return handleGlobal();

      case '/price': {
        const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
        return handleBinancePrice(symbol.toUpperCase());
      }

      case '/ticker': {
        const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
        return handleBinanceTicker(symbol.toUpperCase());
      }

      case '/klines': {
        const symbol = (url.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
        const interval = url.searchParams.get('interval') || '15m';
        const limit = parseInt(url.searchParams.get('limit'), 10) || 220;
        return handleBinanceKlines(symbol, interval, Math.min(limit, 500));
      }

      default:
        return jsonResponse({ error: 'not found', path: url.pathname }, 404);
    }
  }
};
