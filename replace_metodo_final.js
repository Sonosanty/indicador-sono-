const fs = require("fs");

const htmlPath = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html";
let html = fs.readFileSync(htmlPath, "utf8");

// Leer el concepto SONO METHOD (página completa)
const concept = fs.readFileSync(
  "C:/Users/sparreno/AppData/Local/Temp/sono_method_concept_latest.html",
  "utf8"
);

// Extraer: style del head + body content
const styleStart = concept.indexOf("<style>");
const styleEnd = concept.indexOf("</style>") + 8;
const conceptStyle = concept.substring(styleStart, styleEnd);

// Extraer body (sin el script inline que tiene state hardcodeado - eso lo maneja stx-core.js)
const bodyStart = concept.indexOf("<body>") + 6;
const bodyEnd = concept.indexOf("</body>");
let conceptBody = concept.substring(bodyStart, bodyEnd).trim();

// Quitar el <script> inline del body (state hardcodeado + funciones que duplican stx-core)
const scriptIdx = conceptBody.lastIndexOf("<script>");
if (scriptIdx >= 0) {
  conceptBody = conceptBody.substring(0, scriptIdx);
}

// ===== 1. Reemplazar page-metodo en el HTML =====
const metIdx = html.lastIndexOf("page-metodo");
const pageOpen = html.lastIndexOf('<div class="page"', metIdx);
const tradesComment = html.lastIndexOf("<!--", html.indexOf("page-trades", metIdx) - 10);

const newHtml =
  html.substring(0, pageOpen) +
  '<div class="page" id="page-metodo">\n' +
  conceptBody +
  "\n</div>" +
  html.substring(tradesComment);

fs.writeFileSync(htmlPath, newHtml, "utf8");
console.log("Page-metodo reemplazado con concepto SONO METHOD");

// ===== 2. Insertar el CSS del concepto en el head del HTML =====
// Buscar </head> e insertar antes
const headClose = newHtml.indexOf("</head>");
let html2 = fs.readFileSync(htmlPath, "utf8");
html2 =
  html2.substring(0, headClose) +
  "\n" +
  conceptStyle +
  "\n" +
  html2.substring(headClose);
fs.writeFileSync(htmlPath, html2, "utf8");
console.log("CSS de SONO METHOD insertado en <head>");

// ===== 3. Verificar =====
const verify = fs.readFileSync(htmlPath, "utf8");
console.log("\n=== VERIFICACION ===");
const checkIds = [
  "sonoMethod", "sonoDot", "sonoSignal", "sonoSub", "sonoScore", "sonoConf", "sonoRisk", "sonoConfCount",
  "macroBias", "microBias", "momentumBias", "volBias",
  "radarSvg", "trendScore", "momScore", "volScore", "gapScore",
  "trendBar", "momBar", "volBar", "gapBar",
  "msTrend", "msMacro", "msMicro", "msVol",
  "msTrendBar", "msMacroBar", "msMicroBar", "msVolBar",
  "matrixGrid", "matrixResult",
  "execEntry", "execStop", "execTarget", "execRR", "execDur", "execConf",
  "stratGrid",
  "capIn", "riskIn", "atrIn", "stopIn",
  "calcBtn", "liveBtn", "qtyOut", "slOut", "tpOut", "rrOut", "lossOut", "profitOut",
  "timeline", "jrWin", "jrPF", "jrExp", "jrDD", "journalTbody",
  "page-dashboard", "page-trades", "page-rangos", "page-sistema",
  "coinBtns", "scoreNum", "priceUSD", "wsBadge", "mFNG"
];

let ok = 0, fail = 0;
for (const id of checkIds) {
  if (verify.includes('id="' + id + '"')) { ok++; }
  else { fail++; console.log("  FAIL: " + id); }
}
console.log("\nIDs: " + ok + "/" + (ok + fail) + " presentes");
if (fail === 0) console.log("  TODOS OK!");
