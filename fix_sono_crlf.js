const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Original:', html.length, 'bytes');

// PASO 1: Normalizar a LF para que los patrones sean consistentes
html = html.replace(/\r\n/g, '\n');

// PASO 2: Buscar el patrón de corrupción: '\n</body>\n</html>\n'
const corr = '\n</body>\n</html>\n';
const count = html.split(corr).length - 1;
console.log('Corrupciones encontradas:', count);

// PASO 3: Reemplazar las 5 primeras corrupciones (las que están en JS) por '$' + comilla
// Pero la sexta es el cierre real del HTML. Identificamos por contexto.
// Encontremos cada posición
let i = 0;
while (true) {
  const idx = html.indexOf(corr);
  if (idx === -1) break;
  
  i++;
  // Ver qué hay antes de esta corrupción
  const before = html.substring(Math.max(0, idx - 40), idx);
  const after = html.substring(idx + corr.length, idx + corr.length + 40);
  
  console.log('\nCorrupcion ' + i + ' at byte ' + idx);
  console.log('  before: ...' + before.replace(/\n/g, '\\n'));
  console.log('  after: ' + after.replace(/\n/g, '\\n') + '...');
  
  if (before.endsWith("=> '") || before.endsWith("? '") || before.endsWith("2)+'")) {
    // Es una corrupción de $ en JS - cerrar comilla y poner $
    html = html.substring(0, idx) + '$' + html.substring(idx + corr.length);
    // Ahora tenemos: "=> '$" después de la inserción
    // Necesitamos cerrar la comilla: "=> '$'"
    // Pero solo donde antes había una comilla abierta
    console.log('  => JS corruption, replaced by "$"');
  } else if (before.endsWith('ript>\n') || before.endsWith('ipt>\n')) {
    // Es la última justo antes de </body> (cierre real)
    // No reemplazar - es el cierre legítimo
    console.log('  => REAL HTML end, keeping as-is');
    break; // No tocar más, esto es el final
  } else {
    console.log('  => UNKNOWN context, keeping');
    break;
  }
}

console.log('\nSize after fix:', html.length);

// PASO 4: Ahora arreglar las líneas que perdieron la comilla de cierre
// fU: "const fU = (n, d=0) => '$ + n.toLocaleString" → "const fU = (n, d=0) => '$' + n.toLocaleString"
const fUpos = html.indexOf("const fU = (n, d=0) => '$ + n.toLocaleString");
if (fUpos !== -1) {
  html = html.substring(0, fUpos + 39) + "'" + html.substring(fUpos + 39);
  console.log('fU: inserted missing closing quote');
}

// fK: "const fK = n => n>=1e12?'$+(n/1e12)..."
// replace '$+ con '$'+
const fKlineStart = html.indexOf("const fK = n");
if (fKlineStart !== -1) {
  const fKlineEnd = html.indexOf('\n', fKlineStart);
  let fKline = html.substring(fKlineStart, fKlineEnd === -1 ? html.length : fKlineEnd);
  fKline = fKline.split("'$+").join("'$'+");
  html = html.substring(0, fKlineStart) + fKline + html.substring(fKlineEnd);
  console.log('fK: fixed all $+ → $+');
}

// stPnL: fund the line with toFixed(2)+'$; 
const pnlpos = html.indexOf("toFixed(2)+'$; $(");
if (pnlpos !== -1) {
  // toFixed(2)+'$; $( → toFixed(2)+'$'; $(
  html = html.substring(0, pnlpos + 14) + "'" + html.substring(pnlpos + 14);
  console.log('stPnL: fixed quote after $');
}

// PASO 5: EUR_URL
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);

// PASO 6: loadEUR
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);

// PASO 7: Footer
html = html.replace('open.er-api.com', 'Binance EURUSDT');

// Escribir con CRLF de Windows
fs.writeFileSync(path, html, 'utf8');
console.log('\nFinal:', fs.statSync(path).size, 'bytes');

// VERIFICACION
console.log('\n=== VERIFICACION ===');
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk = html.includes("1e12?'$'+(n/1e12)") && html.includes("1e9?'$'+(n/1e9)") && html.includes("'$'+n.toFixed");
const vp = html.includes("toFixed(2)+'$';");
const ve = html.includes('EURUSDT');
const vl = html.includes('parseFloat(d.price)||0.865');
const vf = html.includes('Binance EURUSDT');
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK:', vk ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('EUR:', ve ? 'OK' : 'FAIL');
console.log('loadEUR:', vl ? 'OK' : 'FAIL');
console.log('Footer:', vf ? 'OK' : 'FAIL');
console.log('ALL:', vu && vk && vp && ve && vl && vf ? '✅' : '❌');

// Mostrar lineas
const lines = html.split('\n');
for (let i = 548; i < 560; i++) {
  if (lines[i] && (lines[i].includes('fU') || lines[i].includes('fK'))) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
for (let i = 880; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
