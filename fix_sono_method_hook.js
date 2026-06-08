const fs = require("fs");
const js = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
  "utf8"
);

// En loadTicker, buscar donde se setea lastScore y añadir updateSonoMethod después
// Línea 296: const sc=computeScore(cl,hi,lo);lastScore=sc;
const target = "const sc=computeScore(cl,hi,lo);lastScore=sc;";
const replacement = "const sc=computeScore(cl,hi,lo);lastScore=sc;if(window.updateSonoMethod)window.updateSonoMethod(lastScore);";

const count = (js.match(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
console.log("Ocurrencias del target:", count);

if (count > 0) {
  const newJs = js.split(target).join(replacement);
  fs.writeFileSync(
    "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js",
    newJs,
    "utf8"
  );
  console.log("Hook updateSonoMethod insertado en loadTicker()");
  
  // Verificar cuántas llamadas hay ahora
  const calls = (newJs.match(/updateSonoMethod\(lastScore\)/g) || []).length;
  console.log("Total updateSonoMethod(lastScore) calls:", calls);
  
  const { execSync } = require("child_process");
  execSync('node --check "' + "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js" + '"', {
    encoding: "utf8",
  });
  console.log("node --check: OK");
} else {
  console.log("Target no encontrado - revisando contexto...");
  const idx = js.indexOf("lastScore=sc");
  console.log("Contexto:", js.substring(Math.max(0, idx - 20), idx + 60));
}
