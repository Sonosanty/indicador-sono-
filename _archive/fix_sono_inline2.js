const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Size original:', html.length);

// PATRÓN 1: El corrupción exacta - "$" se reemplazó con \n</body>\n</html>\n (CRLF)
// Buscar: \r\n</body>\r\n</html>\r\n  o  \n</body>\n</html>\n
const corruption = '\n</body>\n</html>\n';
const corruptionCR = '\r\n</body>\r\n</html>\r\n';

// Contar ocurrencias
const count = html.split(corruption).length - 1;
const countCR = html.split(corruptionCR).length - 1;
console.log('Corrupciones LF:', count);
console.log('Corrupciones CRLF:', countCR);

// Reemplazar todas las corrupciones por $
// Pero el $ en un string JS necesita ser literal, no un metacarácter
// Usamos replace con string, no regex
html = html.split(corruption).join('$');

console.log('Size after fix1:', html.length);

// También probar CRLF si hay
if (corruptionCR !== corruption) {
  html = html.split(corruptionCR).join('$');
}

console.log('Size after fix2:', html.length);

// Ahora verificar que fU, fK sean correctas
// Deberían verse así:
// const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});
// const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);

const lines = html.split('\n');
for (let i = 545; i < 565; i++) {
  if (lines[i]) console.log(i + ': ' + lines[i].substring(0, 100));
}

// Verificar stPnL
for (let i = 890; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL')) {
    console.log(i + ': ' + lines[i].substring(0, 100));
  }
}

// Ahora aplicar los 3 fixes adicionales

// FIX A: EUR_URL → Binance
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('\nEUR fix:', html.includes('EURUSDT') ? 'OK' : 'FAIL');

// FIX B: loadEUR parse para d.price
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR fix:', html.includes('parseFloat(d.price)||0.865') ? 'OK' : 'FAIL');

// FIX C: Footer open.er-api.com → Binance
html = html.replace(
  'open.er-api.com',
  'Binance EURUSDT'
);
console.log('Footer fix:', html.includes('Binance EURUSDT') ? 'OK' : 'FAIL');

// Escribir
fs.writeFileSync(path, html, 'utf8');
const stats = fs.statSync(path);
console.log('\nGuardado:', stats.size, 'bytes');

// Verificación final
console.log('\n=== VERIFICACION FINAL ===');
console.log('fU OK:', html.includes("const fU = (n, d=0) => '$' + n.toLocaleString"));
console.log('fK OK:', html.includes("n>=1e12?'$'+(n/1e12).toFixed(2)+'T'"));
console.log('stPnL OK:', html.includes("toFixed(2)+'$'"));
console.log('EUR Binance:', html.includes('EURUSDT'));
console.log('loadEUR parseFloat:', html.includes('parseFloat(d.price)||0.865'));
console.log('Footer:', html.includes('Binance EURUSDT'));
