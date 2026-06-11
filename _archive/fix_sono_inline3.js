const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Ahora tenemos: "const fU = (n, d=0) => '$ + n.toLocaleString"
// Necesitamos:  "const fU = (n, d=0) => '$' + n.toLocaleString"
// La diferencia: insertar "'" después del "$" y antes del espacio + n.toLocaleString

// Fix fU
const oldFU = "const fU = (n, d=0) => '$ + n.toLocaleString";
const newFU = "const fU = (n, d=0) => '$' + n.toLocaleString";
html = html.replace(oldFU, newFU);
console.log('fU fix:', html.includes(newFU));

// Fix fK - tiene 3 $ delante de + / [^a-zA-Z]
// Patrón actual: "const fK = n => n>=1e12?'$+(n/1e12).toFixed(2)+'T':n>=1e9?'$+(n/1e9).toFixed(1)+'B':'$+n.toFixed(0)"
// Necesitamos:   "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0)"
const oldFK = "n>=1e12?'$+(n/1e12).toFixed(2)+'T':n>=1e9?'$+(n/1e9).toFixed(1)+'B':'$+n.toFixed(0)";
const newFK = "n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0)";
html = html.replace(oldFK, newFK);
console.log('fK fix:', html.includes(newFK));

// Fix stPnL - cerrar comilla de $
// Actual: "+pnl.toFixed(2)+'$; $('stPnL')"
// Deb ser: "+pnl.toFixed(2)+'$'; $('stPnL')"
const oldPnL = "toFixed(2)+'$; $('stPnL')";
const newPnL = "toFixed(2)+'$'; $('stPnL')";
html = html.replace(oldPnL, newPnL);
console.log('stPnL fix:', html.includes(newPnL));

fs.writeFileSync(path, html, 'utf8');
const stats = fs.statSync(path);
console.log('Guardado:', stats.size, 'bytes');

// Verificación final
console.log('\n=== VERIFICACION ===');
console.log('fU:', html.includes("const fU = (n, d=0) => '$' + n.toLocaleString") ? 'OK' : 'FAIL');
console.log('fK:', html.includes("n>=1e12?'$'+(n/1e12).toFixed(2)+'T'") && html.includes("n>=1e9?'$'+(n/1e9).toFixed(1)+'B'") && html.includes("'$'+n.toFixed") ? 'OK' : 'FAIL');
console.log('stPnL:', html.includes("toFixed(2)+'$';") ? 'OK' : 'FAIL');
console.log('EUR Binance:', html.includes('EURUSDT') ? 'OK' : 'FAIL');
console.log('loadEUR:', html.includes('parseFloat(d.price)||0.865') ? 'OK' : 'FAIL');
console.log('Footer:', html.includes('Binance EURUSDT') ? 'OK' : 'FAIL');
