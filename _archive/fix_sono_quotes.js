const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

// fU está: "const fU = (n, d=0) => '$ + n.toLocaleString"
// debe ser: "const fU = (n, d=0) => '$' + n.toLocaleString"
const fUIdx = html.indexOf("const fU = (n, d=0) => '$ + n.toLocaleString");
if (fUIdx !== -1) {
  html = html.substring(0, fUIdx + 39) + "'" + html.substring(fUIdx + 39);
  console.log('fU fixed at', fUIdx);
}

// fK está: "const fK = n => n>=1e12?'$+(n/1e12).toFixed(2)+'T':n>=1e9?'$+(n/1e9).toFixed(1)+'B':'$+n.toFixed(0)"
// cada '$+ necesita ser '$'+
// Método: reemplazar todos los '$+ por '$'+, pero solo en la línea fK
const fKIdx = html.indexOf("const fK = n => n>=1e12?'$+");
if (fKIdx !== -1) {
  // Encontrar el fin de la línea fK
  const fKEnd = html.indexOf('\n', fKIdx);
  if (fKEnd === -1) fKEnd = html.indexOf('\r', fKIdx);
  const fKLine = html.substring(fKIdx, fKEnd);
  console.log('fK original:', fKLine);
  
  // Reemplazar '$+ por '$'+ en esa línea
  const fixedFK = fKLine.replaceAll("'$+", "'$'+");
  html = html.substring(0, fKIdx) + fixedFK + html.substring(fKEnd);
  console.log('fK fixed:', fixedFK);
}

// stPnL: buscar la línea de stPnL con toFixed(2)+'$; 
// Está en el archivo como: (pnl>=0?'+':'')+pnl.toFixed(2)+'$; $('stPnL').style.color=cG(pnl);
// Necesita cerrar con comilla: ...+pnl.toFixed(2)+'$'; ...
const pnlOld = "toFixed(2)+'$; $('stPnL')";
const pnlNew = "toFixed(2)+'$'; $('stPnL')";
html = html.replace(pnlOld, pnlNew);
console.log('stPnL fix:', html.includes(pnlNew));

fs.writeFileSync(path, html, 'utf8');
console.log('\nSaved:', fs.statSync(path).size, 'bytes');

// Verificación
console.log('\n=== FINAL ===');
const vU = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vK = html.includes("n>=1e12?'$'+(n/1e12).toFixed(2)+'T'") && html.includes("n>=1e9?'$'+(n/1e9).toFixed(1)+'B'") && html.includes("'$'+n.toFixed(0)");
const vP = html.includes("toFixed(2)+'$';");
console.log('fU:', vU ? 'OK' : 'FAIL');
console.log('fK:', vK ? 'OK' : 'FAIL');
console.log('stPnL:', vP ? 'OK' : 'FAIL');

// Mostrar líneas
const lines = html.split('\n');
for (let i = 550; i < 560; i++) {
  if (lines[i]) console.log('L' + i + ': ' + lines[i]);
}
// stPnL
for (let i = 890; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
