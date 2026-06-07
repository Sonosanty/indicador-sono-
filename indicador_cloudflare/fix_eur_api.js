const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// El worker devuelve {eur: X, timestamp: Y} en lugar de {rates: {EUR: X}}
const old1 = `eurRate  = d.rates?.EUR || 0.92;`;
const new1 = `eurRate  = d.eur ?? 0.92;`;

if (html.includes(old1)) {
  html = html.replace(old1, new1);
  console.log('✅ Parse EUR actualizado: d.rates?.EUR -> d.eur');
} else {
  console.log('⚠️ NO encontrado: d.rates?.EUR');
  // buscar variantes
  const idx = html.indexOf('d.rates');
  if (idx > 0) {
    console.log('Encontrado d.rates en pos', idx, ':', html.substring(idx, idx + 40));
  }
}

// Footer - si aun no se actualizo
const oldFoot1 = 'open.er-api.com';
const newFoot1 = 'EUR via Worker';
if (html.includes(oldFoot1)) {
  html = html.replace(oldFoot1, newFoot1);
  console.log('✅ Footer actualizado');
}

// CSP - añadir worker URL a connect-src
const oldCsp = /connect-src 'self'[^;]+/;
const match = html.match(oldCsp);
if (match) {
  const cspLine = match[0];
  if (!cspLine.includes('vix-proxy')) {
    const newCspLine = cspLine.replace(
      'https://indicador-sono.pages.dev',
      'https://indicador-sono.pages.dev https://vix-proxy.sonosanty.workers.dev'
    );
    html = html.replace(cspLine, newCspLine);
    console.log('✅ CSP connect-src actualizado con worker URL');
  } else {
    console.log('ℹ️ CSP ya tiene vix-proxy URL');
  }
}

console.log(`Tamaño final: ${html.length} bytes`);
console.log(`</html> presente: ${html.includes('</html>')}`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ index.html guardado');
