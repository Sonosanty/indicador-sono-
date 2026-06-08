const fs = require("fs");

let html = fs.readFileSync("C:/Users/sparreno/AppData/Local/Temp/index_ok.html", "utf8");

const conceptHtml = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/media/inbound/SONO_METHOD_CONCEPT---351de96a-7fa1-45d7-a603-48039ed0c671.html",
  "utf8"
);
const bs = conceptHtml.indexOf("<body>") + 6;
const be = conceptHtml.indexOf("</body>");
const conceptBody = bs > 5 ? conceptHtml.substring(bs, be).trim() : conceptHtml;

const metIdx = html.lastIndexOf("page-metodo");
const tradesIdx = html.indexOf("page-trades", metIdx);
const pageOpen = html.lastIndexOf('<div class="page"', metIdx);
const tradesCommentStart = html.lastIndexOf("<!--", tradesIdx - 10);

console.log("pageOpen:", pageOpen);
console.log("tradesCommentStart:", tradesCommentStart);

const newHtml =
  html.substring(0, pageOpen) +
  '<div class="page" id="page-metodo">\n' +
  conceptBody +
  "\n</div>" +
  html.substring(tradesCommentStart);

fs.writeFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html",
  newHtml,
  "utf8"
);

const verify = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html",
  "utf8"
);
console.log("\nVERIFICACION:");
console.log("sonoSignal:", verify.includes("sonoSignal"));
console.log("sonoScore:", verify.includes("sonoScore"));
console.log("matrixGrid:", verify.includes("matrixGrid"));
console.log("stratGrid:", verify.includes("stratGrid"));
console.log("calcBtn:", verify.includes("calcBtn"));
console.log(
  "Distancia page-metodo a page-trades:",
  verify.indexOf("page-trades", verify.lastIndexOf("page-metodo")) -
    verify.lastIndexOf("page-metodo"),
  "chars"
);
console.log("CoinGecko IDs:", verify.includes("mFNG") && verify.includes("mDOM"));
console.log("Botones moneda:", verify.includes("coinBtns") && verify.includes("BTC") && verify.includes("ETH"));
console.log("Trades table:", verify.includes("tradesFullTbody"));
console.log("Rangos:", verify.includes("rangeGrid"));
console.log("Dashboard score:", verify.includes("scoreNum"));
console.log("Dashboard WS:", verify.includes("wsBadge"));
