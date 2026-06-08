/**
 * patch-ajram.js — SONO TERMINAL X
 * Añade el Módulo AJRAM completo a la página Método
 *
 * Ejecutar desde:
 *   C:\Users\sparreno\.openclaw\workspace\
 * Comando:
 *   node patch-ajram.js
 *
 * Qué hace:
 * 1. Parchea index.html → añade bloque Ajram en #page-metodo
 * 2. Parchea js/stx-core.js → añade initAjram() + hook en renderScore
 * 3. Commit + push
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE    = __dirname;
const htmlPath = path.join(BASE, 'indicador_cloudflare', 'index.html');
const jsPath   = path.join(BASE, 'indicador_cloudflare', 'js', 'stx-core.js');

// ── Verificar archivos ──────────────────────────────────
[htmlPath, jsPath].forEach(p => {
  if (!fs.existsSync(p)) {
    console.error('❌ No encontrado:', p);
    console.error('   Ejecuta desde C:\\Users\\sparreno\\.openclaw\\workspace\\');
    process.exit(1);
  }
});

let html = fs.readFileSync(htmlPath, 'utf8');
let js   = fs.readFileSync(jsPath,   'utf8');

console.log('📂 index.html:', html.length, 'bytes');
console.log('📂 stx-core.js:', js.length, 'bytes\n');

let htmlPatched = 0, jsPatched = 0;

// ══════════════════════════════════════════════════════
// HTML PATCH — Bloque Ajram mejorado en #page-metodo
// Se inserta ANTES del cierre del div de page-metodo
// ══════════════════════════════════════════════════════

const AJRAM_HTML = `

<!-- ═══ MÓDULO AJRAM ═══ -->
<div style="max-width:1400px;margin:0 auto;padding:0 1.4rem 1.4rem;display:flex;flex-direction:column;gap:14px">

  <!-- CSS Ajram inline para no depender del CSS global -->
  <style>
  .ajram-card{
    background:linear-gradient(135deg,rgba(15,23,42,.98),rgba(3,8,15,.99));
    border:1px solid rgba(0,212,160,.18);border-radius:16px;padding:1.2rem 1.4rem;
    position:relative;overflow:hidden;
  }
  .ajram-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,rgba(0,212,160,.5),transparent)}
  .ajram-header{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1rem;flex-wrap:wrap;gap:8px}
  .ajram-title-main{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;
    color:var(--teal,#00d4a0);letter-spacing:.06em;text-transform:uppercase}
  .ajram-signal-hero{
    display:flex;align-items:center;gap:12px;
    padding:.6rem 1.2rem;border-radius:999px;
    border:1px solid;font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700;
    letter-spacing:.08em;transition:all .4s;
  }
  .ajram-signal-hero.long{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.35);color:#22c55e}
  .ajram-signal-hero.short{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35);color:#ef4444}
  .ajram-signal-hero.neutral{background:rgba(100,116,139,.1);border-color:rgba(100,116,139,.2);color:#64748b}
  .ajram-signal-dot{width:8px;height:8px;border-radius:50%}
  .ajram-3col{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}
  .ajram-panel{
    background:rgba(15,25,40,.8);border:1px solid rgba(255,255,255,.07);
    border-radius:10px;padding:.8rem .9rem;
  }
  .ajram-panel-title{font-size:9px;font-weight:700;text-transform:uppercase;
    letter-spacing:.1em;color:var(--tx3,#4d6585);margin-bottom:.6rem;
    font-family:"JetBrains Mono",monospace}
  .ajram-row{display:flex;justify-content:space-between;align-items:center;
    padding:.22rem 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px}
  .ajram-row:last-child{border:none}
  .ajram-row span{color:var(--tx2,#8fa8c8)}
  .ajram-row strong{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700}
  .ajram-note{font-size:10px;color:var(--tx3,#4d6585);margin-top:.4rem;font-style:italic}
  /* 8 Estrategias */
  .estrategias-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:1rem}
  .est-card{
    background:rgba(10,20,35,.9);border:1px solid rgba(255,255,255,.07);
    border-radius:8px;padding:.65rem .8rem;transition:.2s;
  }
  .est-card:hover{border-color:rgba(255,255,255,.14);transform:translateY(-1px)}
  .est-num{font-size:20px;font-weight:700;font-family:"JetBrains Mono",monospace;
    color:rgba(255,255,255,.15);line-height:1;margin-bottom:.3rem}
  .est-name{font-size:11px;font-weight:600;margin-bottom:.2rem}
  .est-desc{font-size:10px;color:var(--tx3,#4d6585);line-height:1.4}
  .est-badge{display:inline-block;padding:1px 7px;border-radius:4px;font-size:10px;
    font-weight:700;margin-top:.3rem;font-family:"JetBrains Mono",monospace}
  .est-badge.long{background:rgba(34,197,94,.15);color:#22c55e}
  .est-badge.short{background:rgba(239,68,68,.15);color:#ef4444}
  .est-badge.conf{background:rgba(6,182,212,.15);color:#06b6d4}
  .est-badge.break{background:rgba(245,158,11,.15);color:#f59e0b}
  .est-status{width:8px;height:8px;border-radius:50%;margin-left:auto;margin-bottom:.3rem}
  /* Calculadora */
  .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:.8rem}
  .calc-grid label{display:flex;flex-direction:column;gap:4px;
    font-size:10px;color:var(--tx2,#8fa8c8);font-family:"JetBrains Mono",monospace}
  .calc-grid input{
    padding:6px 8px;background:rgba(15,30,52,.8);border:1px solid rgba(255,255,255,.1);
    border-radius:6px;color:var(--tx,#e8f1ff);font-family:"JetBrains Mono",monospace;
    font-size:12px;width:100%;
  }
  .calc-grid input:focus{outline:none;border-color:rgba(0,212,160,.4)}
  .calc-actions{display:flex;gap:8px;margin-bottom:.8rem}
  .btn-ajram-primary{
    padding:7px 18px;background:rgba(0,212,160,.15);border:1px solid rgba(0,212,160,.35);
    border-radius:7px;color:#00d4a0;font-family:"JetBrains Mono",monospace;
    font-size:12px;font-weight:700;cursor:pointer;transition:.15s;letter-spacing:.04em;
  }
  .btn-ajram-primary:hover{background:rgba(0,212,160,.25);transform:translateY(-1px)}
  .btn-ajram-ghost{
    padding:7px 18px;background:transparent;border:1px solid rgba(255,255,255,.1);
    border-radius:7px;color:var(--tx2,#8fa8c8);font-family:"JetBrains Mono",monospace;
    font-size:12px;cursor:pointer;transition:.15s;
  }
  .btn-ajram-ghost:hover{border-color:rgba(255,255,255,.2);color:var(--tx,#e8f1ff)}
  .calc-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .calc-result-grid>div{
    background:rgba(15,30,52,.7);border:1px solid rgba(255,255,255,.07);
    border-radius:7px;padding:.5rem .7rem;
  }
  .calc-result-grid span{display:block;font-size:9px;color:var(--tx3,#4d6585);
    text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;
    font-family:"JetBrains Mono",monospace}
  .calc-result-grid strong{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700}
  /* Reglas */
  .rules-list{list-style:none;display:flex;flex-direction:column;gap:5px}
  .rules-list li{
    padding:.4rem .8rem;background:rgba(15,25,40,.7);
    border:1px solid rgba(255,255,255,.06);border-radius:6px;
    font-size:11px;color:var(--tx2,#8fa8c8);
    padding-left:1.4rem;position:relative;
  }
  .rules-list li::before{content:"›";position:absolute;left:.6rem;
    color:var(--teal,#00d4a0);font-weight:700}
  @media(max-width:900px){.ajram-3col{grid-template-columns:1fr}.estrategias-grid{grid-template-columns:repeat(2,1fr)}.calc-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.estrategias-grid{grid-template-columns:1fr}.calc-result-grid{grid-template-columns:1fr 1fr}}
  </style>

  <!-- SEÑAL HERO + CABECERA -->
  <div class="ajram-card">
    <div class="ajram-header">
      <div>
        <div class="ajram-title-main">⚡ Método AJRAM · Integrado en SONO</div>
        <div style="font-size:10px;color:var(--tx3,#4d6585);margin-top:3px">Señales en tiempo real · datos Binance</div>
      </div>
      <div class="ajram-signal-hero neutral" id="ajram-signal-hero">
        <div class="ajram-signal-dot" id="ajram-signal-dot" style="background:#64748b"></div>
        <span id="ajram-signal-text">NEUTRAL</span>
        <span style="font-size:10px;opacity:.7" id="ajram-signal-sub">Sin sesgo</span>
      </div>
    </div>

    <!-- PILARES 3 columnas -->
    <div class="ajram-3col">
      <div class="ajram-panel">
        <div class="ajram-panel-title">📊 Pilar 1 · Medias Móviles</div>
        <div class="ajram-row"><span>MA6 × MA70</span><strong id="ajram-cross" style="color:#64748b">--</strong></div>
        <div class="ajram-row"><span>Precio vs MA40</span><strong id="ajram-vs-ma40" style="color:#64748b">--</strong></div>
        <div class="ajram-row"><span>Precio vs MA200</span><strong id="ajram-vs-ma200" style="color:#64748b">--</strong></div>
        <div class="ajram-row"><span>MA40</span><strong id="ajram-ma40">--</strong></div>
        <div class="ajram-row"><span>MA200</span><strong id="ajram-ma200">--</strong></div>
        <div class="ajram-note" id="ajram-cross-note">Esperando datos...</div>
      </div>
      <div class="ajram-panel">
        <div class="ajram-panel-title">📈 Pilar 2 · Gap + Momentum</div>
        <div class="ajram-row"><span>Gap vs cierre ant.</span><strong id="ajram-gap">--</strong></div>
        <div class="ajram-row"><span>Gap %</span><strong id="ajram-gap-pct">--</strong></div>
        <div class="ajram-row"><span>RSI 14</span><strong id="ajram-rsi">--</strong></div>
        <div class="ajram-row"><span>ADX 14</span><strong id="ajram-adx">--</strong></div>
        <div class="ajram-note" id="ajram-gap-note">Analizando apertura...</div>
      </div>
      <div class="ajram-panel">
        <div class="ajram-panel-title">📉 Pilar 3 · Bollinger</div>
        <div class="ajram-row"><span>%B</span><strong id="ajram-pb">--</strong></div>
        <div class="ajram-row"><span>Band Width</span><strong id="ajram-bw">--</strong></div>
        <div class="ajram-row"><span>ATR (14)</span><strong id="ajram-atr">--</strong></div>
        <div class="ajram-row"><span>Stop sugerido</span><strong id="ajram-stop-sug" style="color:#ef4444">--</strong></div>
        <div class="ajram-note" id="ajram-bb-note">Esperando bandas...</div>
      </div>
    </div>

    <!-- 8 ESTRATEGIAS AJRAM con estado live -->
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
      color:var(--tx3,#4d6585);margin-bottom:.6rem;font-family:'JetBrains Mono',monospace">
      8 Estrategias del Método Ajram · Estado live
    </div>
    <div class="estrategias-grid" id="ajram-estrategias">
      <div class="est-card" id="est-01">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">01</div>
          <div class="est-status" id="est-01-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Gap Bajista</div>
        <div class="est-desc">Apertura con hueco &gt;2%. Operar cierre del gap.</div>
        <span class="est-badge long">LONG</span>
      </div>
      <div class="est-card" id="est-02">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">02</div>
          <div class="est-status" id="est-02-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Gap Alcista</div>
        <div class="est-desc">Gap &gt;5%. Corrección probable. SHORT parcial.</div>
        <span class="est-badge short">SHORT</span>
      </div>
      <div class="est-card" id="est-03">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">03</div>
          <div class="est-status" id="est-03-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Cruce MA6×MA70</div>
        <div class="est-desc">MA6 cruza al alza MA70 con volumen.</div>
        <span class="est-badge long">LONG</span>
      </div>
      <div class="est-card" id="est-04">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">04</div>
          <div class="est-status" id="est-04-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Death Cross</div>
        <div class="est-desc">MA6 cruza a la baja MA70. Señal bajista.</div>
        <span class="est-badge short">SHORT</span>
      </div>
      <div class="est-card" id="est-05">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">05</div>
          <div class="est-status" id="est-05-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Bollinger Inferior</div>
        <div class="est-desc">RSI sobrevendido + toca banda inferior. Rebote.</div>
        <span class="est-badge long">LONG</span>
      </div>
      <div class="est-card" id="est-06">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">06</div>
          <div class="est-status" id="est-06-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Bollinger Superior</div>
        <div class="est-desc">RSI sobrecomprado + banda superior. Corrección.</div>
        <span class="est-badge short">SHORT</span>
      </div>
      <div class="est-card" id="est-07">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">07</div>
          <div class="est-status" id="est-07-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Gap + Cruce MA</div>
        <div class="est-desc">Confluencia gap + cruce de medias. Alta probabilidad.</div>
        <span class="est-badge conf">CONFLUENCIA</span>
      </div>
      <div class="est-card" id="est-08">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="est-num">08</div>
          <div class="est-status" id="est-08-dot" style="background:#2d3f55"></div>
        </div>
        <div class="est-name">Breakout de Rango</div>
        <div class="est-desc">Rotura de consolidación con volumen. Seguir tendencia.</div>
        <span class="est-badge break">BREAKOUT</span>
      </div>
    </div>

    <!-- CALCULADORA DE POSICIÓN -->
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
      color:var(--tx3,#4d6585);margin-bottom:.6rem;font-family:'JetBrains Mono',monospace">
      Calculadora de Posición · Gestión del Riesgo
    </div>
    <div class="calc-grid">
      <label>Capital Total ($)
        <input type="number" id="ajram-capital" value="10000" min="0" step="100">
      </label>
      <label>Precio de Entrada ($)
        <input type="number" id="ajram-entry" value="0" min="0" step="1">
      </label>
      <label>Stop Loss ($)
        <input type="number" id="ajram-stop" value="0" min="0" step="1">
      </label>
      <label>Riesgo por Trade (%)
        <input type="number" id="ajram-risk" value="1.5" min="0.1" max="5" step="0.1">
      </label>
    </div>
    <div class="calc-actions">
      <button class="btn-ajram-primary" id="ajram-calc-btn">Calcular posición</button>
      <button class="btn-ajram-ghost" id="ajram-use-live">Usar precio live + ATR stop</button>
      <button class="btn-ajram-ghost" id="ajram-reset-btn" style="margin-left:auto">Limpiar</button>
    </div>
    <div id="ajram-result" style="display:none">
      <div class="calc-result-grid">
        <div><span>Riesgo $</span><strong id="ajram-res-risk" style="color:#ef4444">$0</strong></div>
        <div><span>Cantidad BTC</span><strong id="ajram-res-qty">0</strong></div>
        <div><span>Tamaño posición</span><strong id="ajram-res-pos">$0</strong></div>
        <div><span>Apalancamiento</span><strong id="ajram-res-lev">0x</strong></div>
        <div><span>Stop distance</span><strong id="ajram-res-stopdist">0%</strong></div>
        <div><span>R:R estimado</span><strong id="ajram-res-rr" style="color:#22c55e">0</strong></div>
      </div>
    </div>

    <!-- REGLAS AJRAM -->
    <div style="margin-top:1rem;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
      color:var(--tx3,#4d6585);margin-bottom:.6rem;font-family:'JetBrains Mono',monospace">
      Mandatos del Método Ajram
    </div>
    <ul class="rules-list">
      <li>Operar solo intradía · sin posiciones overnight.</li>
      <li>MA200 como filtro de tendencia macro · no operar contra ella.</li>
      <li>Gap: buscar el cierre del hueco, nunca perseguir precio.</li>
      <li>Bollinger: rebote solo si el sesgo MA no contradice la tendencia.</li>
      <li>Stop obligatorio siempre · riesgo por trade máximo 2%.</li>
      <li>1-3 trades por día · más operaciones = más errores.</li>
      <li>Sin operar los primeros 30 minutos de apertura (volatilidad caótica).</li>
      <li>Journal obligatorio · anotar entrada, stop, razón y resultado.</li>
    </ul>
  </div>
</div>
<!-- ═══ FIN MÓDULO AJRAM ═══ -->
`;

// Insertar en page-metodo antes de su cierre
if (html.includes('id="page-metodo"')) {
  if (html.includes('ajram-card') || html.includes('ajram-signal-hero')) {
    console.log('✅ HTML P1: Bloque Ajram ya existe en el HTML');
  } else {
    // Encontrar el cierre de page-metodo
    const marker = '</div><!-- /page-metodo -->';
    const markerAlt = 'id="page-rangos"';

    if (html.includes(marker)) {
      html = html.replace(marker, AJRAM_HTML + marker);
      console.log('✅ HTML P1 APLICADO: Bloque Ajram insertado en page-metodo');
      htmlPatched++;
    } else {
      // Insertar antes de page-rangos
      html = html.replace(
        '<div class="page" id="page-rangos">',
        AJRAM_HTML + '<div class="page" id="page-rangos">'
      );
      console.log('✅ HTML P1 APLICADO: Bloque Ajram insertado (antes de page-rangos)');
      htmlPatched++;
    }
  }
} else {
  console.log('⚠️  HTML P1: #page-metodo no encontrado en el HTML');
}

// ══════════════════════════════════════════════════════
// JS PATCH — initAjram() completa mejorada
// ══════════════════════════════════════════════════════

const AJRAM_JS = `

/* ════════════════════════════════════════════
   MÓDULO AJRAM — integrado en SONO TERMINAL X
   Lee de: livePx, lastScore (ma6,ma40,ma70,ma200,pb,bw,rv,av)
   Expone: window.updateAjramFromSONO()
════════════════════════════════════════════ */
function initAjram() {
  const g  = id => document.getElementById(id);
  const fmt = (n, d=2) => Number.isFinite(n) ? n.toFixed(d) : '--';
  const fmtUSD = n => Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '--';
  const fmtMoney = n => Number.isFinite(n) ? '$' + n.toFixed(2) : '$0';

  // ── Estrategias con estado live ──────────────────
  function setEstStatus(id, active, color) {
    const dot = g('est-' + id + '-dot');
    if (!dot) return;
    dot.style.background  = active ? color  : '#2d3f55';
    dot.style.boxShadow   = active ? ('0 0 8px ' + color) : 'none';
    const card = g('est-' + id);
    if (card) {
      card.style.borderColor = active ? (color + '55') : 'rgba(255,255,255,.07)';
      card.style.background  = active ? ('rgba(' + (color==='#22c55e'?'34,197,94':'239,68,68') + ',.04)') : '';
    }
  }

  // ── Señal hero badge ─────────────────────────────
  function setSignal(signal, sub, color, cls) {
    const hero  = g('ajram-signal-hero');
    const dot   = g('ajram-signal-dot');
    const txt   = g('ajram-signal-text');
    const subEl = g('ajram-signal-sub');
    if (!hero) return;
    hero.className = 'ajram-signal-hero ' + cls;
    if (dot)   { dot.style.background = color; if(cls!=='neutral') dot.style.animation='pulse-dot 2s infinite'; }
    if (txt)   txt.textContent = signal;
    if (subEl) subEl.textContent = sub;
  }

  // ── Actualizar desde datos SONO ──────────────────
  function updateAjram() {
    // Obtener datos del motor SONO
    const sc  = window.lastScore;
    const px  = (typeof livePx !== 'undefined') ? Number(livePx) : 0;
    if (!sc || !px) return;

    const ma6   = sc.ma6   ?? null;
    const ma40  = sc.ma40  ?? null;
    const ma70  = sc.ma70  ?? null;
    const ma200 = sc.ma200 ?? null;
    const pb    = sc.pb    ?? null;
    const bw    = sc.bw    ?? null;
    const rv    = sc.rv    ?? null;  // RSI
    const av    = sc.av    ?? null;  // ADX

    // ── Pilar 1: MAs ────────────────────────────────
    const crossBull = ma6 && ma70 && ma6 > ma70;
    const crossBear = ma6 && ma70 && ma6 < ma70;
    const vsMA40    = ma40  ? ((px - ma40)  / ma40  * 100) : null;
    const vsMA200   = ma200 ? ((px - ma200) / ma200 * 100) : null;

    const crossEl = g('ajram-cross');
    if (crossEl) {
      crossEl.textContent = ma6 && ma70 ? (crossBull ? '↑ LONG' : '↓ SHORT') : '--';
      crossEl.style.color = crossBull ? '#22c55e' : crossBear ? '#ef4444' : '#64748b';
    }
    const vs40El = g('ajram-vs-ma40');
    if (vs40El) {
      vs40El.textContent = vsMA40 ? (vsMA40>=0?'+':'')+vsMA40.toFixed(2)+'%' : '--';
      vs40El.style.color = vsMA40==null?'#64748b':vsMA40>=0?'#22c55e':'#ef4444';
    }
    const vs200El = g('ajram-vs-ma200');
    if (vs200El) {
      vs200El.textContent = vsMA200 ? (vsMA200>=0?'+':'')+vsMA200.toFixed(2)+'%' : '--';
      vs200El.style.color = vsMA200==null?'#64748b':vsMA200>=0?'#22c55e':'#ef4444';
    }
    const m40v = g('ajram-ma40'); if(m40v) m40v.textContent = fmtUSD(ma40);
    const m200v = g('ajram-ma200'); if(m200v) m200v.textContent = fmtUSD(ma200);
    const cnote = g('ajram-cross-note');
    if (cnote) cnote.textContent = ma6&&ma70 ? 'MA6='+fmtUSD(ma6)+' · MA70='+fmtUSD(ma70) : 'Sin datos suficientes';

    // ── Pilar 2: RSI + ADX (Gap necesita velas del día) ─
    const rsiEl = g('ajram-rsi');
    if (rsiEl) { rsiEl.textContent = rv!=null?rv:'--'; rsiEl.style.color=rv<30?'#22c55e':rv>70?'#ef4444':'#8fa8c8'; }
    const adxEl = g('ajram-adx');
    if (adxEl) { adxEl.textContent = av!=null?av:'--'; adxEl.style.color=av>25?'#22c55e':'#64748b'; }

    // Gap: usar High24h y Low24h si están disponibles en el DOM
    const h24El = document.getElementById('h24');
    const l24El = document.getElementById('l24');
    const h24 = h24El ? parseFloat(h24El.textContent.replace(/[$,]/g,'')) : null;
    const l24 = l24El ? parseFloat(l24El.textContent.replace(/[$,]/g,'')) : null;
    let gapPct = null;
    if (h24 && l24 && px) {
      // Estimación gap: distancia del precio al high del día
      gapPct = ((px - l24) / (h24 - l24) * 100); // posición dentro del rango
    }
    const gapEl = g('ajram-gap');
    const gapPctEl = g('ajram-gap-pct');
    const gapNote = g('ajram-gap-note');
    if (gapEl) gapEl.textContent = h24&&l24 ? (px>h24*0.99?'ZONA ALTA':px<l24*1.01?'ZONA BAJA':'ZONA MEDIA') : '--';
    if (gapPctEl) gapPctEl.textContent = gapPct!=null ? gapPct.toFixed(1)+'% del rango' : '--';
    if (gapNote) gapNote.textContent = h24&&l24 ? 'H24: '+fmtUSD(h24)+' · L24: '+fmtUSD(l24) : 'Sin datos H/L 24h';

    // ── Pilar 3: Bollinger + ATR ─────────────────────
    const pbEl = g('ajram-pb');
    if (pbEl) { pbEl.textContent = pb!=null?fmt(pb,3):'--'; pbEl.style.color=pb<0.2?'#22c55e':pb>0.8?'#ef4444':'#8fa8c8'; }
    const bwEl = g('ajram-bw');
    if (bwEl) { bwEl.textContent = bw!=null?fmt(bw,2)+'%':'--'; }

    // ATR desde el DOM del dashboard
    const atrDomEl = document.getElementById('atrEl');
    const atrVal = atrDomEl ? parseFloat(atrDomEl.textContent.replace(/[$,]/g,'')) : null;
    const atrEl = g('ajram-atr');
    if (atrEl) atrEl.textContent = atrVal ? fmtUSD(atrVal) : '--';

    // Stop sugerido = precio - 1.5 × ATR
    const stopSug = g('ajram-stop-sug');
    if (stopSug && atrVal && px) {
      const sugStop = Math.round(px - 1.5 * atrVal);
      stopSug.textContent = fmtUSD(sugStop);
    }
    const bbNote = g('ajram-bb-note');
    if (bbNote) bbNote.textContent = pb!=null?'%B='+fmt(pb,3)+' · BW='+fmt(bw,2)+'%':'Sin datos de bandas';

    // ── ESTADO DE LAS 8 ESTRATEGIAS ─────────────────
    // Est 01: Gap Bajista (precio cerca de L24, sesgo alcista)
    const est01 = gapPct!=null&&gapPct<20&&crossBull;
    setEstStatus('01', est01, '#22c55e');

    // Est 02: Gap Alcista (precio cerca de H24, sesgo bajista)
    const est02 = gapPct!=null&&gapPct>80&&crossBear;
    setEstStatus('02', est02, '#ef4444');

    // Est 03: Cruce MA6×MA70 alcista activo
    setEstStatus('03', crossBull && av!=null && av>20, '#22c55e');

    // Est 04: Death Cross activo
    setEstStatus('04', crossBear && av!=null && av>20, '#ef4444');

    // Est 05: Bollinger inferior (sobreventa + sesgo alcista)
    const est05 = pb!=null&&pb<0.2&&rv!=null&&rv<35&&(!ma200||px>=ma200*0.99);
    setEstStatus('05', est05, '#22c55e');

    // Est 06: Bollinger superior (sobrecompra + sesgo bajista)
    const est06 = pb!=null&&pb>0.8&&rv!=null&&rv>65&&(!ma200||px<=ma200*1.01);
    setEstStatus('06', est06, '#ef4444');

    // Est 07: Confluencia Gap + MA (solo si hay H/L y MA activa)
    const est07 = (est01||est02)&&(crossBull||crossBear);
    setEstStatus('07', est07, '#06b6d4');

    // Est 08: Breakout (precio cerca de extremo del rango con ADX fuerte)
    const est08 = av!=null&&av>30&&gapPct!=null&&(gapPct>85||gapPct<15);
    setEstStatus('08', est08, '#f59e0b');

    // ── SEÑAL AJRAM FINAL ────────────────────────────
    const bullish = ma200 && px > ma200 && crossBull;
    const bearish = ma200 && px < ma200 && crossBear;
    const longBoll = pb!=null&&pb<0.2&&rv!=null&&rv<35&&ma200&&px>=ma200;
    const shortBoll= pb!=null&&pb>0.8&&rv!=null&&rv>65&&ma200&&px<=ma200;

    if (bullish) {
      setSignal('LONG', 'MA200 + MA6>MA70 + Precio alcista', '#22c55e', 'long');
    } else if (bearish) {
      setSignal('SHORT', 'MA200 + MA6<MA70 + Precio bajista', '#ef4444', 'short');
    } else if (longBoll) {
      setSignal('LONG BOLLINGER', 'Sobreventa BB + sesgo alcista', '#06b6d4', 'long');
    } else if (shortBoll) {
      setSignal('SHORT BOLLINGER', 'Sobrecompra BB + sesgo bajista', '#f59e0b', 'short');
    } else {
      setSignal('NEUTRAL', 'Sin confluencia clara · esperar', '#64748b', 'neutral');
    }

    // ── Pre-rellenar entrada con precio live ─────────
    const entryInput = g('ajram-entry');
    if (entryInput && (!entryInput.value || entryInput.value === '0') && px > 0) {
      entryInput.value = Math.round(px);
    }
  }

  // ── Calculadora ──────────────────────────────────
  function calcPosition() {
    const capital  = parseFloat(g('ajram-capital')?.value) || 0;
    const entry    = parseFloat(g('ajram-entry')?.value) || 0;
    const stopLoss = parseFloat(g('ajram-stop')?.value) || 0;
    let   riskPct  = parseFloat(g('ajram-risk')?.value) || 1.5;
    riskPct = Math.min(Math.max(riskPct, 0.1), 5);

    if (!capital || !entry || !stopLoss || entry === stopLoss) return;

    const riskUSD  = capital * (riskPct / 100);
    const stopDist = Math.abs(entry - stopLoss);
    const stopPct  = (stopDist / entry) * 100;
    const qty      = riskUSD / stopDist;
    const pos      = qty * entry;
    const lev      = pos / capital;
    const target   = entry + 2 * stopDist * (entry > stopLoss ? 1 : -1);
    const rr       = (Math.abs(target - entry) / stopDist).toFixed(2);

    const set = (id, v) => { const e=g(id); if(e) e.textContent=v; };
    set('ajram-res-risk',     '$' + riskUSD.toFixed(2));
    set('ajram-res-qty',      qty.toFixed(6));
    set('ajram-res-pos',      '$' + pos.toFixed(2));
    set('ajram-res-lev',      lev.toFixed(2) + 'x');
    set('ajram-res-stopdist', stopPct.toFixed(2) + '%');
    set('ajram-res-rr',       '1:' + rr + ' R');

    const r = g('ajram-result');
    if (r) r.style.display = 'block';
  }

  // ── Eventos ──────────────────────────────────────
  const calcBtn = g('ajram-calc-btn');
  if (calcBtn) calcBtn.addEventListener('click', calcPosition);

  const liveBtn = g('ajram-use-live');
  if (liveBtn) liveBtn.addEventListener('click', () => {
    const px = (typeof livePx !== 'undefined' && livePx > 0) ? Math.round(livePx) : 0;
    const sc = window.lastScore;
    const atrDomEl = document.getElementById('atrEl');
    const atrVal = atrDomEl ? parseFloat(atrDomEl.textContent.replace(/[$,]/g,'')) : null;

    if (px) {
      const entryEl = g('ajram-entry'); if(entryEl) entryEl.value = px;
      const stopEl  = g('ajram-stop');
      if (stopEl) {
        // Stop = precio - 1.5 × ATR (si disponible) o -1.5%
        const sugStop = atrVal ? Math.round(px - 1.5*atrVal) : Math.round(px * 0.985);
        stopEl.value = sugStop;
      }
      calcPosition();
    }
  });

  const resetBtn = g('ajram-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    ['ajram-capital','ajram-entry','ajram-stop','ajram-risk'].forEach(id=>{
      const e=g(id); if(e){if(id==='ajram-capital')e.value='10000';else if(id==='ajram-risk')e.value='1.5';else e.value='0';}
    });
    const r=g('ajram-result'); if(r) r.style.display='none';
  });

  ['ajram-capital','ajram-entry','ajram-stop','ajram-risk'].forEach(id => {
    const el = g(id);
    if (el) el.addEventListener('input', calcPosition);
  });

  // Exponer para que el motor SONO lo llame
  window.updateAjramFromSONO = updateAjram;
}
/* ════ FIN MÓDULO AJRAM ════ */

`;

if (js.includes('initAjram') || js.includes('updateAjramFromSONO')) {
  console.log('✅ JS P1: initAjram ya existe en el JS');
} else {
  // Insertar antes del init()
  const initMarker = '(async function init()';
  if (js.includes(initMarker)) {
    js = js.replace(initMarker, AJRAM_JS + initMarker);
    console.log('✅ JS P1 APLICADO: initAjram() insertada');
    jsPatched++;
  } else {
    // Al final del archivo
    js = js + AJRAM_JS;
    console.log('✅ JS P1 APLICADO: initAjram() añadida al final');
    jsPatched++;
  }
}

// Asegurarse de que window.lastScore se expone en renderScore
if (js.includes('window.lastScore') || js.includes('lastScore=sc') || js.includes('lastScore = sc')) {
  console.log('✅ JS P2: window.lastScore ya se expone');
} else {
  // Añadir window.lastScore en renderScore
  js = js.replace('lastScore = sc;', 'lastScore = sc;\n  window.lastScore = sc;');
  if (js.includes('window.lastScore = sc;')) {
    console.log('✅ JS P2 APLICADO: window.lastScore expuesto');
    jsPatched++;
  } else {
    console.log('⚠️  JS P2: No se pudo añadir window.lastScore (verificar manualmente)');
  }
}

// Hook initAjram() en init()
if (js.includes('initAjram()')) {
  console.log('✅ JS P3: initAjram() ya se llama en init()');
} else {
  // Añadir llamada después de loadTrades()
  const hookTarget = js.includes('loadTrades();') ? 'loadTrades();' : null;
  if (hookTarget) {
    js = js.replace(hookTarget, hookTarget + '\n  initAjram();');
    console.log('✅ JS P3 APLICADO: initAjram() llamado desde init()');
    jsPatched++;
  }
}

// Hook updateAjramFromSONO en refreshIndicators
if (js.includes('updateAjramFromSONO')) {
  console.log('✅ JS P4: updateAjramFromSONO ya está en el flujo');
} else {
  // Añadir al final de refreshIndicators, antes del catch
  if (js.includes("addLog('IND',T,")) {
    js = js.replace(
      "addLog('IND',T,",
      "if(window.updateAjramFromSONO) window.updateAjramFromSONO();\n    addLog('IND',T,"
    );
    console.log('✅ JS P4 APLICADO: updateAjramFromSONO hook en refreshIndicators');
    jsPatched++;
  }
}

// ══════════════════════════════════════════════════════
// VERIFICACIONES
// ══════════════════════════════════════════════════════
console.log('\n══ RESUMEN ══');
console.log('HTML patches:', htmlPatched);
console.log('JS patches:', jsPatched);
console.log('index.html final:', html.length, 'bytes');
console.log('stx-core.js final:', js.length, 'bytes');

const htmlOk = html.includes('ajram-signal-hero') && html.includes('ajram-calc-btn');
const jsOk   = js.includes('initAjram') && js.includes('updateAjram') && js.includes('tradesFullTbody');

console.log('\nChecks:');
console.log(htmlOk?'✅':'❌', 'HTML contiene bloque Ajram');
console.log(jsOk ?'✅':'❌', 'JS contiene initAjram + updateAjram');

if (!htmlOk || !jsOk) {
  console.error('\n❌ Checks fallaron. Revisar manualmente.');
  process.exit(1);
}

// ══════════════════════════════════════════════════════
// ESCRIBIR + COMMIT
// ══════════════════════════════════════════════════════
fs.writeFileSync(htmlPath, html, 'utf8');
fs.writeFileSync(jsPath, js, 'utf8');
console.log('\n✅ Archivos escritos');

try {
  execSync('git add indicador_cloudflare/index.html indicador_cloudflare/js/stx-core.js', { stdio:'inherit', cwd: BASE });
  execSync('git commit -m "feat: Módulo AJRAM en página Método - 8 estrategias live + calculadora"', { stdio:'inherit', cwd: BASE });
  execSync('git push origin main', { stdio:'inherit', cwd: BASE });
  console.log('✅ Commit y push realizados');
} catch(e) {
  console.error('\n⚠️  Git error:', e.message);
  console.log('Ejecuta manualmente:');
  console.log('  git add indicador_cloudflare/index.html indicador_cloudflare/js/stx-core.js');
  console.log('  git commit -m "feat: Módulo AJRAM en página Método"');
  console.log('  git push origin main');
}

console.log('\n══ POST-DEPLOY ══');
console.log('1. Espera 3 min → Ctrl+Shift+R en el navegador');
console.log('2. Ve a la página Método');
console.log('3. Debe aparecer: señal AJRAM hero + 8 estrategias + calculadora');
console.log('4. Las 8 estrategias deben tener puntos de color cuando están activas');
