const https = require("https");
function g(u) {
  return new Promise((r, j) => {
    https.get(u, { headers: { "Accept-Encoding": "identity" } }, (res) => {
      let d = [];
      res.on("data", (c) => d.push(c));
      res.on("end", () => r(Buffer.concat(d).toString()));
    }).on("error", j);
  });
}
(async () => {
  const h = await g("https://indicador-sono.pages.dev/");
  const j = await g("https://indicador-sono.pages.dev/js/stx-core.js");
  console.log("HTML:", h.length, "bytes | JS:", j.length, "bytes\n");

  console.log("=== IDs HTML ===");
  const ids = [
    "sonoMethod","sonoDot","sonoSignal","sonoSub","sonoScore","sonoConf","sonoRisk","sonoConfCount",
    "macroBias","microBias","momentumBias","volBias",
    "radarSvg","trendScore","momScore","volScore","gapScore",
    "trendBar","momBar","volBar","gapBar",
    "msTrend","msMacro","msMicro","msVol","msTrendBar","msMacroBar","msMicroBar","msVolBar",
    "matrixGrid","matrixResult",
    "execEntry","execStop","execTarget","execRR","execDur","execConf",
    "stratGrid","capIn","riskIn","atrIn","stopIn",
    "calcBtn","liveBtn","qtyOut","slOut","tpOut","rrOut","lossOut","profitOut",
    "timeline","jrWin","jrPF","jrExp","jrDD","journalTbody",
    "page-dashboard","page-metodo","page-trades","page-rangos","page-sistema",
    "coinBtns","scoreNum","priceUSD","wsBadge","mFNG"
  ];
  let ok = 0, fail = 0;
  for (const id of ids) {
    if (h.includes('id="' + id + '"')) { ok++; }
    else { fail++; console.log("  FAIL: " + id); }
  }
  console.log("Resultado: " + ok + "/" + (ok + fail) + "\n");

  console.log("=== JS CHECKS ===");
  [
    ["initSonoMethod()", "function initSonoMethod"],
    ["initSonoMethod(); call", "initSonoMethod();"],
    ["window.updateSonoMethod", "window.updateSonoMethod"],
    ["function radar", "function radar"],
    ["function confluence", "function confluence"],
    ["calcPosition", "calcPosition"],
    ["strategyGrid", "strategyGrid"],
    ["execPanel", "execPanel"],
    ["CG_BASE", "CG_BASE"],
    ["showPage", "function showPage"],
    ["renderScore", "function renderScore"],
    ["async renderRangosPage", "async function renderRangosPage"],
    ["renderTradesPage", "function renderTradesPage"],
  ].forEach(([n, p]) => console.log("  " + (j.includes(p) ? "OK" : "FAIL") + ": " + n));

  console.log("\n  Final JS: " + j.substring(j.length - 30));
})();
