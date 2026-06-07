const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Original size:', html.length);

// FIX 1: Reemplazar $ con corruption
// Cada '\n</body>\n</html>\n' (6 veces) debe ser reemplazado por '$'
// Pero antes de eso, cada corruption debe reemplazarse por '$' + cerrar comilla
// El patrón exacto es: "=> '$" seguido de \n<resto> que se cerró mal
// En la línea fU: "const fU = (n, d=0) => '" + \n</body>\n</html>\n + " + n.toLocaleString"
// Debe ser: "const fU = (n, d=0) => '$' + n.toLocaleString"

// PASO 1: direct string replace del patrón exacto que aparece en líneas rotas
// Pattern: "'\n</body>\n</html>\n + n"  ->  "' + n"
// Para fU: "const fU = (n, d=0) => '\n</body>\n</html>\n + n.toLocaleString"
// Debe ser: "const fU = (n, d=0) => '$' + n.toLocaleString"

// Hay 6 corrupciones idénticas.
// Cada una debe reemplazarse por "$' + " (cierra comilla abierta antes del $, añade $, cierra comilla, añade +)
// Wait - el patrón es: antes de la corrupción hay un ' abierto (ej: const fU = (n, d=0) => ')
// El \n</body>\n</html>\n reemplaza al $ literal
// Así que: ' + \n</body>\n</html>\n + resto  →  '$' + resto

// Encontrar la posición de cada ocurrencia
const corr = '\n</body>\n</html>\n';
let idx = 0;
let count = 0;
while ((idx = html.indexOf(corr, idx)) !== -1) {
  count++;
  const before = html.substring(idx - 5, idx);
  console.log('Corrupcion ' + count + ' at byte ' + idx + ', before="' + before + '"');
  idx += corr.length;
}
console.log('Total corrupciones:', count);

// Cada una reemplazar corrupcion por "$' + 
// Verificar que cada reemplazo cierre bien
html = html.split(corr).join('$');

// Ahora verificar: el ' antes del $ se cerró automáticamente con el } al final?
// La linea fU debe verse como: const fU = (n, d=0) => '$' + n.toLocaleString...
// Es decir, ' + $ + ' + resto... 
// Lo que tenemos ahora: const fU = (n, d=0) => '$ + n.toLocaleString...
// Falta un ' después de $

// FIX 2: Específicamente, donde sea que haya "$ + " poner "$' + "
// Pero cuidado con no romper comillas que ya están cerradas
// Patrón exacto de lo que ocurre: 
// fU: "$ + n.toLocaleString" → "$' + n.toLocaleString"
// fK: "$+(n/1e12)" → "$'+(n/1e12)"  (tres veces en fK)
// stPnL: "$; $(" → "$'; $("

// Fix fU
const pFU = html.indexOf("const fU = (n, d=0) => '$ + n.toLocaleString");
if (pFU !== -1) {
  // Insertar una comilla simple después del '$'
  html = html.substring(0, pFU + 39) + "'" + html.substring(pFU + 39);
  console.log('fU patched');
} else {
  console.log('fU pattern NOT found');
}

// Fix fK - tres reemplazos '$+ → '$'+
const fKStart = html.indexOf("const fK = n => n>=1e12?'$+");
if (fKStart !== -1) {
  const fKEnd = html.indexOf('\n', fKStart);
  let fKLine = html.substring(fKStart, fKEnd === -1 ? html.length : fKEnd);
  // Reemplazar '$+ por '$'+ en toda la línea
  fKLine = fKLine.split("'$+").join("'$'+");
  html = html.substring(0, fKStart) + fKLine + html.substring(fKEnd);
  console.log('fK patched:', fKLine);
} else {
  console.log('fK pattern NOT found');
}

// Fix stPnL
// Buscar: toFixed(2)+'$; $('
const pnlIdx = html.indexOf("toFixed(2)+'$; $(");
if (pnlIdx !== -1) {
  html = html.substring(0, pnlIdx + 14) + "'" + html.substring(pnlIdx + 14);
  console.log('stPnL patched');
} else {
  console.log('stPnL pattern NOT found');
  // Intentar buscar alternativas
  const altIdx = html.indexOf("toFixed(2)+'$;");
  if (altIdx !== -1) {
    console.log('Alternative at', altIdx, ':', html.substring(altIdx - 10, altIdx + 30));
  }
}

// FIX 3: EUR_URL
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR fixed:', html.includes('EURUSDT'));

// FIX 4: loadEUR
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR fixed:', html.includes('parseFloat(d.price)||0.865'));

// FIX 5: Footer
html = html.replace('open.er-api.com', 'Binance EURUSDT');
console.log('Footer fixed:', html.includes('Binance EURUSDT'));

fs.writeFileSync(path, html, 'utf8');
console.log('\nFinal size:', fs.statSync(path).size, 'bytes');

// VERIFICACION
console.log('\n=== VERIFICACION ===');
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk = html.includes("1e12?'$'+(n/1e12)") && html.includes("1e9?'$'+(n/1e9)") && html.includes("'$'+n.toFixed");
const vp = html.includes("toFixed(2)+'$';");
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK:', vk ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');

// Mostrar todas las líneas fU, fK, stPnL
const lines = html.split('\n');
for (let i = 548; i < 560; i++) {
  if (lines[i]) console.log('L' + i + ': ' + lines[i]);
}
for (let i = 880; i < 920; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
// EUR
for (let i = 520; i < 530; i++) {
  if (lines[i] && lines[i].includes('EUR_URL')) console.log('L' + i + ': ' + lines[i]);
}
