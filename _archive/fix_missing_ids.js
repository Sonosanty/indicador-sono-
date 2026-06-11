const fs = require('fs');
const htmlPath = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// IDs que el JS espera y NO están en el HTML (según análisis del agente)
const missing = {
  'sys-tick': '--:--:--',
  'sys-price': '---',
  'sys-ws': '✅ Conectado',
  'sys-rest': '✅ Binance OK',
  'sys-fg': '✅ OK',
  'sys-cg': '✅ OK',
  'sys-eur': '✅ OK',
  'sys-trades': '✅ OK',
  'tTick': '--:--:--',
};

// Verificar cuáles faltan realmente
console.log('=== IDs FALTANTES ===');
for (const [id, val] of Object.entries(missing)) {
  if (html.includes('id="' + id + '"')) {
    console.log('  OK: ' + id);
    delete missing[id];
  } else {
    console.log('  FALTA: ' + id);
  }
}

if (Object.keys(missing).length === 0) {
  console.log('\nNo hay IDs faltantes - todo OK');
  process.exit(0);
}

// Buscar la sección de sistema para insertar los IDs faltantes
const sysPageStart = html.indexOf('id="page-sistema"');
const sysPageEnd = html.indexOf('id="page-', sysPageStart + 50);
const sysPageContent = html.substring(sysPageStart, sysPageEnd > 0 ? sysPageEnd : sysPageStart + 3000);

console.log('\n=== Buscando dónde insertar en page-sistema ===');

// Encontrar la tabla de sistema
const sysTable = html.indexOf('sysLog', sysPageStart);
const beforeSysLog = html.lastIndexOf('<div', sysTable - 50);
console.log('sysLog found at:', sysTable);
console.log('Contexto antes de sysLog:');
console.log(html.substring(sysTable - 150, sysTable + 100));

// Insertar los sys-* IDs como nuevas filas antes de sysLog
// Buscar el patrón de filas del sistema existente
const sysRowsEnd = html.indexOf('<!-- /page-sistema -->', sysPageStart);
if (sysRowsEnd < 0) {
  console.log('No se encontró cierre de page-sistema');
  process.exit(1);
}

// Encontrar las filas de sistema existentes
const sysContentStart = html.lastIndexOf('id="sysLog"', sysPageStart);
if (sysContentStart < 0) {
  console.log('sysLog no encontrado');
  process.exit(1);
}

// Insertar nuevas filas ANTES de sysLog, pero después de las filas existentes
// Buscar el </div> de cierre de la card del sistema
const sysCardEnd = html.lastIndexOf('</div>', sysContentStart);
const beforeSysCard = html.lastIndexOf('<div class="card"', sysContentStart);
console.log('\nCard sistema desde:', beforeSysCard, 'hasta:', sysCardEnd);
console.log('Contexto:');
console.log(html.substring(beforeSysCard, sysCardEnd + 10));

// Insertar: después de las filas existentes, dentro del card
// Buscar el último sys-row
const lastSysRow = html.lastIndexOf('sys-row', sysContentStart - 200);
if (lastSysRow < 0) {
  console.log('No hay sys-row existentes');
  process.exit(1);
}

// Encontrar el cierre de esa última fila
const afterLastRow = html.indexOf('</div>', lastSysRow);
const nextThing = html.indexOf('<div', afterLastRow + 6);
console.log('\nÚltima sys-row termina en:', afterLastRow);
console.log('Próximo elemento en:', nextThing);
console.log('Contexto entre:');
console.log(html.substring(afterLastRow, nextThing + 100));

// Insertar las nuevas filas después de la última sys-row existente
const insertAt = afterLastRow + 6; // after </div> of the last row

const newRows = Object.entries(missing).map(([id, val]) =>
  '    <div class="sys-row"><div class="sys-nm">' + id.replace('sys-', '').replace('tTick', 'WS Tick') + '</div><div class="sys-v" id="' + id + '">' + val + '</div></div>'
).join('\n');

html = html.substring(0, insertAt) + '\n' + newRows + '\n' + html.substring(insertAt);

fs.writeFileSync(htmlPath, html, 'utf8');

// Verificar
console.log('\n=== VERIFICACIÓN FINAL ===');
for (const id of Object.keys(missing)) {
  if (html.includes('id="' + id + '"')) {
    console.log('  ✅ ' + id + ' insertado correctamente');
  } else {
    console.log('  ❌ ' + id + ' - falló inserción');
  }
}
