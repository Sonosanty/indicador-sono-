const fs = require('fs');
const inPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index_raw.html';
const outPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';

let html = fs.readFileSync(inPath, 'utf8');
console.log('Raw size:', html.length);

// PATRONES EXACTOS (LF, sin CRLF - git checkout produce LF)
const corr = '\n</body>\n</html>\n';

// FIX 1: fU
const oldFU = "const fU = (n, d=0) => '" + corr + " + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
const newFU = "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
html = html.replace(oldFU, newFU);
console.log('fU:', html.includes(newFU) ? 'OK' : 'FAIL');

// FIX 2: fK - 3 corrupciones
const oldFK = "const fK = n => n>=1e12?'" + corr + "+(n/1e12).toFixed(2)+'T':n>=1e9?'" + corr + "+(n/1e9).toFixed(1)+'B':'" + corr + "+n.toFixed(0);";
const newFK = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);";
html = html.replace(oldFK, newFK);
console.log('fK:', html.includes(newFK) ? 'OK' : 'FAIL');

// FIX 3: stPnL
const oldPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'" + corr + "; $('stPnL').style.color=cG(pnl);";
const newPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);";
html = html.replace(oldPnL, newPnL);
console.log('stPnL:', html.includes(newPnL) ? 'OK' : 'FAIL');

// FIX 4: EUR_URL
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR:', html.includes('EURUSDT') ? 'OK' : 'FAIL');

// FIX 5: loadEUR parse
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR:', html.includes('parseFloat(d.price)||0.865') ? 'OK' : 'FAIL');

// FIX 6: Footer
html = html.replace('open.er-api.com', 'Binance EURUSDT');
console.log('Footer:', html.includes('Binance EURUSDT') ? 'OK' : 'FAIL');

// Verificar corrupciones restantes
const remaining = html.split(corr).length - 1;
console.log('Corrupciones restantes:', remaining);
if (remaining > 1) {
  // La sexta corrupción es el cierre real </body></html> del HTML
  // Debería quedar 1 (el real)
  console.log('(1 es el cierre legitimo del HTML)');
}

// Escribir
fs.writeFileSync(outPath, html, 'utf8');
console.log('\nFinal size:', fs.statSync(outPath).size, 'bytes');

// VERIFICACION FINAL
console.log('\n=== VERIFICACION FINAL ===');
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk1 = html.includes("1e12?'$'+(n/1e12).toFixed(2)+'T'");
const vk2 = html.includes("1e9?'$'+(n/1e9).toFixed(1)+'B'");
const vk3 = html.includes("'$'+n.toFixed(0)");
const vp = html.includes("toFixed(2)+'$';");
const ve = html.includes('EURUSDT');
const vl = html.includes('parseFloat(d.price)||0.865');
const vf = html.includes('Binance EURUSDT');
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK 1/3:', vk1 ? 'OK' : 'FAIL');
console.log('fK 2/3:', vk2 ? 'OK' : 'FAIL');
console.log('fK 3/3:', vk3 ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('EUR:', ve ? 'OK' : 'FAIL');
console.log('loadEUR:', vl ? 'OK' : 'FAIL');
console.log('Footer:', vf ? 'OK' : 'FAIL');

const allOK = vu && vk1 && vk2 && vk3 && vp && ve && vl && vf;
console.log('ALL:', allOK ? '✅ TODO CORRECTO' : '❌ ALGO FALLA');

// Mostrar
const lines = html.split('\n');
console.log('\nLineas relevantes:');
for (let i = 550; i < 570; i++) {
  if (lines[i]) console.log(i + ': ' + lines[i]);
}
for (let i = 895; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log(i + ': ' + lines[i]);
  }
}
for (let i = 520; i < 530; i++) {
  if (lines[i] && lines[i].includes('EUR_URL')) console.log(i + ': ' + lines[i]);
}
