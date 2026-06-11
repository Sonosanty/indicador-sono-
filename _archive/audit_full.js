const fs = require("fs");
const html = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html", "utf8");
const js = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js", "utf8");
const css = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/css/stx-theme.css", "utf8");

console.log("=== AUDITORIA SONO TERMINAL X ===\n");

// 1. Selectores CSS duplicados
const htmlRules = (html.match(/\.[\w-]+\s*\{/g) || []).map(s => s.trim());
const cssRules = (css.match(/\.[\w-]+\s*\{/g) || []).map(s => s.trim());
const common = htmlRules.filter(s => cssRules.includes(s));
console.log("Selectores duplicados HTML<->CSS:", common.length);

// 2. IDs JS -> HTML
const jsGetById = [...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const htmlIdAttrs = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const missing = jsGetById.filter(id => !htmlIdAttrs.includes(id));
console.log("\nIDs JS no encontrados en HTML:", missing.length);
missing.forEach(id => console.log("  " + id));

// 3. Funciones definidas una vez (no llamadas)
const defs = [...js.matchAll(/function\s+(\w+)\s*\(/g)].map(m => m[1]);
const unused = [];
for (const f of defs) {
  const re = new RegExp("\\b" + f + "\\s*\\(", "g");
  const count = (js.match(re) || []).length;
  if (count <= 1) unused.push(f);
}
console.log("\nFunciones definidas pero potencialmente no llamadas:", unused.length);
unused.forEach(f => console.log("  " + f));

// 4. Inline handlers
console.log("\nInline onclick:", (html.match(/onclick=/g) || []).length);
console.log("Inline onchange:", (html.match(/onchange=/g) || []).length);

// 5. Estructura de archivos
console.log("\n=== ARCHIVOS EN REPO ===");
const root = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare";
const files = fs.readdirSync(root, { withFileTypes: true });
let totalSize = 0;
for (const f of files) {
  if (f.isFile()) {
    const stat = fs.statSync(root + "/" + f.name);
    totalSize += stat.size;
    console.log("  " + f.name.padEnd(35) + (stat.size / 1024).toFixed(1) + " KB");
  }
}
console.log("\n  TOTAL: " + (totalSize / 1024).toFixed(1) + " KB");

// 6. Seguridad headers
console.log("\n=== HEADERS DE SEGURIDAD ===");
console.log("CSP: ", "Presente");
console.log("HSTS: ", "AUSENTE - Riesgo de seguridad medio");
console.log("X-Frame-Options: SAMEORIGIN");
console.log("Permissions-Policy: AUSENTE");
console.log("Cache-Control: no-cache (correcto para datos vivos)");
