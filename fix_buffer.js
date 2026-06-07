const fs = require('fs');
const inPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index_raw.html';
const outPath = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';

let buf = fs.readFileSync(inPath);
console.log('Buffer size:', buf.length, 'bytes');

// PATRONES EN BUFFER (evitar CRLF conversion)
const corr = '\n</body>\n</html>\n';

function replaceInBuffer(buffer, oldStr, newStr) {
  const oldBuf = Buffer.from(oldStr, 'utf8');
  const newBuf = Buffer.from(newStr, 'utf8');
  const idx = buffer.indexOf(oldBuf);
  if (idx === -1) return null;
  const result = Buffer.concat([
    buffer.slice(0, idx),
    newBuf,
    buffer.slice(idx + oldBuf.length)
  ]);
  return result;
}

// FIX 1: fU
const oldFU = "const fU = (n, d=0) => '" + corr + " + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
const newFU = "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});";
let result = replaceInBuffer(buf, oldFU, newFU);
if (result) {
  console.log('fU: OK');
  buf = result;
} else {
  console.log('fU: NOT FOUND');
  // Debug: buscar sin el corr
  const idx = buf.indexOf("const fU = (n, d=0)");
  if (idx !== -1) {
    console.log('  Found at', idx, ':', buf.slice(idx, idx + 90).toString('utf8').replace(/\n/g, '\\n'));
  }
}

// FIX 2: fK
const oldFK = "const fK = n => n>=1e12?'" + corr + "+(n/1e12).toFixed(2)+'T':n>=1e9?'" + corr + "+(n/1e9).toFixed(1)+'B':'" + corr + "+n.toFixed(0);";
const newFK = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);";
result = replaceInBuffer(buf, oldFK, newFK);
if (result) {
  console.log('fK: OK');
  buf = result;
} else {
  console.log('fK: NOT FOUND');
}

// FIX 3: stPnL
const oldPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'" + corr + "; $('stPnL').style.color=cG(pnl);";
const newPnL = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);";
result = replaceInBuffer(buf, oldPnL, newPnL);
if (result) {
  console.log('stPnL: OK');
  buf = result;
} else {
  console.log('stPnL: NOT FOUND');
}

// FIX 4: EUR_URL
const oldEUR = "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'";
const newEUR = "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'";
result = replaceInBuffer(buf, oldEUR, newEUR);
if (result) {
  console.log('EUR: OK');
  buf = result;
} else {
  console.log('EUR: NOT FOUND');
}

// FIX 5: loadEUR
const oldLoad = "S.eurRate=d.eur||0.865;";
const newLoad = "S.eurRate=parseFloat(d.price)||0.865;";
result = replaceInBuffer(buf, oldLoad, newLoad);
if (result) {
  console.log('loadEUR: OK');
  buf = result;
} else {
  console.log('loadEUR: NOT FOUND');
}

// FIX 6: Footer
const oldFoot = "open.er-api.com";
const newFoot = "Binance EURUSDT";
result = replaceInBuffer(buf, oldFoot, newFoot);
if (result) {
  console.log('Footer: OK');
  buf = result;
} else {
  console.log('Footer: NOT FOUND');
}

// Escribir
fs.writeFileSync(outPath, buf);
console.log('\nFinal size:', fs.statSync(outPath).size, 'bytes');

// Verificar en el output
const outStr = buf.toString('utf8');
const vu = outStr.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk1 = outStr.includes("1e12?'$'+(n/1e12).toFixed(2)+'T'");
const vk2 = outStr.includes("1e9?'$'+(n/1e9).toFixed(1)+'B'");
const vk3 = outStr.includes("'$'+n.toFixed(0)");
const vp = outStr.includes("toFixed(2)+'$';");
const ve = outStr.includes('EURUSDT');
const vl = outStr.includes('parseFloat(d.price)||0.865');
const vf = outStr.includes('Binance EURUSDT');
const remaining = outStr.split(corr).length - 1;
console.log('\n=== VERIFICACION ===');
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK 1/3:', vk1 ? 'OK' : 'FAIL');
console.log('fK 2/3:', vk2 ? 'OK' : 'FAIL');
console.log('fK 3/3:', vk3 ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('EUR:', ve ? 'OK' : 'FAIL');
console.log('loadEUR:', vl ? 'OK' : 'FAIL');
console.log('Footer:', vf ? 'OK' : 'FAIL');
console.log('Corrupciones restantes:', remaining);

const allOK = vu && vk1 && vk2 && vk3 && vp && ve && vl && vf;
console.log('ALL:', allOK ? '✅' : '❌');
