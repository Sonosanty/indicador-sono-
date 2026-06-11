const fs = require("fs");
const { execSync } = require("child_process");

const htmlPath = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html";
const jsPath = "C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js";

let html = fs.readFileSync(htmlPath, "utf8");
let js = fs.readFileSync(jsPath, "utf8");

// ==========================================
// 1. HTML: CSS + page-metodo
// ==========================================
const concept = fs.readFileSync(
  "C:/Users/sparreno/AppData/Local/Temp/sono_method_concept_latest.html",
  "utf8"
);
const conceptStyle = concept.substring(concept.indexOf("<style>"), concept.indexOf("</style>") + 8);
const bodyStart = concept.indexOf("<body>") + 6;
const bodyEnd = concept.indexOf("</body>");
const conceptBody = concept.substring(bodyStart, bodyEnd).trim();
const lastScript = conceptBody.lastIndexOf("<script>");
const conceptClean = lastScript >= 0 ? conceptBody.substring(0, lastScript) : conceptBody;

// CSS en head
const headClose = html.indexOf("</head>");
html = html.substring(0, headClose) + "\n" + conceptStyle + "\n" + html.substring(headClose);

// Page-metodo
const metIdx = html.lastIndexOf("page-metodo");
const pageOpen = html.lastIndexOf('<div class="page"', metIdx);
const tradesComment = html.lastIndexOf("<!--", html.indexOf("page-trades", metIdx) - 10);
html = html.substring(0, pageOpen) + '<div class="page" id="page-metodo">\n' + conceptClean + "\n</div>" + html.substring(tradesComment);
fs.writeFileSync(htmlPath, html, "utf8");
console.log("1. HTML listo");

// ==========================================
// 2. JS: initSonoMethod() DENTRO de init()
// ==========================================
// Buscar la funcion init() y el primer { despues de "function init(){"
const initIdx = js.indexOf("(async function init(){");
const initFnStart = initIdx + "(async function init(){".length - 1;

// Debug: show context
console.log("init() body starts at char:", initFnStart);
console.log("context:", js.substring(initFnStart, initFnStart + 50));

// Primera linea de init() es "console.log" - insertar DESPUES de esa linea
const firstLineEnd = js.indexOf("\n", initFnStart);
js = js.substring(0, firstLineEnd + 1) + "  initSonoMethod();\n" + js.substring(firstLineEnd + 1);
console.log("2. initSonoMethod() en init()");

// ==========================================
// 3. updateSonoMethod en loadTicker
// ==========================================
const target = "const sc=computeScore(cl,hi,lo);lastScore=sc;";
if (js.includes(target)) {
  js = js.replace(target, "const sc=computeScore(cl,hi,lo);lastScore=sc;if(window.updateSonoMethod)window.updateSonoMethod(lastScore);");
  console.log("3. updateSonoMethod en loadTicker");
}

// ==========================================
// 4. updateSonoMethod en renderScore
// ==========================================
const rsIdx = js.indexOf("function renderScore(sc)");
const rsBodyStart = js.indexOf("{", rsIdx) + 1;
const rsClose = js.indexOf("function", rsIdx + 5);
const lastRsBrace = js.lastIndexOf("}", rsClose > rsIdx ? rsClose : rsIdx + 2000);
if (lastRsBrace > rsBodyStart) {
  js = js.substring(0, lastRsBrace) + '\n  if (window.updateSonoMethod) window.updateSonoMethod(lastScore);\n' + js.substring(lastRsBrace);
  console.log("4. updateSonoMethod en renderScore");
}

