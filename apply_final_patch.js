const fs = require("fs");
const htmlPath = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html";
const jsPath = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js";

// ======== 1. HTML: Reemplazar page-metodo con el concepto ========
let html = fs.readFileSync(htmlPath, "utf8");
const conceptHtml = fs.readFileSync(
  "C:/Users/sparreno/.openclaw/media/inbound/SONO_METHOD_CONCEPT---cad7dc87-d6f9-4add-bd96-1b11a88ea6ee.html",
  "utf8"
);

// Extraer body del concepto
const bs = conceptHtml.indexOf("<body>") + 6;
const be = conceptHtml.indexOf("</body>");
const conceptBody = bs > 5 ? conceptHtml.substring(bs, be).trim() : conceptHtml;

// Reemplazar page-metodo
const metIdx = html.lastIndexOf("page-metodo");
const tradesIdx = html.indexOf("page-trades", metIdx);
const pageOpen = html.lastIndexOf('<div class="page"', metIdx);
const tradesComment = html.lastIndexOf("<!--", tradesIdx - 10);

const newHtml =
  html.substring(0, pageOpen) +
  '<div class="page" id="page-metodo">\n' +
  conceptBody +
  "\n</div>" +
  html.substring(tradesComment);

fs.writeFileSync(htmlPath, newHtml, "utf8");
console.log("HTML page-metodo reemplazado");

// ======== 2. JS: Integraciones del diff ========
let js = fs.readFileSync(jsPath, "utf8");

// A. initSonoMethod() dentro de init()
if (!js.includes("initSonoMethod();")) {
  const initFn = js.indexOf("async function init()");
  const bodyStart = js.indexOf("{", initFn) + 1;
  js = js.substring(0, bodyStart) + "\n  initSonoMethod();\n" + js.substring(bodyStart);
  console.log("A: initSonoMethod() insertado en init()");
}

// B. updateSonoMethod(sc) en renderScore
if (!js.includes("updateSonoMethod(lastScore)")) {
  const rsIdx = js.indexOf("function renderScore");
  if (rsIdx >= 0) {
    const nextFn = js.indexOf("function", rsIdx + 5);
    const segment = nextFn > 0 ? js.substring(rsIdx, nextFn) : js.substring(rsIdx);
    const lastBrace = segment.lastIndexOf("}");
    if (lastBrace > 0) {
      const absPos = rsIdx + lastBrace;
      js = js.substring(0, absPos) + "\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n" + js.substring(absPos);
      console.log("B: updateSonoMethod(lastScore) en renderScore");
    }
  }
}

// C. updateSonoMethod al final de loadTicker
if ((js.match(/updateSonoMethod\(lastScore\)/g) || []).length < 2) {
  const ltIdx = js.indexOf("async function loadTicker");
  if (ltIdx >= 0) {
    const nextFn = js.indexOf("async function", ltIdx + 5);
    const segment = nextFn > 0 ? js.substring(ltIdx, nextFn) : js.substring(ltIdx);
    const lastBrace = segment.lastIndexOf("}");
    if (lastBrace > 0) {
      const absPos = ltIdx + lastBrace;
      js = js.substring(0, absPos) + "\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n" + js.substring(absPos);
      console.log("C: updateSonoMethod en loadTicker");
    }
  }
}

// D. updateSonoMethod al final de refreshIndicators
if ((js.match(/updateSonoMethod\(lastScore\)/g) || []).length < 3) {
  const riIdx = js.indexOf("async function refreshIndicators");
  if (riIdx >= 0) {
    const nextFn = js.indexOf("async function", riIdx + 5);
    const segment = nextFn > 0 ? js.substring(riIdx, nextFn) : js.substring(riIdx);
    const lastBrace = segment.lastIndexOf("}");
    if (lastBrace > 0) {
      const absPos = riIdx + lastBrace;
      js = js.substring(0, absPos) + "\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n" + js.substring(absPos);
      console.log("D: updateSonoMethod en refreshIndicators");
    }
  }
}

