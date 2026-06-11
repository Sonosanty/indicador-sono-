const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Original size:', html.length, 'bytes');

// PASO 1: Restaurar signo $ corrompido por PowerShell
const corruption = '\n</body>\n</html>\n';
const count = html.split(corruption).length - 1;
console.log('Corrupciones $ encontradas:', count);

html = html.split(corruption).join('$');
console.log('Corrupciones eliminadas');

// Verificar que fU() tiene $
const fUcheck = html.includes("fU = (n, d=0) => '$'");
console.log('fU() $ correcto:', fUcheck);

// PASO 2: cambiar EUR_URL a Binance EURUSDT
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR_URL->Binance:', html.includes('EURUSDT'));

// PASO 3: loadEUR parse para Binance (d.price en vez de d.eur)
// Buscar la linea de S.eurRate=
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR parse fix:', html.includes("parseFloat(d.price)||0.865"));

fs.writeFileSync(path, html, 'utf8');
const stats = fs.statSync(path);
console.log('Guardado:', stats.size, 'bytes');

// Verificación final: contar $ en posiciones correctas
const dollarSigns = html.match(/\$/g);
console.log('Total $ en archivo:', dollarSigns ? dollarSigns.length : 0);
console.log('fU() existe:', html.includes("fU = (n, d=0) => '$'"));
console.log('fK() existe:', html.includes("fK = n => n>=1e12?'$'"));
console.log('PnL formato:', html.includes("(pnl>=0?'+':'')+pnl.toFixed(2)+'$'"));
