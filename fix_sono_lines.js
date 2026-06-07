const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Original:', html.length, 'bytes');

// Normalizar CRLF a LF para procesamiento
html = html.replace(/\r\n/g, '\n');

// FIX 1: fU (3 líneas → 1 línea)
// const fU = (n, d=0) => '\n</body>\n</html>\n + n.toLocaleString...
// → const fU = (n, d=0) => '$' + n.toLocaleString...
const oldFU = "const fU = (n, d=0) => '\n</body>\n</html>\n + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
const newFU = "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
if (html.includes(oldFU)) {
  html = html.replace(oldFU, newFU);
  console.log('fU: OK');
} else {
  console.log('fU: pattern NOT FOUND');
  // Debug
  const idx = html.indexOf("const fU = (n, d=0)");
  if (idx !== -1) console.log('  found at', idx, ':', html.substring(idx, idx + 80).replace(/\n/g, '\\n'));
}

// FIX 2: fK - 3 corrupciones, que abarcan líneas 556-565
// const fK = n => n>=1e12?'\n</body>\n</html>\n+(n/1e12).toFixed(2)+'T':n>=1e9?'\n</body>\n</html>\n+(n/1e9).toFixed(1)+'B':'\n</body>\n</html>\n+n.toFixed(0);
const oldFK = "const fK = n => n>=1e12?'\n</body>\n</html>\n+(n/1e12).toFixed(2)+'T':n>=1e9?'\n</body>\n</html>\n+(n/1e9).toFixed(1)+'B':'\n</body>\n</html>\n+n.toFixed(0);";
const newFK = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);";
if (html.includes(oldFK)) {
  html = html.replace(oldFK, newFK);
  console.log('fK: OK');
} else {
  console.log('fK: pattern NOT FOUND');
  // Intentar buscar coincidencia parcial
  const fkIdx = html.indexOf("const fK = n => n>=1e12");
  if (fkIdx !== -1) {
    const after = html.substring(fkIdx, fkIdx + 120).replace(/\n/g, '\\n');
    console.log('  found at', fkIdx, ':', after);
  }
}

// FIX 3: stPnL (3 líneas → 1 línea)
//   $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'\n</body>\n</html>\n; $('stPnL').style.color=cG(pnl);
const oldPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'\n</body>\n</html>\n; $('stPnL').style.color=cG(pnl);";
const newPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);";
if (html.includes(oldPnL)) {
  html = html.replace(oldPnL, newPnL);
  console.log('stPnL: OK');
} else {
  console.log('stPnL: pattern NOT FOUND');
  const pnlIdx = html.indexOf("stPnL");
  if (pnlIdx !== -1) {
    const after = html.substring(pnlIdx - 20, pnlIdx + 60).replace(/\n/g, '\\n');
    console.log('  found at', pnlIdx, ':', after);
  }
}

// FIX 4: EUR_URL
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR:', html.includes('EURUSDT') ? 'OK' : 'FAIL');

// FIX 5: loadEUR
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR:', html.includes('parseFloat(d.price)||0.865') ? 'OK' : 'FAIL');

// FIX 6: Footer
html = html.replace('open.er-api.com', 'Binance EURUSDT');
console.log('Footer:', html.includes('Binance EURUSDT') ? 'OK' : 'FAIL');

// Verificar que no quedan </body></html> no legítimos (excepto el final)
const remaining = html.split('\n</body>\n</html>\n').length - 1;
console.log('Corrupciones restantes:', remaining);

// Escribir
fs.writeFileSync(path, html, 'utf8');
console.log('\nFinal:', fs.statSync(path).size, 'bytes');

// VERIFICACION
console.log('\n=== VERIFICACION ===');
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk = html.includes("1e12?'$'+(n/1e12)") && html.includes("1e9?'$'+(n/1e9)") && html.includes("'$'+n.toFixed");
const vp = html.includes("toFixed(2)+'$';");
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK:', vk ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('ALL:', vu && vk && vp ? '✅' : '❌');

// Mostrar
const lines = html.split('\n');
for (let i = 550; i < 570; i++) {
  if (lines[i] && (lines[i].includes('fU') || lines[i].includes('fK'))) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
for (let i = 895; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
