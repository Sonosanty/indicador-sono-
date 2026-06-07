const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Fix fU: reemplazar la línea entera
// "const fU = (n, d=0) => '$ + n.toLocaleS'tring('en-US', ..."
// debe ser:
// "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', ..."
const oldFU = "const fU = (n, d=0) => '$ + n.toLocaleS'tring('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
const newFU = "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
html = html.replace(oldFU, newFU);
console.log('fU fixed:', html.includes(newFU));

// Fix stPnL: "toFixed(2)+'$;' $('stPnL')" -> "toFixed(2)+'$'; $('stPnL')"
const oldPnL = "toFixed(2)+'$;' $('stPnL')";
const newPnL = "toFixed(2)+'$'; $('stPnL')";
html = html.replace(oldPnL, newPnL);
console.log('stPnL fixed:', html.includes(newPnL));

fs.writeFileSync(path, html, 'utf8');
console.log('Saved:', fs.statSync(path).size, 'bytes');

// VERIFICACION FINAL
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk = html.includes("1e12?'$'+(n/1e12)") && html.includes("1e9?'$'+(n/1e9)") && html.includes("'$'+n.toFixed");
const vp = html.includes("toFixed(2)+'$';");
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK:', vk ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('ALL OK:', vu && vk && vp ? '✅' : '❌');

// Mostrar lineas
const lines = html.split('\n');
for (let i = 548; i < 560; i++) {
  if (lines[i]) console.log('L' + i + ': ' + lines[i]);
}
for (let i = 880; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
