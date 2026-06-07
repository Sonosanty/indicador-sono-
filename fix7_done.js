const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// --- BUG 1: go() router no llama a renderTrades() ni updateMetodoPage() ---
html = html.replace(
  "if(page==='rangos')refreshRangos();",
  "if(page==='rangos')refreshRangos();\n  if(page==='trades'&&S.trades)renderTrades(S.trades,S.livePx);\n  if(page==='metodo')updateMetodoPage();"
);

// --- BUG 2: t.estado -> t.estado||t.status    ---
// Usar string replace exactos en vez de regex
html = html.replace(
  "filter(t=>(t.estado||'').toUpperCase()!=='OPEN')",
  "filter(t=>((t.estado||t.status)||'').toUpperCase()!=='OPEN')"
);
html = html.replace(
  "filter(t=>(t.estado||'').toUpperCase()==='OPEN')",
  "filter(t=>((t.estado||t.status)||'').toUpperCase()==='OPEN')"
);
html = html.replace(
  "filter(t=>(t.estado||'').toUpperCase().startsWith('TP'))",
  "filter(t=>((t.estado||t.status)||'').toUpperCase().startsWith('TP'))"
);
html = html.replace(
  "filter(t=>(t.estado||'').toUpperCase().startsWith('SL'))",
  "filter(t=>((t.estado||t.status)||'').toUpperCase().startsWith('SL'))"
);
html = html.replace(
  "filter(t=>(t.estado||'').toUpperCase().startsWith('BE'))",
  "filter(t=>((t.estado||t.status)||'').toUpperCase().startsWith('BE'))"
);
html = html.replace(
  "const est=(t.estado||'').toUpperCase()",
  "const est=((t.estado||t.status)||'').toUpperCase()"
);
html = html.replace(
  "let bc='b-open',bt=t.estado;",
  "let bc='b-open',bt=(t.estado||t.status||'');"
);
html = html.replace(
  "bt=t.estado;",
  "bt=(t.estado||t.status||'');"
);

// --- BUG 3: t.r -> t.r_actual||t.r  (3 ocurrencias) ---
html = html.replace(
  "parseFloat(t.r)||0",
  "parseFloat(t.r_actual||t.r)||0"
);
html = html.replace(
  "parseFloat(t.r),rt=rs.reduce",
  "parseFloat(t.r_actual||t.r),rt=rs.reduce"
);
html = html.replace(
  "parseFloat(t.r);\n      let bc",
  "parseFloat(t.r_actual||t.r);\n      let bc"
);

// --- BUG 4: init() debe leer location.pathname al cargar ---
html = html.replace(
  "log('Init completado');",
  "var ip=location.pathname.replace(/^\\//,'')||'dashboard';var vp=['dashboard','metodo','rangos','trades','sistema'];if(vp.includes(ip))setTimeout(function(){go(ip);},50);log('Init completado');"
);

// --- BUG 5: refreshRangos async check ---
var hasAsync = html.indexOf('async function refreshRangos') >= 0;
console.log('BUG 5 check: refreshRangos async =', hasAsync);

// --- BUG 6: updateMetodoPage() vacia ---
html = html.replace(
  "function updateMetodoPage(){\n  // Score ya se actualiza en renderScore\n}",
  "function updateMetodoPage(){if(!S.livePx)return;var el=$('metodoChart');if(!el)return;el.innerHTML='<div style=font-size:22px;font-weight:700;font-family:var(--mono)>'+fU(S.livePx,2)+'</div><div style=font-size:12px;color:var(--text3);margin:4px 0>Precio en vivo - MA6 y MA70 proximamente con Chart.js</div>';}"
);

fs.writeFileSync('index.html', html, 'utf8');
var sz = fs.statSync('index.html').size;
console.log('Fix OK, size:', sz);

// Verification
var v1 = html.indexOf("if(page==='trades'&&S.trades)renderTrades") >= 0;
var v2 = html.indexOf("t.estado||t.status") >= 0;
var v3 = html.indexOf("t.r_actual||t.r") >= 0;
var v4 = html.indexOf("location.pathname.replace") >= 0;
var v5 = html.indexOf("async function refreshRangos") >= 0;
var v6 = html.indexOf("updateMetodoPage(){if(!S.livePx)return;var el=$('metodoChart')") >= 0;
console.log({v1:v1,v2:v2,v3:v3,v4:v4,v5:v5,v6:v6});
if (!v1||!v2||!v3||!v4||!v5||!v6) { process.exit(1); }
console.log("VERIFICACION OK");
