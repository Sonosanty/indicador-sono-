const fs = require('fs');
let js = fs.readFileSync('indicador_cloudflare/js/stx-core.js', 'utf8');

// Fix: BINANCE_WS:  '' // 451 BLOCKED,  ->  BINANCE_WS:  '', // 451 BLOCKED
const oldLine = "  BINANCE_WS:  '' // 451 BLOCKED,";
const newLine = "  BINANCE_WS:  '', // 451 BLOCKED";

if (js.includes(oldLine)) {
  js = js.replace(oldLine, newLine);
  console.log('LINEA CORREGIDA');
} else {
  console.log('LINEA NO ENCONTRADA');
  // Mostrar que hay
  const idx = js.indexOf('BINANCE_WS');
  if (idx >= 0) console.log('Actual:', JSON.stringify(js.substring(idx, idx + 40)));
}

// Verificar sintaxis
try {
  new Function(js);
  console.log('JS SINTAXIS: VALIDO');
} catch (e) {
  console.log('JS SINTAXIS: ERROR -', e.message.substring(0, 100));
}

fs.writeFileSync('indicador_cloudflare/js/stx-core.js', js, 'utf8');
console.log('Escrito:', js.length, 'bytes');