// ======== 3. Módulo initSonoMethod completo ========
const moduleBlock = `\n/* SSSSSONO METHOD(tm) MODULE SSSS */
function initSonoMethod() {
  const $$ = id => document.getElementById(id);
  const fmt = n => Number.isFinite(n) ? n.toLocaleString("en-US", {maximumFractionDigits: 2}) : "--";
  const set = (id, v) => { const e = $$(id); if (e) e.textContent = v; };
  const s = {
    price: 0, atr: 0, ma6: 0, ma40: 0, ma70: 0, ma200: 0,
    rsi: 0, adx: 0, pb: 0, bw: 0, gap: 0, score: 0,
    confidence: 0, confluence: 0
  };
  function calcPosition() {
    const cap = +($$("capIn")?.value || 0);
    const risk = (+($$("riskIn")?.value || 0)) / 100;
    const atr = +($$("atrIn")?.value || s.atr || 0);
    const stop = +($$("stopIn")?.value || Math.max(0, s.price - 1.5 * atr));
    const entry = s.price;
    const loss = cap * risk;
    const qty = loss / Math.max(1e-9, Math.abs(entry - stop));
    const tp = entry + 2 * Math.abs(entry - stop);
    set("qtyOut", fmt(qty));
    set("slOut", fmt(stop));
    set("tpOut", fmt(tp));
    set("rrOut", "1:2");
    set("lossOut", "$" + fmt(loss));
    set("profitOut", "$" + fmt(loss * 2));
  }
  function execPanel(px, atr, conf) {
    const sl = Math.max(0, px - 1.5 * atr);
    const tp = px + 2 * (px - sl);
    set("execEntry", "$" + fmt(px));
    set("execStop", "$" + fmt(sl));
    set("execTarget", "$" + fmt(tp));
    set("execRR", "1:2");
    set("execDur", "15m-4h");
    set("execConf", (conf || 50) + "%");
  }
  function strategyGrid() {
    const grid = $$("stratGrid");
    if (!grid) return;
    const data = [
      ["01","Gap Recovery","ACTIVE","84%","on-long"],
      ["02","Gap Exhaustion","INACTIVE","21%","off"],
      ["03","Trend Cross","ACTIVE","91%","on-long"],
      ["04","Death Cross","INACTIVE","14%","off"],
      ["05","BB Reversal Long","ACTIVE","73%","on-long"],
      ["06","BB Reversal Short","INACTIVE","27%","off"],
      ["07","Confluence Setup","ACTIVE","88%","on-conf"],
      ["08","Volatility Breakout","ACTIVE","69%","on-break"]
    ];
    grid.innerHTML = data.map(x =>
      '<div class="card pad" style="padding:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div style="font-family:var(--mono);font-size:24px;font-weight:900">' + x[0] + '</div>' +
          '<div class="chip ' + (x[2] === "ACTIVE" ? "on" : "off") + '"><span class="s"></span>' + x[2] + '</div></div>' +
        '<div style="font-weight:800;margin-top:6px">' + x[1] + '</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">Nivel de activaci\u00f3n</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">' +
          '<b>' + x[3] + '</b><span class="pill ' + (x[4].includes("short") ? "short" : "long") + '">' + x[4] + '</span></div>' +
        '<div class="bar" style="margin-top:10px"><i style="width:' + x[3] + '"></i></div></div>'
    ).join("");
  }
  function radar() {
    const svg = $$("radarSvg");
    if (!svg) return;
    const pts = [[180,18],[320,105],[280,205],[80,205],[40,105]];
    const labels = ["Trend","Momentum","Vol","Gap","Risk"];
    const vals = [
      Math.min(1, (s.price > s.ma200 ? 1 : 0.3)),
      Math.min(1, s.adx / 50),
      Math.min(1, s.bw / 8),
      Math.min(1, Math.abs(s.gap) / 8),
      Math.min(1, 1 - s.confluence / 5)
    ];
    let poly = "";
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const x = 180 + 110 * Math.cos(a) * vals[i];
      const y = 120 + 80 * Math.sin(a) * vals[i];
      poly += x + "," + y + " ";
    }
    svg.innerHTML =
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(88,166,255,.55)"/><stop offset="100%" stop-color="rgba(34,197,94,.1)"/></linearGradient></defs>' +
      '<polygon points="' + pts.map(p => p.join(",")).join(" ") + '" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)"/>' +
      '<polygon points="' + poly + '" fill="url(#g)" stroke="rgba(88,166,255,.9)" stroke-width="2"/>' +
      pts.map((p, i) =>
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#58A6FF"/>' +
        '<text x="' + p[0] + '" y="' + p[1] + 18 + '" fill="#94A3B8" text-anchor="middle" font-size="11">' + labels[i] + '</text>'
      ).join("");
  }
  function confluence() {
    const checks = [
      ["Trend Engine", s.price > s.ma200],
      ["Momentum Engine", s.adx > 25],
      ["Volatility Engine", s.bw > 3.5],
      ["Gap Engine", Math.abs(s.gap) > 1],
      ["Risk Engine", s.confluence >= 3]
    ];
    const mg = $$("matrixGrid");
    if (mg) {
      mg.innerHTML = checks.map(([n, v]) =>
        '<div class="box"><span class="muted">' + n + '</span><b style="color:' + (v ? "var(--bull)" : "var(--bear)") + '">' + (v ? "\u2714" : "\u2716") + '</b></div>'
      ).join("");
    }
    const mr = $$("matrixResult");
    if (mr) mr.textContent = checks.filter(x => x[1]).length + "/5 Motores alineados";
  }
  window.updateSonoMethod = function(sc) {
    if (sc) {
      s.price = sc.price || s.price;
      s.atr = sc.atr || s.atr;
      s.ma6 = sc.ma6 || s.ma6;
      s.ma40 = sc.ma40 || s.ma40;
      s.ma70 = sc.ma70 || s.ma70;
      s.ma200 = sc.ma200 || s.ma200;
      s.rsi = sc.rsi || s.rsi;
      s.adx = sc.adx || s.adx;
      s.pb = sc.pb ?? s.pb;
      s.bw = sc.bw ?? s.bw;
      s.gap = sc.gap ?? s.gap;
      s.score = sc.total || s.score;
    }
    const px = s.price;
    const sig = s.score >= 82 ? "STRONG LONG" : s.score >= 65 ? "LONG" : s.score >= 50 ? "NEUTRAL" : s.score >= 35 ? "SHORT" : "STRONG SHORT";
    const dot = $$("sonoDot");
    if (dot) dot.className = "dot " + (sig.includes("LONG") ? "bull" : sig.includes("SHORT") ? "bear" : "");
    set("sonoSignal", sig);
    set("sonoSub", "Decisi\u00f3n operativa basada en confluencias");
    set("sonoScore", s.score + "/100");
    set("sonoConf", Math.round(Math.min(95, 50 + s.score * 0.45)) + "%");
    set("sonoRisk", s.score >= 65 ? "Bajo" : s.score >= 50 ? "Medio" : "Alto");
    set("macroBias", px > s.ma200 ? "Bullish" : px < s.ma200 ? "Bearish" : "Neutral");
    set("microBias", s.ma6 > s.ma70 ? "Bullish" : "Bearish");
    set("momentumBias", s.adx > 25 ? "Active" : "Weak");
    set("volBias", s.bw > 5 ? "Expanding" : "Compressed");
    const trend = (px > s.ma200 ? 30 : 5) + (s.ma6 > s.ma70 ? 15 : 0) + (px > s.ma40 ? 10 : 0);
    const mom = (s.adx > 25 ? 15 : 8) + (s.rsi > 55 ? 10 : s.rsi < 30 ? 12 : 6);
    const vol = (s.pb < 0.2 ? 20 : s.pb > 0.8 ? 5 : 15) + (s.bw > 5 ? 10 : 8);
    const gapS = (s.gap > 5 ? 20 : s.gap > 2 ? 12 : 6);
    set("trendScore", trend + "/55");
    set("momScore", mom + "/35");
    set("volScore", vol + "/30");
    set("gapScore", gapS + "/20");
    const tb = $$("trendBar"); if (tb) tb.style.width = Math.min(100, trend / 55 * 100) + "%";
    const mb = $$("momBar"); if (mb) mb.style.width = Math.min(100, mom / 35 * 100) + "%";
    const vb = $$("volBar"); if (vb) vb.style.width = Math.min(100, vol / 30 * 100) + "%";
    const gb = $$("gapBar"); if (gb) gb.style.width = Math.min(100, gapS / 20 * 100) + "%";
    set("msTrend", px > s.ma200 ? "Bullish" : "Bearish");
    set("msMacro", px > s.ma200 ? "Long bias" : "Short bias");
    set("msMicro", s.ma6 > s.ma70 ? "Long" : "Short");
    set("msVol", s.bw > 5 ? "Expanding" : "Compressed");
    s.confluence = [px > s.ma200, s.ma6 > s.ma70, s.adx > 25, s.bw > 3.5, s.pb > 0.2 && s.pb < 0.8].filter(Boolean).length;
    set("sonoConfCount", s.confluence + "/5");
    confluence();
    execPanel(px, s.atr, Math.round(Math.min(95, 50 + s.score * 0.45)));
    strategyGrid();
    radar();
  };
  const calcBtn = $$("calcBtn");
  if (calcBtn) calcBtn.addEventListener("click", calcPosition);
  const liveBtn = $$("liveBtn");
  if (liveBtn) liveBtn.addEventListener("click", function () {
    const atrIn = $$("atrIn");
    const stopIn = $$("stopIn");
    if (atrIn) atrIn.value = s.atr;
    if (stopIn) stopIn.value = Math.max(0, s.price - 1.5 * s.atr);
    calcPosition();
  });
}`;

