const https = require('https');

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept-Encoding': 'identity' } }, res => {
      let data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data).toString()));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== AUDITORIA COMPLETA SONO TERMINAL X ===\n');
  
  const html = await fetchRaw('https://indicador-sono.pages.dev/');
  const js = await fetchRaw('https://indicador-sono.pages.dev/js/stx-core.js');
  
  console.log('HTML:', html.length, 'bytes');
  console.log('JS:', js.length, 'bytes\n');

  // 1. IDs que el JS espera vs HTML
  const requiredIds = [
    'sonoDot', 'sonoSignal', 'sonoSub', 'sonoScore', 'sonoConf', 'sonoRisk',
    'macroBias', 'microBias', 'momentumBias', 'volBias',
    'trendScore', 'momScore', 'volScore', 'gapScore',
    'trendBar', 'momBar', 'volBar', 'gapBar',
    'msTrend', 'msMacro', 'msMicro', 'msVol',
    'sonoConfCount', 'matrixGrid', 'matrixResult',
    'execEntry', 'execStop', 'execTarget', 'execRR', 'execDur', 'execConf',
    'stratGrid', 'calcBtn', 'liveBtn',
    'capIn', 'riskIn', 'atrIn', 'stopIn',
    'qtyOut', 'slOut', 'tpOut', 'rrOut', 'lossOut', 'profitOut'
  ];
  
  console.log('--- IDs SONO METHOD en HTML ---');
  let missing = [];
  for (const id of requiredIds) {
    if (html.includes('id="' + id + '"')) {
      console.log('  OK: ' + id);
    } else {
      missing.push(id);
    }
  }
  if (missing.length > 0) {
    console.log('\nFALTAN (' + missing.length + '):');
    missing.forEach(id => console.log('  - ' + id));
  } else {
    console.log('\nTodos los IDs SONO METHOD presentes');
  }

  // 2. IDs de la página principal (Dashboard)
  const dashIds = [
    'scoreNum', 'scoreLbl', 'scoreZone', 'ringArc',
    'p1bar', 'p1pts', 'p2bar', 'p2pts', 'p3bar', 'p3pts',
    'd_ma6x70', 'v_ma6x70', 'd_ma40', 'v_ma40', 'd_ma200', 'v_ma200',
    'd_adx', 'v_adx', 'd_rsi', 'v_rsi', 'd_bb', 'v_bb',
    'ma6v', 'ma6d', 'ma40v', 'ma40d', 'ma70v', 'ma70d', 'ma200v', 'ma200d',
    'mFNG', 'mFNGl', 'mFNGb', 'mDOM', 'mDOMl', 'mDOMb',
    'mMCAP', 'mMCAPl', 'mMCAPb', 'mEUR', 'mEURb',
    'zonaLst',
    'priceUSD', 'priceEUR', 'priceChg', 'h24', 'l24', 'vol24', 'vwapEl', 'atrEl',
    'indRSI', 'indRSIl', 'indADX', 'indADXl', 'indBB', 'indBBl', 'indMA40d', 'indMA40l',
    'mtf1m', 'mtf3m', 'mtf5m', 'mtf15m', 'mtfTotal'
  ];
  
  console.log('\n--- IDs DASHBOARD en HTML ---');
  let missingDash = [];
  for (const id of dashIds) {
    if (html.includes('id="' + id + '"')) missingDash.push(id);
  }
  console.log('Dashboard IDs encontrados: ' + missingDash.length + '/' + dashIds.length);
  if (missingDash.length < dashIds.length) {
    console.log('Faltan ' + (dashIds.length - missingDash.length) + ' IDs del dashboard');
  }

  // 3. Páginas SPA
  const pages = ['page-dashboard','page-metodo','page-trades','page-rangos','page-sistema'];
  console.log('\n--- PAGINAS SPA ---');
  for (const p of pages) {
    console.log('  ' + (html.includes(p) ? 'OK' : 'FAIL') + ': ' + p);
  }

  // 4. Check JS
  console.log('\n--- CHECKS JS ---');
  const jsItems = [
    ['showPage', 'function showPage', true],
    ['renderScore', 'function renderScore', true],
    ['renderTradesPage', 'function renderTradesPage', true],
    ['renderRangosPage async', 'async function renderRangosPage', true],
    ['CG_BASE (CoinGecko)', 'CG_BASE', true],
    ['CoinGecko OHLCV', 'CoinGecko OHLCV', true],
    ['setCoin', 'function setCoin', true],
    ['initSonoMethod() fn', 'function initSonoMethod', true],
    ['initSonoMethod() call', 'initSonoMethod();', true],
    ['window.updateSonoMethod', 'window.updateSonoMethod', true],
    ['updateSonoMethod(lastScore)', 'updateSonoMethod(lastScore)', true],
    ['WebSocket startWS', 'startWS', true],
    ['async function init()', 'async function init', true],
    ['init() IIFE call', '})();', true],
    ['loadTicker', 'async function loadTicker', true],
    ['refreshIndicators', 'async function refreshIndicators', true],
    ['fetchBinance/proxy', 'vix-proxy.sonosanty.workers.dev', true],
    ['CalcPosition function', 'calcPosition', true],
    ['execPanel function', 'execPanel', true],
    ['strategyGrid function', 'strategyGrid', true],
  ];
  
  let jsOk = 0;
  for (const [name, pattern] of jsItems) {
    const found = js.includes(pattern);
    console.log('  ' + (found ? 'OK' : 'FAIL') + ': ' + name);
    if (found) jsOk++;
  }
  console.log('JS: ' + jsOk + '/' + jsItems.length);

  // 5. Sin errores conocidos
  console.log('\n--- ERRORES COMUNES ---');
  if (js.includes('onclick=')) console.log('FAIL: onclick inline presente');
  else console.log('OK: sin onclick inline');
  
  if (html.includes('<script src="')) {
    const extRefs = html.match(/src="([^"]+)"/g);
    const badRefs = extRefs.filter(r => 
      !r.includes('https://') && 
      !r.includes('stx-core') && 
      r !== 'src=""'
    );
    if (badRefs.length > 0) {
      console.log('FAIL: referencias locales sospechosas:');
      badRefs.forEach(r => console.log('  ' + r));
    } else {
      console.log('OK: sin referencias locales rotas');
    }
  }
  
  // 6. Último commit desde API
  console.log('\n--- FINAL ---');
  console.log('Commit en produccion: verificar en GitHub');
}

main().catch(console.error);