// ==========================================
// 5. MODULO COMPLETO (UNA VEZ)
// ==========================================
const moduleCode = `
/* S O N O   M E T H O D (tm)   M O D U L E */
function initSonoMethod() {
  const $$ = id => document.getElementById(id);
  const fmt = n => Number.isFinite(n) ? n.toLocaleString("en-US", {maximumFractionDigits: 2}) : "--";
  const set = (id, v) => { const e = $$(id); if (e) e.textContent = v; };
  const s = { price:0, atr:0, ma6:0, ma40:0, ma70:0, ma200:0, rsi:0, adx:0, pb:0, bw:0, gap:0, score:0, confidence:0, confluence:0 };
  function calcPosition() {
    const cap = +($$("capIn")?.value||0), risk = (+($$("riskIn")?.value||0))/100, atr = +($$("atrIn")?.value||s.atr||0);
    const stop = +($$("stopIn")?.value||Math.max(0,s.price-1.5*atr)), entry = s.price;
    const loss = cap*risk, qty = loss/Math.max(1e-9,Math.abs(entry-stop)), tp = entry+2*Math.abs(entry-stop);
    set("qtyOut",fmt(qty)); set("slOut",fmt(stop)); set("tpOut",fmt(tp)); set("rrOut","1:2"); set("lossOut","$"+fmt(loss)); set("profitOut","$"+fmt(loss*2));
  }
  function execPanel(px, atr, conf) {
    const sl = Math.max(0,px-1.5*atr), tp = px+2*(px-sl);
    set("execEntry","$"+fmt(px)); set("execStop","$"+fmt(sl)); set("execTarget","$"+fmt(tp)); set("execRR","1:2"); set("execDur","15m-4h"); set("execConf",(conf||50)+"%");
  }
  function strategyGrid() {
    const grid = $$("stratGrid"); if(!grid) return;
    const d = [["01","Gap Recovery","ACTIVE","84%","on-long"],["02","Gap Exhaustion","INACTIVE","21%","off"],["03","Trend Cross","ACTIVE","91%","on-long"],["04","Death Cross","INACTIVE","14%","off"],["05","BB Reversal Long","ACTIVE","73%","on-long"],["06","BB Reversal Short","INACTIVE","27%","off"],["07","Confluence Setup","ACTIVE","88%","on-conf"],["08","Volatility Breakout","ACTIVE","69%","on-break"]];
    grid.innerHTML = d.map(x => '<div class="card pad" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-family:var(--mono);font-size:24px;font-weight:900">'+x[0]+'</div><div class="chip '+(x[2]==="ACTIVE"?"on":"off")+'"><span class="s"></span>'+x[2]+'</div></div><div style="font-weight:800;margin-top:6px">'+x[1]+'</div><div class="muted" style="font-size:12px;margin-top:6px">Nivel de activaci\u00f3n</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px"><b>'+x[3]+'</b><span class="pill '+(x[4].includes("short")?"short":"long")+'">'+x[4]+'</span></div><div class="bar" style="margin-top:10px"><i style="width:'+x[3]+'"></i></div></div>').join("");
  }
  function radar() {
    const svg = $$("radarSvg"); if(!svg) return;
    const pts=[[180,18],[320,105],[280,205],[80,205],[40,105]], labels=["Trend","Momentum","Vol","Gap","Risk"];
    const vals=[Math.min(1,s.price>s.ma200?1:.3),Math.min(1,s.adx/50),Math.min(1,s.bw/8),Math.min(1,Math.abs(s.gap)/8),Math.min(1,1-s.confluence/5)];
    let poly=""; for(let i=0;i<5;i++){const a=(Math.PI*2/5)*i-Math.PI/2; poly+=(180+110*Math.cos(a)*vals[i])+","+(120+80*Math.sin(a)*vals[i])+" ";}
    svg.innerHTML='<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(88,166,255,.55)"/><stop offset="100%" stop-color="rgba(34,197,94,.1)"/></linearGradient></defs><polygon points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.08)"/><polygon points="'+poly+'" fill="url(#g)" stroke="rgba(88,166,255,.9)" stroke-width="2"/>'+pts.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#58A6FF"/><text x="'+p[0]+'" y="'+(p[1]+18)+'" fill="#94A3B8" text-anchor="middle" font-size="11">'+labels[i]+'</text>').join("");
  }
  function confluence() {
    const checks=[["Trend Engine",s.price>s.ma200],["Momentum Engine",s.adx>25],["Volatility Engine",s.bw>3.5],["Gap Engine",Math.abs(s.gap)>1],["Risk Engine",s.confluence>=3]];
    const mg=$$("matrixGrid"); if(mg) mg.innerHTML=checks.map(([n,v]) => '<div class="box"><span class="muted">'+n+'</span><b style="color:'+(v?"var(--bull)":"var(--bear)")+'">'+(v?"\u2714":"\u2716")+'</b></div>').join("");
    const mr=$$("matrixResult"); if(mr) mr.textContent=checks.filter(x=>x[1]).length+"/5 Motores alineados";
  }
  window.updateSonoMethod = function(sc) {
    if(sc){ Object.assign(s, sc); s.score = sc.total || s.score; }
    const px = s.price;
    const sig = s.score>=82?"STRONG LONG":s.score>=65?"LONG":s.score>=50?"NEUTRAL":s.score>=35?"SHORT":"STRONG SHORT";
    const dot=$$("sonoDot"); if(dot) dot.className="dot "+(sig.includes("LONG")?"bull":sig.includes("SHORT")?"bear":"");
    set("sonoSignal",sig); set("sonoSub","Decisi\u00f3n operativa basada en confluencias");
    set("sonoScore",s.score+"/100"); set("sonoConf",Math.round(Math.min(95,50+s.score*0.45))+"%");
    set("sonoRisk",s.score>=65?"Bajo":s.score>=50?"Medio":"Alto");
    set("macroBias",px>s.ma200?"Bullish":px<s.ma200?"Bearish":"Neutral"); set("microBias",s.ma6>s.ma70?"Bullish":"Bearish");
    set("momentumBias",s.adx>25?"Active":"Weak"); set("volBias",s.bw>5?"Expanding":"Compressed");
    const trend=(px>s.ma200?30:5)+(s.ma6>s.ma70?15:0)+(px>s.ma40?10:0);
    const mom=(s.adx>25?15:8)+(s.rsi>55?10:s.rsi<30?12:6);
    const vol=(s.pb<0.2?20:s.pb>0.8?5:15)+(s.bw>5?10:8);
    const gapS=(s.gap>5?20:s.gap>2?12:6);
    set("trendScore",trend+"/55"); set("momScore",mom+"/35"); set("volScore",vol+"/30"); set("gapScore",gapS+"/20");
    const tb=$$("trendBar"); if(tb)tb.style.width=Math.min(100,trend/55*100)+"%";
    const mb=$$("momBar"); if(mb)mb.style.width=Math.min(100,mom/35*100)+"%";
    const vb=$$("volBar"); if(vb)vb.style.width=Math.min(100,vol/30*100)+"%";
    const gb=$$("gapBar"); if(gb)gb.style.width=Math.min(100,gapS/20*100)+"%";
    set("msTrend",px>s.ma200?"Bullish":"Bearish"); set("msMacro",px>s.ma200?"Long bias":"Short bias");
    set("msMicro",s.ma6>s.ma70?"Long":"Short"); set("msVol",s.bw>5?"Expanding":"Compressed");
    s.confluence=[px>s.ma200,s.ma6>s.ma70,s.adx>25,s.bw>3.5,s.pb>0.2&&s.pb<0.8].filter(Boolean).length;
    set("sonoConfCount",s.confluence+"/5");
    confluence(); execPanel(px,s.atr,Math.round(Math.min(95,50+s.score*0.45))); strategyGrid(); radar();
  };
  const calcBtn=$$("calcBtn"); if(calcBtn)calcBtn.addEventListener("click",calcPosition);
  const liveBtn=$$("liveBtn"); if(liveBtn)liveBtn.addEventListener("click",function(){const ai=$$("atrIn");const si=$$("stopIn");if(ai)ai.value=s.atr;if(si)si.value=Math.max(0,s.price-1.5*s.atr);calcPosition();});
}
`;

const lastCall = js.lastIndexOf("})();");
js = js.substring(0, lastCall) + "\n" + moduleCode + "\n" + js.substring(lastCall);
fs.writeFileSync(jsPath, js, "utf8");
console.log("5. Modulo SONO METHOD insertado");

// ==========================================
// VERIFICACION    
// ==========================================
const jv = fs.readFileSync(jsPath, "utf8");
console.log("\n=== VERIFICACION ===");
console.log("initSonoMethod count:", (jv.match(/function initSonoMethod/g)||[]).length, "(debe ser 1)");
console.log("window.updateSonoMethod:", jv.includes("window.updateSonoMethod = function"));
console.log("updateSonoMethod(lastScore):", (jv.match(/updateSonoMethod\(lastScore\)/g)||[]).length);
console.log("initSonoMethod();:", jv.includes("initSonoMethod();"));

try { execSync('node --check "'+jsPath+'"', { encoding: "utf8" }); console.log("node --check: OK"); }
catch(e) { console.log("node --check: FAIL -", e.stderr ? e.stderr.substring(0,120) : ""); }
