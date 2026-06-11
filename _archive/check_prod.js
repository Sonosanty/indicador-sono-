const https = require('https');
function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, headers: r.headers, data: d, size: d.length }));
    }).on('error', rej);
  });
}

(async () => {
  console.log('=== FASE 0 — VERIFICACION ESTADO ACTUAL ===\n');

  const root = await fetch('https://indicador-sono.pages.dev/');
  console.log('GET / :', root.status, '(' + root.size + ' bytes)');
  console.log('  CSP:', root.headers['content-security-policy'] ? root.headers['content-security-policy'].substring(0, 80) : 'AUSENTE');
  console.log('  X-Frame-Options:', root.headers['x-frame-options'] || 'AUSENTE');

  const metodo = await fetch('https://indicador-sono.pages.dev/metodo');
  console.log('\nGET /metodo :', metodo.status, '(' + metodo.size + ' bytes)');

  const rangos = await fetch('https://indicador-sono.pages.dev/rangos');
  console.log('GET /rangos :', rangos.status, '(' + rangos.size + ' bytes)');

  const trades = await fetch('https://indicador-sono.pages.dev/trades');
  console.log('GET /trades :', trades.status, '(' + trades.size + ' bytes)');

  const tradesJson = await fetch('https://indicador-sono.pages.dev/trades.json');
  console.log('\nGET /trades.json :', tradesJson.status, '(' + tradesJson.size + ' bytes)');

  const js = await fetch('https://indicador-sono.pages.dev/js/stx-core.js');
  console.log('GET /js/stx-core.js :', js.status, '(' + js.size + ' bytes)');

  // Trailing-slash versions
  const metodos = await fetch('https://indicador-sono.pages.dev/metodo/');
  console.log('\n--- Con trailing slash ---');
  console.log('/metodo/ :', metodos.status, '(' + metodos.size + ' bytes)');

  const rangoss = await fetch('https://indicador-sono.pages.dev/rangos/');
  console.log('/rangos/ :', rangoss.status, '(' + rangoss.size + ' bytes)');

  const tradess = await fetch('https://indicador-sono.pages.dev/trades/');
  console.log('/trades/ :', tradess.status, '(' + tradess.size + ' bytes)');

  // Redirects detect
  const statuses = [root, metodo, rangos, trades, tradesJson, js, metodos, rangoss, tradess];
  const hasRedirects = statuses.some(r => [301, 302, 307, 308].includes(r.status));
  console.log('\nRedirecciones detectadas:', hasRedirects ? 'SI' : 'NO');

  console.log('\n=== FASE 0 COMPLETA ===');
})();
