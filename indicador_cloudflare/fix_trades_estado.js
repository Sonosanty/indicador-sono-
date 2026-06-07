const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Insertar geEstado ANTES de calcRActual
const geEstado = `
function geEstado(t) {
  const e = (t.estado || t.status || '').toUpperCase();
  return e === 'TP' || e === 'TP_V' ? 'TP_V'
       : e === 'SL' || e === 'SL_X' ? 'SL_X'
       : e === 'BE' ? 'BE'
       : e === 'OPEN' || e === '' ? 'OPEN'
       : e;
}

`;

const marker = `function calcRActual(trade, livePx) {`;
const markerIdx = html.indexOf(marker);
if (markerIdx === -1) { console.error('NO SE ENCONTRO calcRActual'); process.exit(1); }

// Buscar el comentario/espacio justo antes de calcRActual
const before = html.lastIndexOf('\n', markerIdx);
html = html.slice(0, before + 1) + geEstado + html.slice(before + 1);

// 2. Reemplazar (t.estado || '').toUpperCase() por geEstado(t) en renderTrades
const replacements = [
  // en filter closed
  [`const closed = trades.filter(t => (t.estado || '').toUpperCase() !== 'OPEN');`,
   `const closed = trades.filter(t => geEstado(t) !== 'OPEN');`],
  // en filter open
  [`const open   = trades.filter(t => (t.estado || '').toUpperCase() === 'OPEN');`,
   `const open   = trades.filter(t => geEstado(t) === 'OPEN');`],
  // en filter tp
  [`const tp = closed.filter(t => (t.estado || '').toUpperCase().startsWith('TP')).length;`,
   `const tp = closed.filter(t => geEstado(t).startsWith('TP')).length;`],
  // en filter sl
  [`const sl = closed.filter(t => (t.estado || '').toUpperCase().startsWith('SL')).length;`,
   `const sl = closed.filter(t => geEstado(t).startsWith('SL')).length;`],
  // en filter be
  [`const be = closed.filter(t => (t.estado || '').toUpperCase().startsWith('BE')).length;`,
   `const be = closed.filter(t => geEstado(t).startsWith('BE')).length;`],
  // en variable estado
  [`const estado = (t.estado || '').toUpperCase();`,
   `const estado = geEstado(t);`],
  // badge text
  [`let badgeCls = 'b-open', badgeTxt = t.estado;`,
   `let badgeCls = 'b-open', badgeTxt = estado === 'OPEN' ? 'OPEN' : (t.estado || t.status || '?');`],
  // en calcRActual
  [`const estado = (trade.estado || trade.status || '').toUpperCase();`,
   `const estado = geEstado(trade);`],
];

replacements.forEach(([oldStr, newStr]) => {
  if (html.includes(oldStr)) {
    html = html.replace(oldStr, newStr);
    console.log(`✅ Reemplazado: ${oldStr.substring(0, 60)}...`);
  } else {
    console.log(`⚠️ NO encontrado: ${oldStr.substring(0, 60)}...`);
  }
});

// 3. Fix columna R - null-safe para parseFloat(r)
// Buscar "const r      = isOpen ? calcRActual(t, livePx) : parseFloat(t.r);"
const rLine = `const r      = isOpen ? calcRActual(t, livePx) : parseFloat(t.r);`;
const rNew  = `const r      = isOpen ? calcRActual(t, livePx) : (t.r_actual != null ? t.r_actual : (t.r != null ? parseFloat(t.r) : null));`;
if (html.includes(rLine)) {
  html = html.replace(rLine, rNew);
  console.log('✅ Reemplazado calc R con fallback r_actual');
} else {
  console.log('⚠️ NO encontrado: const r = isOpen...');
}

// Verificar tamaño
console.log(`Tamaño final: ${html.length} bytes`);
console.log(`</html> presente: ${html.includes('</html>')}`);
console.log(`geEstado antes de calcRActual: ${html.indexOf('function geEstado') < html.indexOf('function calcRActual')}`);
console.log(`geEstado antes de renderTrades: ${html.indexOf('function geEstado') < html.indexOf('function renderTrades')}`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ index.html guardado');
