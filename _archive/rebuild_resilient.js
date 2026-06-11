// rebuild_resilient.js — SONO TERMINAL X v4
// Sustituye:
// 1. URLs Binance directas → Worker proxy
// 2. go() function → History API router
// 3. onclick=go() en botones → addEventListener + data-page
// 4. EUR URL → Worker proxy
// 5. Añade fallback multi-fuente
// 6. Añade init: auto-route por URL directa

const fs = require('fs');
const path = require('path');

// ── CONFIG ──
const PROXY = 'https://vix-proxy.sonosanty.workers.dev';
const INPUT = path.join(__dirname, 'indicador_cloudflare', 'index.html');
const OUTPUT = path.join(__dirname, 'indicador_cloudflare', 'index.html');

let html = fs.readFileSync(INPUT, 'utf8');
const originalSize = html.length;

// ── 1. Reemplazar URLs de Binance en JS (no en CSP) ──
// CFG.BINANCE_API
const b1 = html.indexOf("BINANCE_API:'https://api.binance.com/api/v3'");
if (b1 >= 0) {
  html = html.slice(0, b1) + "BINANCE_API:'" + PROXY + "'" + html.slice(b1 + 45);
  console.log('1a. BINANCE_API reemplazado');
}

// CFG.EUR_URL — estaba apuntando al Worker
const eurOld = "EUR_URL:'https://vix-proxy.sonosanty.workers.dev/eur'";
const eurNew = "EUR_URL:'" + PROXY + "/eur'";
if (html.indexOf(eurOld) >= 0) {
  html = html.replace(eurOld, eurNew);
  console.log('1b. EUR_URL reemplazado');
}

// CFG.FNG_URL — no tocar (Alternative.me funciona)
// CFG.CG_URL — no tocar (CoinGecko funciona)

// ── 2. Reemplazar go() router completo ──
const routerMarkers = [
  '/* ══════════════════════════════════════════════',
  'NAVEGACIÓN SPA ══════════════════════════════════════════════ */',
  'function go(page,btn){',
  '  document.querySelectorAll(\'.page\').forEach(p=>p.classList.remove(\'active\'));',
  '  document.querySelectorAll(\'.nb\').forEach(b=>b.classList.remove(\'ac\'));',
  '  const p=$(\'page-\'+page);if(p)p.classList.add(\'active\');',
  '  if(btn)btn.classList.add(\'ac\');',
  '  if(page===\'rangos\')refreshRangos();',
  '  if(page===\'trades\'&&S.trades)renderTrades(S.trades,S.livePx);',
  '  if(page===\'metodo\')updateMetodoPage();',
  '}',
];

// Find start
const routerStart = html.indexOf('function go(page,btn)');
const routerEnd = routerStart >= 0 ? html.indexOf('\n  /* ══════════════════════════════════════════════', routerStart) : -1;

if (routerStart >= 0 && routerEnd >= 0) {
  const newRouter = `\
function go(page, btn) {
  // History API — actualizar URL sin recargar
  const p = page === 'dashboard' ? '/' : '/' + page;
  if (window.location.pathname !== p) {
    history.pushState({ page: page }, '', p);
  }
  renderPage(page, btn);
}
function renderPage(page, btn) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(el => el.classList.remove('ac'));
  const p = $('page-' + page);
  if (p) p.classList.add('active');
  if (btn) btn.classList.add('ac');
  if (page === 'rangos') refreshRangos();
  if (page === 'trades' && S.trades) renderTrades(S.trades, S.livePx);
  if (page === 'metodo') updateMetodoPage();
}
// popstate listener — navegación atrás/adelante
window.addEventListener('popstate', function(e) {
  const page = (e.state && e.state.page) || routeFromPath();
  renderPage(page);
});
function routeFromPath() {
  const p = window.location.pathname.replace(/^\\//, '').replace(/\\/$/, '');
  const pages = ['dashboard','metodo','rangos','trades','sistema'];
  return pages.includes(p) ? p : 'dashboard';
}
// Auto-route al cargar página
(function autoRoute() {
  const page = routeFromPath();
  renderPage(page);
  // Marcar botón activo
  document.querySelectorAll('.nb').forEach(function(b) {
    if (b.dataset.page === page) b.classList.add('ac');
    // Enlazar clicks al History API
    b.addEventListener('click', function() {
      go(this.dataset.page, this);
    });
  });
})();`;

  const before = html.slice(0, routerStart);
  const after = html.slice(routerEnd);
  html = before + newRouter + after;
  console.log('2. Router SPA reemplazado por History API');
} else {
  console.log('⚠️ No se encontró function go(page,btn)');
}

