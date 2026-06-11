const fs = require('fs');
const path = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
let html = fs.readFileSync(path, 'utf8');

console.log('Original:', html.length, 'bytes');

// El patrón de corrupción son 6 ocurrencias de \n</body>\n</html>\n que 
// reemplazan el signo $
// Pero la última ocurrencia (byte 55141) es el CIERRE LEGÍTIMO del HTML
// que aparece en medio del script tag.

// ESTRATEGIA: reemplazar SOLO las 5 primeras ocurrencias (las que están en JS)
// y NO la sexta (que es legítima). Luego arreglar las líneas que faltan.

// Encontrar posiciones de todas las ocurrencias
const corr = '\n</body>\n</html>\n';
const positions = [];
let idx = -1;
while ((idx = html.indexOf(corr, idx + 1)) !== -1) {
  positions.push(idx);
}
console.log('Corrupciones encontradas:', positions.length);
positions.forEach((p, i) => {
  const ctx = html.substring(Math.max(0, p - 30), p);
  console.log('  ' + i + ': byte ' + p + ' ctx="' + ctx + '"');
});

// La sexta está justo ANTES del cierre real </html> (que está al final)
// En realidad, parece que realmente TODO el </body></html> al final es parte de la corrupción
// Vamos byte a byte del final
const lastBlock = html.substring(html.length - 100);
console.log('\nUltimos 100 bytes:', JSON.stringify(lastBlock));

// La sexta ocurrencia está en byte 55141, el archivo mide 55158
// Así que el final es: [última corrupción] + script tag roto + fin
// La corrupción insertó </body></html> en medio del JS

// SOLUCIÓN: Reemplazar cada corrupción por '$' PERO solo en la primera línea de cada bloque
// Donde antes del $ hay una comilla simple abierta

// Para cada corrupción, determinar qué va justo antes
let result = '';
let lastEnd = 0;
for (let i = 0; i < positions.length; i++) {
  const p = positions[i];
  const before = html.substring(lastEnd, p);
  const afterChar = html.substring(p + corr.length, p + corr.length + 1);
  // Si el caracter después de la corrupción es un espacio o +
  // significa que la comilla antes del $ estaba abierta y debemos cerrarla
  result += before + "'$' + ";
  lastEnd = p + corr.length;
}
// Agregar el resto
result += html.substring(lastEnd);

// Ahora result tiene '$' + en lugar de cada corrupción. Pero esto insertó demasiados cierres.
// Necesitamos ajustar para que fK y stPnL cierren correctamente

// Mejor: enfoque diferente. Simplemente restaurar el texto exacto de 3 líneas conocidas.
console.log('\n=== Nueva estrategia: reemplazar exacto ===');

// Vuelvo al original y aplico reemplazos quirúrgicos
html = fs.readFileSync(path, 'utf8');

// 1) fU line
html = html.replace(
  "const fU = (n, d=0) => '" + corr + " + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});",
  "const fU = (n, d=0) => '$' + n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});"
);
console.log('fU:', html.includes("const fU = (n, d=0) => '$' + n.toLocaleString"));

// 2) fK line - tiene 3 corrupciones en la misma línea
// "const fK = n => n>=1e12?'" + corr + "+(n/1e12).toFixed(2)+'T':n>=1e9?'" + corr + "+(n/1e9).toFixed(1)+'B':'" + corr + "+n.toFixed(0);"
const oldfK = "const fK = n => n>=1e12?'" + corr + "+(n/1e12).toFixed(2)+'T':n>=1e9?'" + corr + "+(n/1e9).toFixed(1)+'B':'" + corr + "+n.toFixed(0);";
const newfK = "const fK = n => n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+n.toFixed(0);";
html = html.replace(oldfK, newfK);
console.log('fK:', html.includes("n>=1e12?'$'"));

// 3) stPnL line
const oldPnl = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'" + corr + "; $('stPnL').style.color=cG(pnl);";
const newPnl = "  $('stPnL').textContent=(pnl>=0?'+':'')+pnl.toFixed(2)+'$'; $('stPnL').style.color=cG(pnl);";
html = html.replace(oldPnl, newPnl);
console.log('stPnL:', html.includes("toFixed(2)+'$';"));

// 4) EUR_URL
html = html.replace(
  "EUR_URL: 'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL: 'https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT'"
);
console.log('EUR:', html.includes('EURUSDT'));

// 5) loadEUR parse
html = html.replace(
  "S.eurRate=d.eur||0.865;",
  "S.eurRate=parseFloat(d.price)||0.865;"
);
console.log('loadEUR:', html.includes('parseFloat(d.price)||0.865'));

// 6) Footer
html = html.replace('open.er-api.com', 'Binance EURUSDT');
console.log('Footer:', html.includes('Binance EURUSDT'));

// Escribir
fs.writeFileSync(path, html, 'utf8');
console.log('\nFinal:', fs.statSync(path).size, 'bytes');

// Verificación
console.log('\n=== VERIFICACION ===');
const vu = html.includes("const fU = (n, d=0) => '$' + n.toLocaleString");
const vk = html.includes("1e12?'$'+(n/1e12)") && html.includes("1e9?'$'+(n/1e9)") && html.includes("'$'+n.toFixed");
const vp = html.includes("toFixed(2)+'$';");
console.log('fU:', vu ? 'OK' : 'FAIL');
console.log('fK:', vk ? 'OK' : 'FAIL');
console.log('stPnL:', vp ? 'OK' : 'FAIL');
console.log('ALL OK:', vu && vk && vp ? '✅' : '❌');

// Mostrar
const lines = html.split('\n');
for (let i = 548; i < 560; i++) {
  if (lines[i] && (lines[i].includes('fU') || lines[i].includes('fK') || lines[i].includes('stPnL'))) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
for (let i = 880; i < 910; i++) {
  if (lines[i] && lines[i].includes('stPnL') && lines[i].includes('toFixed')) {
    console.log('L' + i + ': ' + lines[i]);
  }
}
// Verificar que no quedan corrupciones
const remaining = html.split(corr).length - 1;
console.log('Corrupciones restantes:', remaining);
