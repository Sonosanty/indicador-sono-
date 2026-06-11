const fs = require("fs");
const js = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js", "utf8");

// Inject updateSonoMethod calls into the 3 functions
// Pattern: find each function, find the last }, insert before it

const funcs = [
  { name: "renderScore", marker: "function renderScore" },
  { name: "loadTicker", marker: "async function loadTicker" },
  { name: "refreshIndicators", marker: "async function refreshIndicators" },
];

let result = js;
let count = 0;

for (const f of funcs) {
  const idx = result.indexOf(f.marker);
  if (idx < 0) { console.log("FAIL: " + f.name + " not found"); continue; }
  
  // Find the closing } of this function
  // Scan forward for balanced braces
  const contentStart = result.indexOf("{", idx) + 1;
  let depth = 1;
  let pos = contentStart;
  while (depth > 0 && pos < result.length) {
    if (result[pos] === "{") depth++;
    else if (result[pos] === "}") depth--;
    pos++;
  }
  const insertPos = pos - 1; // before the final }
  
  const hook = '\n  if (window.updateSonoMethod && lastScore) window.updateSonoMethod(lastScore);\n';
  
  // Check if already there
  const before = result.substring(insertPos - 40, insertPos);
  if (before.includes("updateSonoMethod")) {
    console.log("SKIP: " + f.name + " already has hook");
    continue;
  }
  
  result = result.substring(0, insertPos) + hook + result.substring(insertPos);
  count++;
  console.log("OK: hook inserted in " + f.name);
}

fs.writeFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js", result, "utf8");
console.log("\nTotal hooks inserted: " + count);

const { execSync } = require("child_process");
execSync('node --check "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js"', { encoding: "utf8" });
console.log("node --check: OK");

// Verify
const jv = fs.readFileSync("C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js", "utf8");
const uc = (jv.match(/updateSonoMethod\(lastScore\)/g) || []).length;
console.log("updateSonoMethod(lastScore) calls: " + uc);
