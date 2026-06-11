const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Fix 1: fU - cerrar comilla de $
const old1 = "const fU = (n, d=0) => '$ + n.toLocaleString";
const new1 = "const fU = (n, d=0) => '$' + n.toLocaleString";
html = html.replace(old1, new1);
console.log('fU fix:', html.includes(new1));

// Fix 2: fK - cerrar comillas de tres $ 
const old2 = "const fK = n => n>=1e12?'$+(n/1e12).toFixed(2)+'T':n>=1e9?'$+(n/1e9).toFixed(1)+'B':'$+n.toFixed(0)";
const new2 = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0)";
html = html.replace(old2, new2);
console.log('fK fix:', html.includes(new2));

// Fix 3: stPnL - cerrar comilla de $
const old3 = "toFixed(2)+'$; $('stPnL')";
const new3 = "toFixed(2)+'$'; $('stPnL')";
html = html.replace(old3, new3);
console.log('stPnL fix:', html.includes(new3));

fs.writeFileSync(path, html, 'utf8');
console.log('Guardado:', fs.statSync(path).size, 'bytes');

// Verificación final
const v1 = html.includes("=> '$' + n.toLocaleString");
const v2 = html.includes("1e12?'$'+(n") && html.includes("1e9?'$'+(n") && html.includes("'$'+n.toFixed");
const v3 = html.includes("toFixed(2)+'$';");
console.log('Verificacion:', v1 && v2 && v3 ? 'TODOS OK' : 'PARCIAL');
console.log('  fU correcta:', v1);
console.log('  fK correcta:', v2);
console.log('  stPnL correcta:', v3);
