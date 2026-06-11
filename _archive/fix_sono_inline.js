const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('=== DIAGNOSTICO ===');
console.log('Size:', html.length);

// Buscar patrones exactos de las líneas rotas
const lines = html.split('\n');

// Detectar líneas problema
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  // fU rota: empieza con "const fU = " y termina en "'" sin nada más después del $
  if (l.startsWith("const fU = ") && l.endsWith("'")) {
    console.log('LINE ' + i + ' [fU]:', l);
    console.log('  NEXT:', lines[i+1].substring(0, 50), '...');
  }
  if (l.startsWith("const fK = ")) {
    console.log('LINE ' + i + ' [fK]:', l);
    console.log('  NEXT:', lines[i+1].substring(0, 50), '...');
    console.log('  NEXT2:', lines[i+2].substring(0, 80), '...');
  }
  if (l.includes("stPnL") && l.includes("toFixed")) {
    console.log('LINE ' + i + ' [stPnL]:', l);
  }
}

// Ahora: buscar el patrón exacto de las líneas MULTILINE que se generaron
// El HTML original tenía: const fU = (n, d=0) => '$' + n.toLocaleString
// Pero en el inline, el $ se convirtió en literal en vez de escapar correctamente
// Busquemos el "</body>" o saltos de línea inusuales

console.log('\n=== Buscando corrupciones ===');
// Buscar ocurrencias de </body></html> dentro de lines NO como cierre del HTML
const corruptedLines = [];
for (let i = 0; i < lines.length - 6; i++) {
  const block = lines.slice(i, i+6).join('\n');
  if (block.includes('</body>\n</html>') && i > 0) {
    corruptedLines.push({start: i, block: lines.slice(i, i+6)});
  }
}
console.log('Corrupted blocks:', corruptedLines.length);
corruptedLines.forEach(c => {
  console.log('  At line', c.start, ':');
  c.block.forEach((l, j) => console.log('   [' + (c.start+j) + ']', l));
});

// EUR URL
console.log('\n=== EUR URL ===');
const eurIdx = lines.findIndex(l => l.includes('EUR_URL'));
console.log('LINE ' + eurIdx + ':', lines[eurIdx]);
