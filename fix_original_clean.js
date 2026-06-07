const fs = require('fs');

// Trabajar sobre el archivo original limpio del commit f9f25c9
const origPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html.original';
const outPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';

let html = fs.readFileSync(origPath, 'utf8');
console.log('Original size:', html.length);

// PASO 1: Revertir las 6 corrupciones LF de $ → "$"
// Cada \n</body>\n</html>\n debe ser reemplazado por "$"
const corruption = '\n</body>\n</html>\n';
const count = html.split(corruption).length - 1;
console.log('Corrupciones encontradas:', count);

html = html.split(corruption).join('$');
console.log('Size after fix:', html.length);

// Verificar fU, fK, stPnL antes de seguir
const lines = html.split('\n');
console.log('\n=== Líneas fU/fK ===');
for (let i = 540; i < 570; i++) {
  if (lines[i] && (lines[i].includes('fU =') || lines[i].includes('fK =') || lines[i].includes('stPnL'))) {
    console.log('L' + i + ': ' + lines[i]);
  }
}

// Ahora las funciones deberían tener $ correcto
// Ejemplo esperado (commit f9f25c9 con $ restaurado):
// const fU = (n, d=0) => '$' + n.toLocaleString('en-US', ...)
// Verificar:
const fUok = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const fKok = html.includes("const fK = n => n>=1e12?'$'+(n/1e12)");
console.log('\nfU correcta:', fUok);
console.log('fK correcta:', fKok);

// PASO 2: EUR_URL → Binance
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR fix:', html.includes('EURUSDT'));

// PASO 3: loadEUR parse → d.price
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR fix:', html.includes('parseFloat(d.price)||0.865'));

// PASO 4: Footer
html = html.replace(
  'open.er-api.com',
  'Binance EURUSDT'
);
console.log('Footer fix:', html.includes('Binance EURUSDT'));

// Escribir al output final
fs.writeFileSync(outPath, html, 'utf8');
console.log('\nGuardado output:', fs.statSync(outPath).size, 'bytes');

// VERIFICACIÓN FINAL COMPLETA
console.log('\n=== VERIFICACION FINAL ===');
const vU = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vK = html.includes("n>=1e12?'$'+(n/1e12).toFixed(2)+'T'") && html.includes("n>=1e9?'$'+(n/1e9).toFixed(1)+'B'") && html.includes("'$'+n.toFixed(0)");
const vP = html.includes("toFixed(2)+'$';");
const vE = html.includes('EURUSDT');
const vL = html.includes('parseFloat(d.price)||0.865');
const vF = html.includes('Binance EURUSDT');
console.log('fU OK:', vU);
console.log('fK OK:', vK);
console.log('stPnL OK:', vP);
console.log('EUR Binance:', vE);
console.log('loadEUR parseFloat:', vL);
console.log('Footer EUR fix:', vF);
console.log('ALL OK:', vU && vK && vP && vE && vL && vF ? '✅ TODO CORRECTO' : '❌ ALGO FALLA');

// Mostrar líneas finales
console.log('\n=== Líneas finales ===');
for (let i = 548; i < 560; i++) {
  if (lines[i]) console.log('L' + i + ': ' + lines[i]);
}
