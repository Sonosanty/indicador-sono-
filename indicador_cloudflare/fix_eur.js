const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Reemplazar URL de EUR API por el worker proxy
const oldUrl = `const EUR_API     = 'https://open.er-api.com/v6/latest/USD';`;
const newUrl = `const EUR_API     = 'https://vix-proxy.sonosanty.workers.dev/eur';`;

if (html.includes(oldUrl)) {
  html = html.replace(oldUrl, newUrl);
  console.log('✅ EUR API URL reemplazada por worker proxy');
} else {
  console.log('⚠️ NO encontrado: EUR_API URL');
}

// 2. Reemplazar el parse de la respuesta (el worker devuelve {eur: X, timestamp: Y} no {rates: {EUR: X}})
const oldParse = `const eurRate = data?.rates?.EUR;`;
const newParse = `const eurRate = data?.eur;`;

if (html.includes(oldParse)) {
  html = html.replace(oldParse, newParse);
  console.log('✅ Parse EUR reemplazado: rates.EUR -> eur');
} else {
  console.log('⚠️ NO encontrado: rates.EUR');
}

// 3. Footer - actualizar open.er-api.com -> vix-proxy worker
const oldFooter = 'SONO PRO V8 � Binance WS � Alternative.me � CoinGecko � open.er-api.com � No es consejo financiero';
const newFooter = 'SONO PRO V8 � Binance WS � Alternative.me � CoinGecko � EUR via Worker � No es consejo financiero';
if (html.includes(oldFooter)) {
  html = html.replace(oldFooter, newFooter);
  console.log('✅ Footer actualizado');
} else {
  console.log('⚠️ NO encontrado footer antiguo, buscando alternativa...');
  // Intentar con otro encoding
  const altFooter = 'open.er-api.com';
  const fi = html.indexOf(altFooter);
  if (fi > 0) {
    console.log(`Encontrado en pos ${fi}, reemplazando contexto cercano...`);
    const before = html.lastIndexOf('>', fi);
    const after = html.indexOf('<', fi);
    if (before > 0 && after > before) {
      console.log('Contexto:', html.substring(before, after+1));
    }
  }
}

console.log(`Tamaño final: ${html.length} bytes`);
console.log(`</html> presente: ${html.includes('</html>')}`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ index.html guardado');
