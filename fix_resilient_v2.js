// fix_resilient_v2.js — Reemplazos precisos vía Buffer.indexOf
const fs = require('fs');
const path = require('path');
const PROXY = 'https://vix-proxy.sonosanty.workers.dev';

const INPUT = path.join(__dirname, 'indicador_cloudflare', 'index.html');
let html = fs.readFileSync(INPUT, 'utf8');
let changes = 0;

function replace(oldStr, newStr, label) {
  const idx = html.indexOf(oldStr);
  if (idx >= 0) {
    html = html.slice(0, idx) + newStr + html.slice(idx + oldStr.length);
    console.log(`✅ ${label}`);
    changes++;
  } else {
    console.log(`❌ ${label} — NO ENCONTRADO`);
  }
}

// ── 1. BINANCE_API en CFG ──
replace(
  "BINANCE_API:'https://api.binance.com/api/v3'",
  "BINANCE_API:'" + PROXY + "'",
  'BINANCE_API → Worker proxy'
);

// ── 2. EUR_URL ──
replace(
  "EUR_URL:'https://vix-proxy.sonosanty.workers.dev/eur'",
  "EUR_URL:'" + PROXY + "/eur'",
  'EUR_URL → Worker proxy'
);

// ── 3. Footer open.er-api.com → Worker proxy ──
// Not needed, ya se cambió a Binance EURUSDT en commit anterior

// ── 4. Router SPA: function go → History API ──
const OLD_GO = `function go(page,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('ac'));
  const p=$('page-'+page);if(p)p.classList.add('active');
  if(btn)btn.classList.add('ac');
  if(page==='rangos')refreshRangos();
  if(page==='trades'&&S.trades)renderTrades(S.trades,S.livePx);
  if(page==='metodo')updateMetodoPage();
}`;

const NEW_GO = `function go(page,btn){
  var p=page==='dashboard'?'/':'/'+page;
  if(window.location.pathname!==p)history.pushState({page:page},'',p);
  renderPage(page,btn);
}
function renderPage(page,btn){
  document.querySelectorAll('.page').forEach(function(el){el.classList.remove('active');});
  document.querySelectorAll('.nb').forEach(function(el){el.classList.remove('ac');});
  var el=$('page-'+page);if(el)el.classList.add('active');
  if(btn)btn.classList.add('ac');
  if(page==='rangos')refreshRangos();
  if(page==='trades'&&S.trades)renderTrades(S.trades,S.livePx);
  if(page==='metodo')updateMetodoPage();
}
window.addEventListener('popstate',function(e){
  var pg=(e.state&&e.state.page)||routeFromPath();renderPage(pg);
});
function routeFromPath(){
  var p=window.location.pathname.replace(/^\\//,'').replace(/\\/$/,'');
  return['dashboard','metodo','rangos','trades','sistema'].includes(p)?p:'dashboard';
}`;

replace(OLD_GO, NEW_GO, 'Router SPA → History API');

// ── 5. Eliminar onclick=go() de botones nav ──
var navCount = 0;
while (true) {
  var i = html.indexOf('onclick="go(');
  if (i < 0) break;
  var end = html.indexOf(')"', i);
  if (end < 0) break;
  html = html.slice(0, i) + html.slice(end + 2);
  navCount++;
}
console.log(`✅ onclick=go() eliminados: ${navCount}`);
changes++;

// ── 6. Eliminar onclick=setCoin() de botones ──
var coinCount = 0;
while (true) {
  var i = html.indexOf('onclick="setCoin(');
  if (i < 0) break;
  var end = html.indexOf(')"', i);
  if (end < 0) break;
  html = html.slice(0, i) + html.slice(end + 2);
  coinCount++;
}
console.log(`✅ onclick=setCoin() eliminados: ${coinCount}`);
changes++;

// ── 7. Reemplazar el auto-route inline del init ──
const OLD_INIT_ROUTE = "var ip=location.pathname.replace(/^\\//,'')||'dashboard';var vp=['dashboard','metodo','rangos','trades','sistema'];if(vp.includes(ip))setTimeout(function(){go(ip);},50);log('Init completado');";
const NEW_INIT_ROUTE = "setTimeout(function(){var pg=routeFromPath();go(pg);var btns=document.querySelectorAll('.nb');btns.forEach(function(b){if(b.dataset.page===pg)b.classList.add('ac');});},50);log('Init completado — route: '+routeFromPath());";

replace(OLD_INIT_ROUTE, NEW_INIT_ROUTE, 'Init auto-route mejorado');

// ── 8. Guardar ──
fs.writeFileSync(INPUT, html, 'utf8');
const size = html.length;
console.log(`\n✅ HTML escrito: ${size} bytes (${changes} cambios)`);

// ── Verificación ──
console.log('\n── Verificación ──');
const checks = [
  ['BINANCE_API', "'" + PROXY + "'"],
  ['EUR_URL', PROXY + "/eur'"],
  ['history.pushState', 'History API'],
  ['popstate', 'popstate listener'],
  ['routeFromPath', 'auto-route'],
  ['function go(page', 'router go()'],
  ['function renderPage(page', 'renderPage()'],
  ['onclick', 0],
];
var allOk = true;
for (const [search, label] of checks) {
  if (label === 0) {
    const count = (html.match(/onclick=/g) || []).length;
    console.log(`${count===0?'✅':'⚠️'} onclick=: ${count} ocurrencias`);
    if (count > 0) allOk = false;
  } else {
    const found = html.indexOf(search) >= 0;
    console.log(`${found?'✅':'❌'} ${label}`);
    if (!found) allOk = false;
  }
}
console.log(`\n${allOk?'✅ VERIFICADO — HTML listo para deploy':'⚠️ Hay problemas que revisar'}`);
