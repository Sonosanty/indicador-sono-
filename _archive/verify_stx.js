const https = require('https');
function fetch(url) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, data: d, size: d.length }));
    }).on('error', rej);
  });
}
(async () => {
  console.log('=== VERIFICACION STX DEPLOY ===\n');

  const paths = ['/', '/js/stx-core.js', '/trades.json', '/rangos', '/metodo', '/trades'];
  for (const p of paths) {
    const r = await fetch('https://indicador-sono.pages.dev' + p);
    const isHTML = r.data.startsWith('<!DOCTYPE');
    const refJS = isHTML ? r.data.includes('stx-core.js') : false;
    console.log(p, '|', r.status, '(' + r.size + ')', 'HTML:', isHTML, refJS ? 'refJS:YES' : '');
  }

  console.log('\n--- JS sintaxis ---');
  const js = await fetch('https://indicador-sono.pages.dev/js/stx-core.js');
  try { new Function(js.data); console.log('JS: VALIDO (' + js.size + ' bytes)'); }
  catch (e) { console.log('JS: ERROR -', e.message.substring(0, 100)); }

  console.log('\n--- Worker VIX ---');
  const price = await fetch('https://vix-proxy.sonosanty.workers.dev/price?symbol=BTCUSDT');
  try { console.log('1. Precio BTC: $' + JSON.parse(price.data).price); } catch (e) { console.log('ERROR price'); }

  const eur = await fetch('https://vix-proxy.sonosanty.workers.dev/eur');
  try { console.log('   EUR: ' + JSON.parse(eur.data).rate); } catch (e) { console.log('ERROR eur'); }

  console.log('\n=== LISTO ===');
})();
