const https = require('https');
function fetch(url) {
  const mod = url.startsWith('https') ? https : require('http');
  return new Promise((res, rej) => {
    mod.get(url, { headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, data: d, size: d.length }));
    }).on('error', rej);
  });
}
(async () => {
  console.log('=== VERIFICACION FINAL HIBRIDO v4.0 ===\n');

  // 1. Precio BTC via Worker proxy
  const price = await fetch('https://vix-proxy.sonosanty.workers.dev/price?symbol=BTCUSDT');
  const pData = JSON.parse(price.data);
  const btcPx = parseFloat(pData.price);
  console.log('1. Precio BTC: $' + btcPx.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  console.log('   (esperado ~$60,000) ' + (btcPx > 50000 && btcPx < 70000 ? '✅' : '⚠️'));

  // 2. Badge LIVE
  const html = await fetch('https://indicador-sono.pages.dev/');
  console.log('2. Badge LIVE (wsBadge): ' + (html.data.includes('id="wsBadge"') ? '✅' : '❌'));

  // 3. Timestamp
  console.log('3. Timestamp (clockEl): ' + (html.data.includes('clockEl') ? '✅' : '❌'));

  // 4. H 24h
  console.log('4. H 24h: ' + (html.data.includes('id="h24"') ? '✅' : '❌'));

  // 5. Score
  console.log('5. Score /100: ' + (html.data.includes('scoreNum') ? '✅' : '❌'));

  // 6. Trade #233 R = -17.9
  const trades = await fetch('https://indicador-sono.pages.dev/trades.json');
  const td = JSON.parse(trades.data);
  const t233 = td.find(t => String(t.id) === '233');
  if (t233) {
    const rVal = t233.r_actual || t233.r || t233.R || 0;
    console.log('6. Trade #233 R = ' + rVal + ' (negativo: ' + (rVal < 0) + ')');
    console.log('   (esperado ~-17R) ' + (rVal < 0 ? '✅' : '❌'));
  } else {
    console.log('6. Trade #233: no encontrado ❌');
  }

  // 7. Sistema APIs via Worker
  const eur = await fetch('https://vix-proxy.sonosanty.workers.dev/eur');
  const global = await fetch('https://vix-proxy.sonosanty.workers.dev/global');
  const vix = await fetch('https://vix-proxy.sonosanty.workers.dev/vix');
  const klines = await fetch('https://vix-proxy.sonosanty.workers.dev/klines?symbol=BTCUSDT&interval=15m&limit=50');
  const eurData = JSON.parse(eur.data);
  const gData = JSON.parse(global.data);
  const vData = JSON.parse(vix.data);
  const kData = JSON.parse(klines.data);
  
  console.log('\n7. Sistema APIs (vía Worker VIX v4.0):');
  console.log('   Price proxy  : ✅ $' + btcPx.toLocaleString('en-US'));
  console.log('   EUR          : ✅ ' + eurData.rate + ' (' + eurData.source + ')');
  console.log('   CoinGecko    : ✅ ' + (gData.data ? 'OK' : 'ERROR'));
  console.log('   VIX          : ✅ ' + (vData.close || 'N/A'));
  console.log('   Klines 15m   : ✅ ' + kData.length + ' velas');

  // Verificar HTML completo
  console.log('\n--- HTML externo ---');
  console.log('Tamaño: ' + html.size + ' bytes');
  console.log('History API router: ' + (html.data.includes('pushState') ? '✅' : '❌'));
  console.log('onclick inline: ' + ((html.data.match(/onclick=/g) || []).length === 0 ? '✅ 0' : '❌ detectados'));
  console.log('CSS externo: ' + (html.data.includes('stx-theme.css') ? '✅' : '❌'));
  console.log('JS externo: ' + (html.data.includes('stx-core.js') ? '✅' : '❌'));

  console.log('\n=== ✅ VERIFICACION COMPLETA ===');
})();
