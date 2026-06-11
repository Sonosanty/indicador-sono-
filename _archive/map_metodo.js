const fs = require("fs");
const html = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html", "utf8");
const js = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js", "utf8");

console.log("=== MAPA page-metodo ===\n");

const metIdx = html.lastIndexOf("page-metodo");
const metEnd = html.indexOf("page-trades", metIdx);
const metSection = html.substring(metIdx, metEnd > 0 ? metEnd : metIdx + 5000);

const htmlIds = [...metSection.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
console.log("IDs en HTML page-metodo (" + htmlIds.length + "):");
htmlIds.forEach(id => console.log("  - " + id));

// Find IDs the JS modifies via set() or $()
const setCalls = [...js.matchAll(/set\(['"]([^'"]+)/g)].map(m => m[1]);
const getCalls = [...js.matchAll(/\\$\(['"]([^'"]+)/g)].map(m => m[1]);
const allJsIds = [...new Set([...setCalls, ...getCalls])];

const relevant = allJsIds.filter(id =>
  htmlIds.includes(id) || id.includes("sono") || id.includes("met-") || id.includes("est-")
);

console.log("\nIDs del JS para metodo:");
relevant.forEach(id => console.log("  " + (htmlIds.includes(id) ? "" : "(fuera de page-metodo) ") + id));

const missing = relevant.filter(id => !htmlIds.includes(id));
if (missing.length > 0) {
  console.log("\nIDs FALTANTES en HTML:");
  missing.forEach(id => console.log("  - " + id));
} else {
  console.log("\nOK: Todos los IDs existen en page-metodo");
}

console.log("\n=== VERIFICACIONES ===");
console.log("initSonoMethod():", js.includes("function initSonoMethod"));
console.log("window.updateSonoMethod:", js.includes("window.updateSonoMethod"));
console.log("updateSonoMethod(lastScore):", js.includes("updateSonoMethod(lastScore)"));
console.log("initSonoMethod():", js.includes("initSonoMethod();"));
console.log("calcPosition:", js.includes("calcPosition"));
console.log("execPanel:", js.includes("execPanel"));
console.log("strategyGrid:", js.includes("strategyGrid"));
console.log("Sin onclick:", !js.includes("onclick="));
console.log("async function init:", js.includes("async function init"));

console.log("\nCommit 589b592 - SONO METHOD module");
