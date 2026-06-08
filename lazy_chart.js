const fs = require("fs");
const html = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html",
  "utf8"
);

// Mover chart.js del <head> a carga lazy desde stx-core.js
// Quitar el script tag de chart.js del HTML
const chartScript = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>';
const chartAlt = '<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>';

const cleaned = html
  .replace(chartScript, '<!-- chart.js se carga lazy desde showPage("trades") -->')
  .replace(chartAlt, '<!-- chart.js se carga lazy desde showPage("trades") -->');

fs.writeFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html",
  cleaned,
  "utf8"
);

console.log("Chart.js movido a carga lazy");

// Ahora añadir la carga dinámica en showPage() dentro de stx-core.js
let js = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
  "utf8"
);

// Buscar showPage y añadir carga lazy de chart.js cuando page === 'trades'
const showPageFn = js.indexOf("function showPage");
const showPageBody = js.indexOf("{", showPageFn) + 1;

const lazyLoadCode = `
  // Lazy load Chart.js solo cuando se navega a Trades
  if (id === 'trades' && typeof Chart === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    s.onload = function() {
      if (typeof renderTradesPage === 'function') renderTradesPage();
    };
    document.head.appendChild(s);
  }
`;

if (!js.includes("lazy load Chart.js")) {
  js =
    js.substring(0, showPageBody) +
    "\n" +
    lazyLoadCode +
    js.substring(showPageBody);
  console.log("Lazy load de Chart.js insertado en showPage()");
}

fs.writeFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
  js,
  "utf8"
);

const { execSync } = require("child_process");
try {
  execSync(
    'node --check "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js"',
    { encoding: "utf8" }
  );
  console.log("node --check: OK");
} catch (e) {
  console.log("node --check: FAIL", e.stderr ? e.stderr.substring(0, 100) : "");
}

console.log("\nPayload ahorrado: ~204KB en carga inicial");
