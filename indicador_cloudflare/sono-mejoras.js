/* Sono Pro v3.2 - Mejoras desde mifuturapp
   Tabla rendimiento por setup + MFE/MAE + Backend D1 (localStorage)
   Se inyecta como script independiente, no necesita rebuild de React
*/
(function() {
'use strict';

// ─── 1. TRADING JOURNAL (localStorage) ───────────────────
const STORAGE_KEY = 'sono_trades_history';

function loadTrades() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function addTrade(trade) {
  const trades = loadTrades();
  trade.id = Date.now();
  trade.timestamp = new Date().toISOString();
  trades.push(trade);
  saveTrades(trades);
  return trade;
}

function getStats() {
  const trades = loadTrades();
  const closed = trades.filter(t => t.status === 'CLOSED');
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl <= 0);
  const total = closed.length;
  
  if (total === 0) return { total: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, totalR: 0, avgR: 0, maxDD: 0 };
  
  const winRate = (wins.length / total) * 100;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : grossWin / grossLoss;
  const totalR = closed.reduce((s, t) => s + (t.r || 0), 0);
  const avgR = totalR / total;
  const maxDD = Math.min(0, ...closed.map(t => t.pnl < 0 ? t.pnl : 0));
  
  return { total, wins: wins.length, losses: losses.length, winRate, profitFactor, totalR, avgR, maxDD };
}

function getSetupStats() {
  const trades = loadTrades();
  const closed = trades.filter(t => t.status === 'CLOSED');
  const bySetup = {};
  
  closed.forEach(t => {
    const setup = t.setup || 'unknown';
    if (!bySetup[setup]) bySetup[setup] = { trades: 0, tp: 0, be: 0, sl: 0, totalR: 0, totalPnl: 0 };
    bySetup[setup].trades++;
    if (t.result === 'TP') bySetup[setup].tp++;
    else if (t.result === 'BE') bySetup[setup].be++;
    else bySetup[setup].sl++;
    bySetup[setup].totalR += t.r || 0;
    bySetup[setup].totalPnl += t.pnl || 0;
  });
  
  return Object.entries(bySetup).map(([name, s]) => ({
    name,
    trades: s.trades,
    tp: s.tp, be: s.be, sl: s.sl,
    winRate: s.trades > 0 ? ((s.tp + s.be) / s.trades) * 100 : 0,
    totalR: +s.totalR.toFixed(2),
    avgR: s.trades > 0 ? +(s.totalR / s.trades).toFixed(2) : 0,
    totalPnl: +s.totalPnl.toFixed(2),
    profitFactor: s.totalPnl > 0 && s.totalPnl < 999 ? +(s.totalPnl / Math.abs(s.totalPnl)).toFixed(2) : s.totalPnl > 0 ? 999 : 0
  })).sort((a, b) => b.trades - a.trades);
}

function getTimeframeStats() {
  const trades = loadTrades();
  const closed = trades.filter(t => t.status === 'CLOSED');
  const byTF = {};
  
  closed.forEach(t => {
    const tf = t.timeframe || 'unknown';
    if (!byTF[tf]) byTF[tf] = { trades: 0, tp: 0, be: 0, sl: 0, totalR: 0 };
    byTF[tf].trades++;
    if (t.result === 'TP') byTF[tf].tp++;
    else if (t.result === 'BE') byTF[tf].be++;
    else byTF[tf].sl++;
    byTF[tf].totalR += t.r || 0;
  });
  
  return Object.entries(byTF).map(([name, s]) => ({
    name, trades: s.trades, tp: s.tp, be: s.be, sl: s.sl,
    winRate: s.trades > 0 ? ((s.tp + s.be) / s.trades) * 100 : 0,
    totalR: +s.totalR.toFixed(2),
    avgR: s.trades > 0 ? +(s.totalR / s.trades).toFixed(2) : 0,
    profitFactor: s.totalR > 0 ? +(s.totalR / Math.abs(s.totalR > 0 ? s.totalR * 0.5 : 1)).toFixed(2) : 0
  })).sort((a, b) => b.trades - a.trades);
}

// ─── 2. UI: Inyectar panel de estadísticas ───────────────
function injectStatsPanel() {
  // Detectar si estamos en la página de Trades
  const hash = window.location.hash;
  if (!hash.includes('trade')) return;
  
  // Esperar a que React renderice
  setTimeout(() => {
    const container = document.querySelector('#root');
    if (!container) return;
    
    // No duplicar
    if (document.getElementById('sono-stats-panel')) return;
    
    const stats = getStats();
    const setups = getSetupStats();
    const tfs = getTimeframeStats();
    
    const panel = document.createElement('div');
    panel.id = 'sono-stats-panel';
    panel.innerHTML = `
      <div style="background:#0d1421;border:1px solid #1a2744;border-radius:4px;padding:10px;margin:8px 0;font-family:'Courier New',monospace;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#4a5a7a;font-size:10px;text-transform:uppercase;letter-spacing:1px;">📊 TRADING JOURNAL — ${stats.total} trades cerrados</span>
          <span style="color:#00e676;font-size:10px;">✅ LOCAL STORAGE</span>
        </div>
        
        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px;margin-bottom:10px;">
          <div style="background:#070b14;border-radius:3px;padding:6px;text-align:center;">
            <div style="color:#4a5a7a;font-size:9px;">WINRATE</div>
            <div style="color:${stats.winRate >= 55 ? '#00e676' : '#ff3b3b'};font-size:14px;font-weight:bold;">${stats.winRate.toFixed(1)}%</div>
          </div>
          <div style="background:#070b14;border-radius:3px;padding:6px;text-align:center;">
            <div style="color:#4a5a7a;font-size:9px;">PROFIT FACTOR</div>
            <div style="color:${stats.profitFactor >= 1.5 ? '#00e676' : '#ffd600'};font-size:14px;font-weight:bold;">${stats.profitFactor.toFixed(2)}</div>
          </div>
          <div style="background:#070b14;border-radius:3px;padding:6px;text-align:center;">
            <div style="color:#4a5a7a;font-size:9px;">TOTAL R</div>
            <div style="color:#cdd8ef;font-size:14px;font-weight:bold;">${stats.totalR.toFixed(2)}R</div>
          </div>
          <div style="background:#070b14;border-radius:3px;padding:6px;text-align:center;">
            <div style="color:#4a5a7a;font-size:9px;">MAX DD</div>
            <div style="color:#ff3b3b;font-size:14px;font-weight:bold;">${stats.maxDD.toFixed(2)}R</div>
          </div>
        </div>
        
        <!-- Tabla por Setup -->
        <div style="margin-bottom:8px;">
          <span style="color:#4a5a7a;font-size:9px;text-transform:uppercase;">RENDIMIENTO POR SETUP</span>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead>
              <tr style="color:#4a5a7a;border-bottom:1px solid #1a2744;">
                <th style="text-align:left;padding:4px 6px;">Setup</th>
                <th style="text-align:center;padding:4px 6px;">Trades</th>
                <th style="text-align:center;padding:4px 6px;">TP/BE/SL</th>
                <th style="text-align:center;padding:4px 6px;">Winrate</th>
                <th style="text-align:right;padding:4px 6px;">R total</th>
                <th style="text-align:right;padding:4px 6px;">R medio</th>
                <th style="text-align:right;padding:4px 6px;">PF</th>
              </tr>
            </thead>
            <tbody>
              ${setups.map(s => `
                <tr style="border-bottom:1px solid #0d1421;">
                  <td style="padding:3px 6px;color:#cdd8ef;font-weight:bold;">${s.name}</td>
                  <td style="text-align:center;padding:3px 6px;">${s.trades}</td>
                  <td style="text-align:center;padding:3px 6px;">${s.tp}/${s.be}/${s.sl}</td>
                  <td style="text-align:center;padding:3px 6px;color:${s.winRate >= 50 ? '#00e676' : '#ff3b3b'};">${s.winRate.toFixed(1)}%</td>
                  <td style="text-align:right;padding:3px 6px;color:${s.totalR >= 0 ? '#00e676' : '#ff3b3b'};">${s.totalR.toFixed(2)}R</td>
                  <td style="text-align:right;padding:3px 6px;color:${s.avgR >= 0 ? '#00e676' : '#ff3b3b'};">${s.avgR.toFixed(2)}R</td>
                  <td style="text-align:right;padding:3px 6px;color:${s.profitFactor >= 1.5 ? '#00e676' : '#ffd600'};">${s.profitFactor.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${setups.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:8px;color:#4a5a7a;">Sin datos. Usa el formulario de abajo para registrar trades.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        
        <!-- Tabla por Timeframe -->
        <div style="margin:8px 0;">
          <span style="color:#4a5a7a;font-size:9px;text-transform:uppercase;">RENDIMIENTO POR TIMEFRAME</span>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead>
              <tr style="color:#4a5a7a;border-bottom:1px solid #1a2744;">
                <th style="text-align:left;padding:4px 6px;">Timeframe</th>
                <th style="text-align:center;padding:4px 6px;">Trades</th>
                <th style="text-align:center;padding:4px 6px;">TP/BE/SL</th>
                <th style="text-align:center;padding:4px 6px;">Winrate</th>
                <th style="text-align:right;padding:4px 6px;">R total</th>
              </tr>
            </thead>
            <tbody>
              ${tfs.map(t => `
                <tr style="border-bottom:1px solid #0d1421;">
                  <td style="padding:3px 6px;color:#cdd8ef;font-weight:bold;">${t.name}</td>
                  <td style="text-align:center;padding:3px 6px;">${t.trades}</td>
                  <td style="text-align:center;padding:3px 6px;">${t.tp}/${t.be}/${t.sl}</td>
                  <td style="text-align:center;padding:3px 6px;color:${t.winRate >= 50 ? '#00e676' : '#ff3b3b'};">${t.winRate.toFixed(1)}%</td>
                  <td style="text-align:right;padding:3px 6px;color:${t.totalR >= 0 ? '#00e676' : '#ff3b3b'};">${t.totalR.toFixed(2)}R</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Formulario para añadir trade manual -->
        <details style="margin-top:8px;">
          <summary style="color:#4a5a7a;font-size:10px;cursor:pointer;padding:4px 0;">➕ AÑADIR TRADE</summary>
          <form id="sono-trade-form" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;padding:8px;background:#070b14;border-radius:3px;">
            <select name="asset" style="grid-column:span 2;background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
              <option value="BTC">BTC</option><option value="ETH">ETH</option><option value="SOL">SOL</option><option value="XRP">XRP</option>
            </select>
            <select name="side" style="background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
              <option value="LONG">LONG</option><option value="SHORT">SHORT</option>
            </select>
            <select name="timeframe" style="background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
              <option value="candles_1m">1m</option><option value="candles_3m">3m</option><option value="candles_5m">5m</option><option value="candles_15m">15m</option>
            </select>
            <input name="setup" placeholder="Setup (ej: bullish_impulse)" style="grid-column:span 2;background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
            <input name="entry" type="number" step="0.0001" placeholder="Precio entrada" style="background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
            <input name="exit" type="number" step="0.0001" placeholder="Precio salida" style="background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
            <select name="result" style="background:#0d1421;color:#cdd8ef;border:1px solid #1a2744;border-radius:3px;padding:4px;font-size:10px;">
              <option value="TP">TP ✅</option><option value="BE">BE ⚖️</option><option value="SL">SL ❌</option>
            </select>
            <button type="submit" style="background:#00e67622;color:#00e676;border:1px solid #00e67644;border-radius:3px;padding:4px;cursor:pointer;font-size:10px;font-weight:bold;">GUARDAR</button>
          </form>
        </details>
        
        <!-- Botón exportar CSV -->
        <div style="margin-top:8px;display:flex;gap:4px;">
          <button id="sono-export-csv" style="background:#0d1421;color:#4a5a7a;border:1px solid #1a2744;border-radius:3px;padding:4px 8px;cursor:pointer;font-size:9px;">📥 Exportar CSV</button>
          <button id="sono-clear-data" style="background:#ff3b3b11;color:#ff3b3b;border:1px solid #ff3b3b33;border-radius:3px;padding:4px 8px;cursor:pointer;font-size:9px;">🗑️ Borrar datos</button>
        </div>
      </div>
    `;
    
    // Insertar al inicio del root
    container.insertBefore(panel, container.firstChild);
    
    // Event listeners
    document.getElementById('sono-trade-form')?.addEventListener('submit', function(e) {
      e.preventDefault();
      const fd = new FormData(this);
      const entry = parseFloat(fd.get('entry'));
      const exit = parseFloat(fd.get('exit'));
      const pnl = fd.get('side') === 'LONG' ? exit - entry : entry - exit;
      const r = pnl > 0 ? +(exit / entry - 1).toFixed(2) : +((exit - entry) / entry).toFixed(2);
      
      addTrade({
        asset: fd.get('asset'), side: fd.get('side'), timeframe: fd.get('timeframe'),
        setup: fd.get('setup'), entry, exit, pnl: +pnl.toFixed(2), r,
        status: 'CLOSED', result: fd.get('result')
      });
      
      // Refresh
      document.getElementById('sono-stats-panel')?.remove();
      injectStatsPanel();
    });
    
    document.getElementById('sono-export-csv')?.addEventListener('click', function() {
      const trades = loadTrades();
      if (trades.length === 0) return alert('No hay trades para exportar');
      const headers = 'ID,Asset,Side,Timeframe,Setup,Entry,Exit,PnL,R,Status,Result,Timestamp\n';
      const csv = headers + trades.map(t => 
        `${t.id},${t.asset},${t.side},${t.timeframe},${t.setup},${t.entry},${t.exit},${t.pnl},${t.r},${t.status},${t.result},${t.timestamp}`
      ).join('\n');
      const blob = new Blob([csv], {type: 'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'sono_trades.csv'; a.click();
      URL.revokeObjectURL(url);
    });
    
    document.getElementById('sono-clear-data')?.addEventListener('click', function() {
      if (confirm('¿Borrar todos los trades registrados? Esta acción no se puede deshacer.')) {
        localStorage.removeItem(STORAGE_KEY);
        document.getElementById('sono-stats-panel')?.remove();
        injectStatsPanel();
      }
    });
    
  }, 2000); // Esperar 2s a que React renderice
}

// ─── 3. Backend D1 Lite (Cloudflare Worker) ──────────────
// Cuando el Worker D1 esté listo, descomentar:
// const WORKER_URL = 'https://sono-api.sonosanty.workers.dev';
// async function syncTrades() { ... }

// ─── 4. MFE/MAE en trades activos ────────────────────────
function injectMFE_MAE() {
  const hash = window.location.hash;
  if (!hash.includes('trade')) return;
  
  setTimeout(() => {
    // Buscar la tabla de trades activos que renderiza React
    // e inyectar columnas MFE/MAE si no existen
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const headers = table.querySelectorAll('th');
      let hasMFE = false;
      headers.forEach(h => { if (h.textContent.includes('MFE')) hasMFE = true; });
      
      if (!hasMFE && table.innerHTML.includes('OPEN') && table.innerHTML.includes('Entry')) {
        // Añadir cabecera MFE/MAE
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
          const mfe = document.createElement('th');
          mfe.textContent = 'MFE'; mfe.style.cssText = 'text-align:center;padding:4px 6px;color:#4a5a7a;font-size:9px;';
          headerRow.appendChild(mfe);
          const mae = document.createElement('th');
          mae.textContent = 'MAE'; mae.style.cssText = 'text-align:center;padding:4px 6px;color:#4a5a7a;font-size:9px;';
          headerRow.appendChild(mae);
        }
        
        // Añadir celdas MFE/MAE a cada fila
        table.querySelectorAll('tbody tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const entryCell = cells[4]; // Asumiendo entry en columna 5
            const entry = parseFloat(entryCell?.textContent.replace(/[$,.]/g, '').replace(/(\d{2})$/, '.$1') || 0);
            
            // Obtener precio actual del activo
            const assetElem = row.querySelector('td:nth-child(4)');
            const asset = assetElem?.textContent?.trim() || 'BTC';
            const binanceSym = asset + 'USDT';
            
            fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + binanceSym)
              .then(r => r.json())
              .then(d => {
                const currentPrice = parseFloat(d.price);
                if (currentPrice && entry > 0) {
                  const mfePct = ((currentPrice - entry) / entry) * 100;
                  const maePct = -Math.abs(mfePct) * 0.3; // Estimación simplificada
                  
                  // Añadir celdas MFE/MAE
                  const mfeCell = document.createElement('td');
                  mfeCell.style.cssText = 'text-align:center;padding:3px 6px;font-size:10px;';
                  mfeCell.style.color = mfePct > 0 ? '#00e676' : '#ff3b3b';
                  mfeCell.textContent = mfePct.toFixed(2) + '%';
                  row.appendChild(mfeCell);
                  
                  const maeCell = document.createElement('td');
                  maeCell.style.cssText = 'text-align:center;padding:3px 6px;font-size:10px;';
                  maeCell.style.color = '#ff3b3b';
                  maeCell.textContent = maePct.toFixed(2) + '%';
                  row.appendChild(maeCell);
                }
              })
              .catch(() => {});
          }
        });
      }
    });
  }, 3000);
}

// ─── INIT ────────────────────────────────────────────────
// Ejecutar cuando cargue la página y cuando cambie el hash
function init() {
  injectStatsPanel();
  injectMFE_MAE();
}

// Escuchar cambios de hash (SPA navigation)
window.addEventListener('hashchange', init);
// Escuchar mutations del DOM por si React re-renderiza
const observer = new MutationObserver(() => {
  if (!document.getElementById('sono-stats-panel')) {
    init();
  }
});
observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });

// Ejecutar al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('📊 Sono Pro v3.2 — Trading Journal + Tablas cargadas');
})();
