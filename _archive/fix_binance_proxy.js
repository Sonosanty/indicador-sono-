const fs = require('fs');
let js = fs.readFileSync('indicador_cloudflare/js/stx-core.js', 'utf8');
let changes = 0;

// 1. BINANCE_API -> Worker proxy
if (js.includes("BINANCE_API: 'https://api.binance.com/api/v3'")) {
  js = js.replace(
    "BINANCE_API: 'https://api.binance.com/api/v3'",
    "BINANCE_API: 'https://vix-proxy.sonosanty.workers.dev'"
  );
  console.log('BINANCE_API -> Worker proxy');
  changes++;
} else {
  console.log('WARN: BINANCE_API pattern not found');
}

// 2. BINANCE_WS -> comentado (Binance 451)
if (js.includes("BINANCE_WS:  'wss://stream.binance.com:9443/ws'")) {
  js = js.replace(
    "BINANCE_WS:  'wss://stream.binance.com:9443/ws'",
    "BINANCE_WS:  '' // 451 BLOCKED"
  );
  console.log('BINANCE_WS desactivado (451 block)');
  changes++;
} else {
  console.log('WARN: BINANCE_WS pattern not found');
}

// 3. Verificar que loadKlines usa CFG.BINANCE_API (no hardcoded Binance)
const klinesIdx = js.indexOf('/klines');
if (klinesIdx >= 0) {
  const before = js.substring(Math.max(0, klinesIdx - 40), klinesIdx);
  console.log('klines URL context:', before + ' ...');
}

fs.writeFileSync('indicador_cloudflare/js/stx-core.js', js, 'utf8');
console.log('\nstx-core.js:', js.length, 'bytes, cambios:', changes);
console.log('BINANCE_API contiene vix-proxy:', js.includes('vix-proxy.sonosanty.workers.dev'));
console.log('BINANCE_API contiene api.binance.com/api/v3:', js.includes("api.binance.com/api/v3"));
console.log('BINANCE_WS desactivado:', js.includes("BINANCE_WS:  '' // 451"));
