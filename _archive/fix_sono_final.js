const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Reemplazar linea fU entera
const fUold = "const fU = (n, d=0) => '('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
const fUnew = "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
html = html.replace(fUold, fUnew);
console.log('fU replaced:', html.includes(fUnew));

// Reemplazar fK - buscar la linea exacta
const fKold = "const fK = n => n>=1e12?';\nconst fP = n => (n>=0?'+':'')+n.toFixed(2)+'%';";
const fKnew = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);\nconst fP = n => (n>=0?'+':'')+n.toFixed(2)+'%';";
html = html.replace(fKold, fKnew);
console.log('fK replaced:', html.includes("'$'+(n/1e12).toFixed(2)+'T'"));

// stPnL - buscar en raw
const pnlIdx = html.indexOf("$('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'");
if (pnlIdx !== -1) {
  const before = html.substring(0, pnlIdx);
  const afterStart = pnlIdx + "$('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'".length;
  // Lo que viene después del último '
  const after = html.substring(afterStart);
  // Reemplazar: toFixed(2)+'...)   con   toFixed(2)+'$'; ...
  html = html.substring(0, pnlIdx) + "$('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$';" + "\n  " + after;
  console.log('stPnL replaced at idx:', pnlIdx);
} else {
  console.log('stPnL pattern NOT found');
}

fs.writeFileSync(path, html, 'utf8');
console.log('Saved:', fs.statSync(path).size, 'bytes');

// Verificación final
console.log('\n=== FINAL VERIFICATION ===');
const uh = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const kh = html.includes("n>=1e12?'$'+(n/1e12).toFixed(2)+'T'");
const ph = html.includes("toFixed(2)+'$';");
const eb = html.includes('EURUSDT');
const lf = html.includes('parseFloat(d.price)||0.865');
console.log('fU:', uh ? 'OK' : 'FAIL');
console.log('fK:', kh ? 'OK' : 'FAIL');
console.log('stPnL:', ph ? 'OK' : 'FAIL');
console.log('EUR:', eb ? 'OK' : 'FAIL');
console.log('loadEUR:', lf ? 'OK' : 'FAIL');

// Mostrar lineas fU y fK finales
const lines = html.split('\n');
for (let i = 548; i < 558; i++) {
  if (lines[i]) console.log('L' + i + ': ' + lines[i]);
}
