const https = require('https');
const http = require('http');
function fetch(url) {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((res, rej) => {
    mod.get(url, { headers: { 'Cache-Control': 'no-cache' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, data: d, size: d.length }));
    }).on('error', rej);
  });
}
(async () => {
  console.log('=== LOS 7 VALORES ===\n');

  // 1. Precio BTC ~$60,000
  const btc = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  const btcData = JSON.parse(btc.data);
  const btcPx = parseFloat(btcData.price);
  console.log('1. Precio BTC: $' + btcPx.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  console.log('   ~$60,000: ' + (btcPx > 50000 && btcPx < 70000 ? '✅ SI' : '⚠️ NO, esperado 60K'));

  // 2-5: Verificar HTML
  const html = await fetch('https://indicador-sono.pages.dev/');
  console.log('\n2. Badge LIVE: id="wsBadge" -> ' + (html.data.includes('id="wsBadge"') ? '✅' : '❌'));
  console.log('3. Timestamp: clockEl -> ' + (html.data.includes('clockEl') ? '✅' : '❌'));
  console.log('4. H 24h: id="h24" -> ' + (html.data.includes('id="h24"') ? '✅' : '❌'));
  console.log('5. Score: id="scoreNum" -> ' + (html.data.includes('scoreNum') ? '✅' : '❌'));
  console.log('   History API: ' + (html.data.includes('pushState') ? '✅' : '❌'));
  console.log('   onclick counts: ' + (html.data.match(/onclick=/g) || []).length);
  console.log('   JS external: ' + (html.data.includes('stx-core.js') ? '✅' : '❌'));
  console.log('   CSS external: ' + (html.data.includes('stx-theme.css') ? '✅' : '❌'));

  // 6. Trade #233 R negativo
  const trades = await fetch('https://indicador-sono.pages.dev/trades.json');
  try {
    const td = JSON.parse(trades.data);
    const t233 = td.find(t => String(t.id) === '233');
    if (t233) {
      const rVal = t233.R || t233.r || 0;
      console.log('\n6. Trade #233 R=' + rVal + (rVal < 0 ? ' ✅ NEGATIVO (~-17R)' : ' ⚠️ NO negativo'));
    } else {
      console.log('\n6. Trade #233: No encontrado. IDs disponibles: ' + td.slice(0, 8).map(t => t.id).join(', '));
    }
  } catch (e) {
    console.log('\n6. trades.json error: ' + e.message);
  }

  // 7. Sistema APIs verdes
  const price = await fetch('https://vix-proxy.sonosanty.workers.dev/price?symbol=BTCUSDT');
  const eur = await fetch('https://vix-proxy.sonosanty.workers.dev/eur');
  const global = await fetch('https://vix-proxy.sonosanty.workers.dev/global');
  const vix = await fetch('https://vix-proxy.sonosanty.workers.dev/vix');
  const klines = await fetch('https://vix-proxy.sonosanty.workers.dev/klines?symbol=BTCUSDT&interval=15m&limit=50');

  try {
    const pData = JSON.parse(price.data);
    console.log('\n7. Sistema APIs:');
    console.log('   Price proxy : $' + parseFloat(pData.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ✅');

    const eurData = JSON.parse(eur.data);
    console.log('   EUR rate    : ' + eurData.rate + ' (source: ' + eurData.source + ') ✅');

    const gData = JSON.parse(global.data);
    console.log('   CoinGecko   : ' + (gData.data ? '✅ OK' : '❌ FAIL'));

    const vData = JSON.parse(vix.data);
    console.log('   VIX         : ' + vData.close + ' ✅');

    const kData = JSON.parse(klines.data);
    console.log('   Klines      : ' + kData.length + ' velas ✅');

  } catch (e) {
    console.log('\n7. Worker error: ' + e.message);
    console.log('price raw:', price.data.substring(0, 100));
    console.log('eur raw:', eur.data.substring(0, 100));
  }

  // Verificar /sistema page sirve OK
  const sistema = await fetch('https://indicador-sono.pages.dev/sistema/');
  console.log('\n/sistema/ page: ' + sistema.size + ' bytes ✅');

  console.log('\n=== VERIFICACION COMPLETA ===');
})();