const lastCall = js.lastIndexOf("})();");
if (lastCall >= 0) {
  js = js.substring(0, lastCall) + "\n" + moduleBlock + "\n" + js.substring(lastCall);
} else {
  js += "\n" + moduleBlock;
}
console.log("E: modulo initSonoMethod insertado");

fs.writeFileSync(jsPath, js, "utf8");

// ======== VERIFICACION ========
console.log("\n=== VERIFICACION ===");
const hv = fs.readFileSync(htmlPath, "utf8");
const jv = fs.readFileSync(jsPath, "utf8");

console.log("HTML:");
console.log("  sonoSignal:", hv.includes("sonoSignal"));
console.log("  sonoScore:", hv.includes("sonoScore"));
console.log("  stratGrid:", hv.includes("stratGrid"));
console.log("  matrixGrid:", hv.includes("matrixGrid"));
console.log("  calcBtn:", hv.includes("calcBtn"));
console.log("  radarSvg:", hv.includes("radarSvg"));

console.log("\nJS:");
console.log("  initSonoMethod():", jv.includes("function initSonoMethod"));
console.log("  initSonoMethod();:", jv.includes("initSonoMethod();"));
console.log("  window.updateSonoMethod:", jv.includes("window.updateSonoMethod"));
const uc = (jv.match(/updateSonoMethod\(lastScore\)/g) || []).length;
console.log("  updateSonoMethod(lastScore):", uc, "veces");
console.log("  calcPosition:", jv.includes("calcPosition"));
console.log("  strategyGrid:", jv.includes("strategyGrid"));
console.log("  radar():", jv.includes("function radar"));
console.log("  confluence():", jv.includes("function confluence"));

const { execSync } = require("child_process");
try {
  execSync('node --check "' + jsPath + '"', { encoding: "utf8" });
  console.log("\n  node --check: OK");
} catch (e) {
  console.log("\n  node --check: FAIL -", e.stderr ? e.stderr.substring(0, 100) : "");
}
