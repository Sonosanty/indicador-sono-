const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, data: d, size: d.length }));
    }).on('error', rej);
  });
}

(async () => {
  console.log('=== VERIFICACION BINANCE PROXY v4.0 ===\n');

  // 1. JS servido tiene el proxy config?
  const js = await fetch('https://indicador-sono.pages.dev/js/stx-core.js');
  console.log('stx-core.js servido:', js.size, 'bytes');
  console.log('BINANCE_API -> vix-proxy:', js.data.includes('vix-proxy.sonosanty.workers.dev'));
  console.log('BINANCE_API -> binance.com:', js.data.includes('api.binance.com/api/v3'));
  console.log('BINANCE_WS desactivado:', js.data.includes('BINANCE_WS:  \'\' // 451'));

  // 2. Worker proxy endpoints
  console.log('\n--- Worker VIX v4.0 endpoints ---');
  
  const price = await fetch('https://vix-proxy.sonosanty.workers.dev/price?symbol=BTCUSDT');
  console.log('price: ' + price.status + ' - ' + price.data.substring(0, 50));

  const ticker = await fetch('https://vix-proxy.sonosanty.workers.dev/ticker?symbol=BTCUSDT');
  console.log('ticker: ' + ticker.status + ' - ' + ticker.data.substring(0, 60));

  const klines = await fetch('https://vix-proxy.sonosanty.workers.dev/klines?symbol=BTCUSDT&interval=15m&limit=10');
  const kData = JSON.parse(klines.data);
  console.log('klines: ' + klines.status + ' - ' + kData.length + ' velas');

  const eur = await fetch('https://vix-proxy.sonosanty.workers.dev/eur');
  console.log('eur: ' + eur.status + ' - ' + eur.data.substring(0, 50));

  const vix = await fetch('https://vix-proxy.sonosanty.workers.dev/vix');
  console.log('vix: ' + vix.status + ' - ' + vix.data.substring(0, 40));

  const global = await fetch('https://vix-proxy.sonosanty.workers.dev/global');
  console.log('global: ' + global.status + ' - ' + (JSON.parse(global.data).data ? 'OK' : 'ERROR'));

  // 3. CSP header
  const root = await fetch('https://indicador-sono.pages.dev/');
  const csp = root.headers['content-security-policy'] || '';
  console.log('\n--- CSP ---');
  console.log('script-src unsafe-inline:', csp.includes("unsafe-inline"));
  console.log('connect-src vix-proxy:', csp.includes('vix-proxy'));

  // 4. Router inline
  const inlineScripts = root.data.match(/<script>[\s\S]*?<\/script>/g);
  const router = inlineScripts ? inlineScripts.filter(s => s.includes('pushState')).length : 0;
  console.log('\nRouter inline:', router > 0 ? 'PRESENTE' : 'AUSENTE');

  console.log('\n==========================================');
})();
