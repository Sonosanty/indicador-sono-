const fs = require('fs');

// Cargar el HTML base del commit f9f25c9 (que tiene todo el JS inline)
const basePath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(basePath, 'utf8');

console.log('Original:', html.length, 'bytes');

// Fix 1: fU = (n, d=0) => '$ + n.toLocaleString  →  fU = (n, d=0) => '$' + n.toLocaleString
// El $ se convirtió en \n</body>\n</html>\n, pero en este commit está como: 
// "const fU = (n, d=0) => '"  
// seguido de HTML que se salió del string literal
// Necesitamos restaurar: const fU = (n, d=0) => '$' + n.toLocaleString
// Primero revertimos al estado roto: const fU = (n, d=0) => '$ + n.toLocaleString
// Wait, en este commit f9f25c9, el findstr mostró que fU termina en apostrofe y el $ está AUSENTE.

// Encontrar exactamente cómo se ve fU en el archivo actual:
const fULineRaw = html.match(/const fU = \(n, d=0\) => .+/);
console.log('fU raw:', fULineRaw ? fULineRaw[0].substring(0,80) : 'NOT FOUND');

const fKLineRaw = html.match(/const fK = n => n>=1e12\?.+/);
console.log('fK raw:', fKLineRaw ? fKLineRaw[0].substring(0,100) : 'NOT FOUND');

const pnlLineRaw = html.match(/toFixed\(2\)\+\'.*/);
console.log('PnL raw:', pnlLineRaw ? pnlLineRaw[0].substring(0,80) : 'NOT FOUND');

// La línea stPnL actual en el commit f9f25c9 es:
// $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'
// Le falta $; y el cierre de comilla
// Debería ser: $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'

const pnlFullLineRaw = html.match(/\$\(.stPnL.\).*/);
console.log('stPnL raw:', pnlFullLineRaw ? pnlFullLineRaw[0] : 'NOT FOUND');

// EUR_URL actual
const eurLineRaw = html.match(/EUR_URL.*/);
console.log('EUR URL:', eurLineRaw ? eurLineRaw[0] : 'NOT FOUND');
