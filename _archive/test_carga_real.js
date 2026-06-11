const https = require('https');
function fetch(url) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    }).on('error', rej);
  });
}
(async () => {
  console.log('=== TEST CARGA REAL ===\n');
  const html = await fetch('https://indicador-sono.pages.dev/');
  const srcMatch = html.match(/src="([^"]+stx-core[^"]+)"/);
  const srcPath = srcMatch ? srcMatch[1] : 'NO ENCONTRADO';
  console.log('Script src:', srcPath);

  const jsUrl = srcPath.startsWith('http') ? srcPath : 'https://indicador-sono.pages.dev/' + srcPath;
  const js = await fetch(jsUrl);
  console.log('JS size:', js.length, 'bytes');

  // Find init function calls
  const initIdx = js.indexOf('async function init');
  if (initIdx >= 0) {
    const initBlock = js.substring(initIdx, initIdx + 800);
    const calls = ['loadEUR', 'startWS', 'loadTicker', 'refreshIndicators', 'loadFG', 'loadCG', 'loadTrades', 'refreshMTF'];
    const found = calls.filter(c => initBlock.includes(c));
    const missing = calls.filter(c => !initBlock.includes(c));
    console.log('init() calls:', found.join(', '));
    if (missing.length > 0) console.log('FALTAN en init():', missing.join(', '));
  } else {
    console.log('init() NO ENCONTRADA');
  }

  // Check for event listener that triggers init
  const hasDOMContentLoaded = js.includes('DOMContentLoaded');
  const hasAddEventListener = js.includes('addEventListener');
  console.log('DOMContentLoaded:', hasDOMContentLoaded);
  console.log('addEventListener:', hasAddEventListener);

  // Worker endpoints
  const price = await fetch('https://vix-proxy.sonosanty.workers.dev/price?symbol=BTCUSDT');
  const ticker = await fetch('https://vix-proxy.sonosanty.workers.dev/ticker?symbol=BTCUSDT');
  const eur = await fetch('https://vix-proxy.sonosanty.workers.dev/eur');
  const klines = await fetch('https://vix-proxy.sonosanty.workers.dev/klines?symbol=BTCUSDT&interval=15m&limit=200');
  try { console.log('\nWorker price:', JSON.parse(price).price); } catch (e) { console.log('price ERROR:', price.substring(0, 60)); }
  try { const t = JSON.parse(ticker); console.log('Ticker H:', t.highPrice, 'L:', t.lowPrice, 'V:', t.volume); } catch (e) { console.log('ticker ERROR:', ticker.substring(0, 60)); }
  try { const e = JSON.parse(eur); console.log('EUR:', e.rate, e.source); } catch (e) { console.log('eur ERROR:', eur.substring(0, 60)); }
  try { const k = JSON.parse(klines); console.log('Klines:', k.length, 'velas'); } catch (e) { console.log('klines ERROR:', klines.substring(0, 60)); }

  // Check WS: the page connects to Binance WS but it's blocked by 451
  const usesWS = js.includes('new WebSocket');
  const wsUrlMatch = js.match(/WebSocket\((CFG\.\w+[^)]+)/);
  console.log('\nWebSocket:', usesWS ? 'SI' : 'NO');
  if (wsUrlMatch) console.log('  URL:', wsUrlMatch[1]);

  console.log('\n=== TEST COMPLETO ===');
})();