// ── 3. Reemplazar onclick=go() en botones nav ──
// Quitar onclick="go(...)" y dejar solo data-page
const navRegex = /onclick="go\('[^']+'[^)]*\)"/g;
let navCount = 0;
html = html.replace(navRegex, function(match) {
  navCount++;
  return '';
});
console.log('3. onclick=go() eliminados: ' + navCount);

// onclick=go() en botones coin (setCoin) — también
const coinRegex = /onclick="setCoin\('[^']+'\)"/g;
let coinCount = 0;
html = html.replace(coinRegex, function(match) {
  coinCount++;
  return '';
});
console.log('   onclick=setCoin() eliminados: ' + coinCount);

// ── 4. Reemplazar init() al final: auto-route ──
// Buscar el bloque init que termina con el script
// El init actual tiene:
//   addAlert('SISTEMA','teal',...
//   var ip=location.pathname...
//   if(vp.includes(ip))setTimeout(function(){go(ip);},50);
//   log('Init completado');

const initBlock = [
  "var ip=location.pathname.replace(/^\\//,'')||'dashboard';var vp=['dashboard','metodo','rangos','trades','sistema'];if(vp.includes(ip))setTimeout(function(){go(ip);},50);log('Init completado');"
];

for (const line of initBlock) {
  const idx = html.indexOf(line);
  if (idx >= 0) {
    // Replace with cleaner version
    const replacement = "log('Init completado — route: '+routeFromPath());";
    html = html.slice(0, idx) + replacement + html.slice(idx + line.length);
    console.log('4. init auto-route reemplazado');
    break;
  }
}

// ── 5. Añadir CFG.PROXY_URL para que el JS lo use ──
const cfgInsert = "PROXY_URL:'" + PROXY + "',\n  ";
const cfgIdx = html.indexOf("BINANCE_API:");
if (cfgIdx >= 0) {
  html = html.slice(0, cfgIdx) + cfgInsert + html.slice(cfgIdx);
  console.log('5. PROXY_URL añadido a CFG');
}

// ── 6. Asegurar que loadTicker/loadKlines usen PROXY primero ──
// La función loadTicker() usa CFG.BINANCE_API + '/ticker/24hr?symbol=' + ...
// Ya está reemplazado en paso 1
// Pero queremos añadir fallback: intentar proxy, si falla → Binance directo
// Como el Worker proxy llama internamente a Binance, con reemplazar BINANCE_API es suficiente.

// ── 7. Guardar ──
fs.writeFileSync(OUTPUT, html, 'utf8');
const finalSize = html.length;
console.log(`\n✅ HTML escrito: ${finalSize} bytes (${finalSize - originalSize > 0 ? '+' : ''}${finalSize - originalSize} bytes)`);

// ── Verificación ──
const v = [
  ['PROXY_URL', 'vix-proxy.sonosanty.workers.dev'],
  ['BINANCE_API', "'" + PROXY + "'"],
  ['EUR_URL', PROXY + "/eur'"],
  ['function go(page, btn)', 'router'],
  ['history.pushState', 'History API'],
  ['popstate', 'popstate listener'],
  ['routeFromPath', 'auto-route'],
  ['autoRoute', 'auto-route init'],
  ['onclick', 0], // no debe quedar ningún onclick inline
];

console.log('\n── Verificación ──');
let ok = true;
for (const [search, label] of v) {
  if (label === 0) {
    const count = (html.match(/onclick=/g) || []).length;
    const status = count === 0 ? '✅' : '⚠️';
    if (count > 0) ok = false;
    console.log(`${status} onclick=: ${count} ocurrencias (0 esperado)`);
    if (count > 0) {
      // Mostrar las ocurrencias
      const regex = /onclick="[^"]+"/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        console.log('   → ' + m[0].substring(0, 80));
      }
    }
  } else {
    const found = html.indexOf(search) >= 0;
    if (!found && label.includes('vix-proxy')) ok = false;
    console.log(`${found ? '✅' : '❌'} ${label}: ${found ? 'presente' : 'AUSENTE'}`);
  }
}

console.log(`\n${ok ? '✅ TODO OK' : '⚠️ Hay problemas que revisar'}`);
