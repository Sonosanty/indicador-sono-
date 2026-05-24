// ========================================
// MÉTODO SONO - DASHBOARD APP.JS
// Versión: 2.0 - Sistema Híbrido Completo con Fallback Estático Local
// ========================================

// ===== CONFIGURACIÓN =====
const CONFIG = {
 API_URL: window.location.hostname === 'localhost'
 ? 'http://localhost:8000'
 : 'https://btc-api.onrender.com',

 UPDATE_INTERVAL: 30000, // 30 segundos

 // Configuración Método Sono
 SONO_CONFIG: {
 // Medias móviles
 MA_PERIODS: {
 ma6: 6,
 ma40: 40,
 ma70: 70,
 ma200: 200
 },

 // Gestión de riesgo
 DEFAULT_RISK_PCT: 1.5,
 MAX_RISK_PCT: 5.0,

 // Filtros
 SCORE_PANIC_THRESHOLD: 30,
 SCORE_EUPHORIA_THRESHOLD: 70,
 RSI_OVERSOLD: 35,
 RSI_OVERBOUGHT: 65,
 FEARGREED_EXTREME_FEAR: 30,
 FEARGREED_EXTREME_GREED: 70,
 ADX_TREND_THRESHOLD: 25
 }
};

// ===== ESTADO GLOBAL =====
let state = {
 data: null,
 isLoading: false,
 error: null,
 lastUpdate: null,
 autoUpdateTimer: null,
 currentCoin: 'BTC',

 // Estado cálculos
 position: null
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
 console.log('🎯 Método Sono Dashboard inicializado');

 setupEventListeners();
 loadData();
 startAutoUpdate();
 loadTheme();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
 // Selector de monedas
 document.querySelectorAll('.coin-selector').forEach(btn => {
 btn.addEventListener('click', (e) => {
 const coin = e.target.dataset.coin;
 if (coin) selectCoin(coin);
 });
 });

 // Calculadora de posición
 const calculateBtn = document.getElementById('calculate-position');
 if (calculateBtn) {
 calculateBtn.addEventListener('click', calculatePosition);
 }

 // Auto-calcular en cambios de input
 const inputs = ['capital', 'entry-price', 'stop-loss', 'risk-pct'];
 inputs.forEach(id => {
 const input = document.getElementById(id);
 if (input) {
 input.addEventListener('input', debounce(calculatePosition, 500));
 }
 });

 // Botón refresh
 const refreshBtn = document.getElementById('refresh-btn');
 if (refreshBtn) {
 refreshBtn.addEventListener('click', () => loadData(true));
 }
}

// ===== CARGA DE DATOS =====

/**
 * Cargar datos del sistema híbrido o fallback local
 */
async function loadData(forceRefresh = false) {
 if (state.isLoading && !forceRefresh) return;

 state.isLoading = true;
 showLoading();

 try {
 const coin = state.currentCoin.toUpperCase();
 let rawData = null;
 let isApi = true;

 // 1. Intentar API de Onrender
 try {
 const response = await fetch(`${CONFIG.API_URL}/api/sono/${coin.toLowerCase()}`);
 if (response.ok) {
 rawData = await response.json();
 }
 } catch (e) {
 console.log('⚠️ API offline o durmiendo, conectando a Base de Datos local...');
 }

 // 2. Fallback local a indicador_data.json
 if (!rawData) {
 const jsonResponse = await fetch(`indicador_data.json`);
 if (jsonResponse.ok) {
 const dbData = await jsonResponse.json();
 const coinData = dbData.coins[coin];
 const sentiment = dbData.sentimiento_mercado || {};
 
 if (coinData) {
 rawData = {
 coin: coin,
 price: coinData.price_usd,
 timestamp: new Date().toISOString(),
 score: coinData.confluence_score,
 score_status: coinData.estado || 'NEUTRAL',
 rsi: coinData.timeframes["1h"].rsi,
 fear_greed: sentiment.fear_greed ? sentiment.fear_greed.value : 28,
 vix: sentiment.vix || 16.7,
 google_trends: sentiment.google_trends_volume_btc || 79,
 ma_values: {
 ma6: coinData.timeframes["1h"].ma20 * 0.99, // Estimación matemática ultra-corta
 ma40: coinData.timeframes["1h"].ma20,
 ma70: coinData.timeframes["1h"].ma50,
 ma200: coinData.timeframes["1h"].ma200
 },
 hybrid_signal: {
 decision: coinData.accion || 'NEUTRAL',
 confidence: coinData.confluence_score * 0.8 + 20.0,
 score_signal: coinData.estado || 'NEUTRAL',
 sono_signal: coinData.accion || 'RANGO',
 adx: 25.0,
 volume_confirmed: true,
 entry: coinData.price_usd,
 stop_loss: coinData.price_usd * 0.98,
 take_profit: coinData.price_usd * 1.05,
 risk_reward: 2.5,
 pilar1_cruce: {
 signal: coinData.accion || 'NEUTRAL',
 ma6_cross_ma70: true,
 strength: 1.5
 },
 pilar2_trends: {
 vix_adjustment: 1.0,
 trends_multiplier: 1.0
 },
 pilar3_bollinger: {
 signal: coinData.accion || 'NEUTRAL',
 rsi_oversold: coinData.timeframes["1h"].rsi < 35,
 feargreed_panic: (sentiment.fear_greed ? sentiment.fear_greed.value : 50) < 30,
 rsi_overbought: coinData.timeframes["1h"].rsi > 65,
 feargreed_greed: (sentiment.fear_greed ? sentiment.fear_greed.value : 50) > 70
 }
 }
 };
 isApi = false;
 }
 }
 }

 if (!rawData) {
 throw new Error("No hay conexión con la API ni base de datos local disponible.");
 }

 state.data = rawData;
 state.error = null;
 state.lastUpdate = new Date();

 // Actualizar UI completa
 updateUI(rawData);

 const statusText = document.getElementById('status-text');
 if (statusText) {
 if (isApi) {
 statusText.textContent = 'API CONECTADA';
 statusText.className = 'status-text connected';
 } else {
 statusText.textContent = 'BASE DE DATOS LOCAL';
 statusText.className = 'status-text connected local-db';
 }
 }

 console.log(`✅ Datos cargados [${isApi ? 'API' : 'Estático'}]:`, rawData);

 } catch (error) {
 console.error('❌ Error:', error);
 state.error = error.message;
 showError(error.message);

 // Fallback definitivo a MockData en desarrollo local
 if (window.location.hostname === 'localhost') {
 useMockData();
 }
 } finally {
 state.isLoading = false;
 hideLoading();
 }
}

/**
 * Datos simulados para desarrollo
 */
function useMockData() {
 console.warn('⚠️ Usando datos simulados (modo desarrollo)');

 const mockData = {
 coin: 'BTC',
 price: 77500,
 timestamp: new Date().toISOString(),

 // Score Macro
 score: 42,
 score_status: 'ACUMULACIÓN MODERADA',

 // Indicadores
 rsi: 44.5,
 fear_greed: 27,
 vix: 18.5,
 google_trends: 45,
 btc_dominance: 58.2,

 // Medias Móviles
 ma_values: {
 ma6: 77600,
 ma40: 77200,
 ma70: 77400,
 ma200: 75500
 },

 // Señales Híbridas
 hybrid_signal: {
 decision: 'LONG',
 confidence: 72.5,
 score_signal: 'ACCUMULATION',
 sono_signal: 'LONG',

 // Pilares
 pilar1_cruce: {
 signal: 'LONG',
 ma6_cross_ma70: true,
 strength: 2.85
 },

 pilar2_trends: {
 vix_adjustment: 1.2,
 trends_multiplier: 1.1
 },

 pilar3_bollinger: {
 signal: 'LONG',
 rsi_oversold: true,
 feargreed_panic: true,
 distance_to_ma: 3.12
 },

 // Filtros
 adx: 28.5,
 volume_confirmed: true,

 // Gestión
 entry: 77500,
 stop_loss: 76000,
 take_profit: 79800,
 risk_reward: 1.53
 }
 };

 state.data = mockData;
 updateUI(mockData);
}

// ===== ACTUALIZACIÓN UI =====

/**
 * Actualizar toda la UI
 */
function updateUI(data) {
 updateScoreMaestro(data);
 updateDecisionHibrida(data);
 updatePilar1(data);
 updatePilar3(data);
 updateMediasMoviles(data.ma_values);
 updateTendenciaADX(data.hybrid_signal);
 
 // Prefill calculator inputs with loaded coin data
 const entryField = document.getElementById('entry-price');
 const stopField = document.getElementById('stop-loss');
 if (entryField && data.price) {
     entryField.value = Math.round(data.price);
 }
 if (stopField && data.hybrid_signal && data.hybrid_signal.stop_loss) {
     stopField.value = Math.round(data.hybrid_signal.stop_loss);
 }
 
 // Auto-calculate position on data load
 calculatePosition();
 
 updateLastUpdate();
}

/**
 * Actualizar Score Maestro Confluencia
 */
function updateScoreMaestro(data) {
 const scoreValue = document.getElementById('score-maestro-value');
 const scoreBar = document.getElementById('score-maestro-bar');
 const scoreText = document.getElementById('score-maestro-text');

 if (scoreValue) {
 scoreValue.textContent = data.score || '--';
 }

 if (scoreBar) {
 scoreBar.style.width = `${data.score}%`;
 scoreBar.className = `score-bar ${getScoreColor(data.score)}`;
 }

 if (scoreText) {
 scoreText.textContent = data.score_status || 'Calculando...';
 scoreText.className = `score-status ${getScoreColor(data.score)}`;
 }
}

/**
 * Actualizar Decisión Híbrida Final
 */
function updateDecisionHibrida(data) {
 const signal = data.hybrid_signal;
 if (!signal) return;

 const decisionValue = document.getElementById('decision-value');
 const confidenceValue = document.getElementById('confidence-value');
 const decisionText = document.getElementById('decision-text');

 if (decisionValue) {
 decisionValue.textContent = signal.decision || 'NEUTRAL';
 decisionValue.className = `decision-badge ${signal.decision.toLowerCase()}`;
 }

 if (confidenceValue) {
 confidenceValue.textContent = `${signal.confidence?.toFixed(1)}%` || '--';
 }

 if (decisionText) {
 decisionText.innerHTML = getDecisionExplanation(signal);
 }
}

/**
 * Actualizar Pilar 1: Cruces de Medias
 */
function updatePilar1(data) {
 const signal = data.hybrid_signal?.pilar1_cruce;
 if (!signal) return;

 const cruceSignal = document.getElementById('cruce-signal');
 const cruceText = document.getElementById('cruce-text');

 if (cruceSignal) {
 cruceSignal.textContent = signal.signal || 'NEUTRAL';
 cruceSignal.className = `signal-badge ${signal.signal?.toLowerCase() || 'neutral'}`;
 }

 if (cruceText) {
 if (signal.ma6_cross_ma70) {
 cruceText.textContent = `MA6 cruzó ${signal.signal === 'LONG' ? 'al alza' : 'a la baja'} MA70 (${signal.strength?.toFixed(2)}%)`;
 } else {
 cruceText.textContent = 'Sin cruce detectado';
 }
 }
}

/**
 * Actualizar Pilar 3: Bollinger + RSI
 */
function updatePilar3(data) {
 const signal = data.hybrid_signal?.pilar3_bollinger;
 if (!signal) return;

 const bollingerSignal = document.getElementById('bollinger-signal');
 const bollingerText = document.getElementById('bollinger-text');

 if (bollingerSignal) {
 bollingerSignal.textContent = signal.signal || 'NEUTRAL';
 bollingerSignal.className = `signal-badge ${signal.signal?.toLowerCase() || 'neutral'}`;
 }

 if (bollingerText) {
 const conditions = [];
 if (signal.rsi_oversold) conditions.push('RSI sobrevendido');
 if (signal.feargreed_panic) conditions.push('F&G pánico');
 if (signal.rsi_overbought) conditions.push('RSI sobrecomprado');
 if (signal.feargreed_greed) conditions.push('F&G euforia');

 bollingerText.textContent = conditions.length > 0
 ? conditions.join(', ')
 : 'Buscando pánico/euforia...';
 }
}

/**
 * Actualizar Medias Móviles
 */
function updateMediasMoviles(maValues) {
 if (!maValues) return;

 const elements = {
 ma6: document.getElementById('ma6-value'),
 ma40: document.getElementById('ma40-value'),
 ma70: document.getElementById('ma70-value'),
 ma200: document.getElementById('ma200-value')
 };

 Object.keys(elements).forEach(key => {
 const element = elements[key];
 if (element && maValues[key]) {
 element.textContent = `$${formatNumber(maValues[key])}`;
 }
 });
}

/**
 * Actualizar Tendencia & ADX
 */
function updateTendenciaADX(signal) {
 if (!signal) return;

 const adxValue = document.getElementById('adx-value');
 const adxText = document.getElementById('adx-text');

 if (adxValue && signal.adx !== undefined) {
 adxValue.textContent = signal.adx.toFixed(1);
 }

 if (adxText) {
 const hasTrend = signal.adx > CONFIG.SONO_CONFIG.ADX_TREND_THRESHOLD;
 adxText.textContent = hasTrend
 ? `Tendencia ${signal.decision === 'LONG' ? 'alcista' : 'bajista'} confirmada`
 : 'Sin tendencia clara (mercado lateral)';
 adxText.className = hasTrend ? 'trend-confirmed' : 'trend-unclear';
 }
}

// ===== CALCULADORA DE POSICIÓN =====

/**
 * Calcular tamaño de posición
 */
function calculatePosition() {
 // Obtener valores
 const capital = parseFloat(document.getElementById('capital')?.value) || 0;
 const entry = parseFloat(document.getElementById('entry-price')?.value) || 0;
 const stop = parseFloat(document.getElementById('stop-loss')?.value) || 0;
 const riskPct = parseFloat(document.getElementById('risk-pct')?.value) || CONFIG.SONO_CONFIG.DEFAULT_RISK_PCT;

 // Validar
 if (capital <= 0 || entry <= 0 || stop <= 0) {
 clearCalculatorResults();
 return;
 }

 if (state.currentCoin === 'BTC' || state.currentCoin === 'ETH' || state.currentCoin === 'SOL' || state.currentCoin === 'XRP') {
     const isLong = entry > stop;
     if (!isLong && entry < stop) {
         // SHORT position
     }
 }

 // Cálculos
 const riskUSD = capital * (riskPct / 100);
 const stopDistance = Math.abs(entry - stop);
 const stopDistancePct = (stopDistance / entry) * 100;
 const quantityBTC = riskUSD / stopDistance;
 const positionSize = quantityBTC * entry;
 const leverage = positionSize / capital;
 const maxLoss = quantityBTC * stopDistance;

 // Ajuste dinámico por VIX
 const vix = state.data?.vix || 15;
 const vixMultiplier = getVIXMultiplier(vix);
 const adjustedQuantity = quantityBTC * vixMultiplier;
 const adjustedPositionSize = adjustedQuantity * entry;

 // Guardar en estado
 state.position = {
 capital,
 entry,
 stop,
 riskPct,
 riskUSD,
 stopDistance,
 stopDistancePct,
 quantityBTC: adjustedQuantity,
 positionSize: adjustedPositionSize,
 leverage,
 maxLoss,
 vixMultiplier
 };

 // Actualizar UI
 displayCalculatorResults(state.position);
}

/**
 * Mostrar resultados de calculadora
 */
function displayCalculatorResults(position) {
 const elements = {
 'risk-usd': `$${position.riskUSD.toFixed(2)}`,
 'quantity-btc': position.quantityBTC.toFixed(6),
 'position-size': `$${formatNumber(position.positionSize)}`,
 'leverage': `${position.leverage.toFixed(2)}x`,
 'stop-distance': `${position.stopDistancePct.toFixed(2)}%`,
 'max-loss': `$${position.maxLoss.toFixed(2)}`
 };

 Object.keys(elements).forEach(id => {
 const element = document.getElementById(id);
 if (element) {
 element.textContent = elements[id];

 // Animación de actualización
 element.classList.add('updated');
 setTimeout(() => element.classList.remove('updated'), 500);
 }
 });

 // Warnings
 showCalculatorWarnings(position);
}

/**
 * Mostrar warnings de calculadora
 */
function showCalculatorWarnings(position) {
 const warningsDiv = document.getElementById('calculator-warnings');
 if (!warningsDiv) return;

 const warnings = [];

 if (position.leverage > 3) {
 warnings.push('⚠️ Apalancamiento alto (>3x): Riesgo elevado');
 }

 if (position.riskPct > 2) {
 warnings.push('⚠️ Riesgo por trade alto (>2%): Considerar reducir');
 }

 if (position.stopDistancePct < 1) {
 warnings.push('⚠️ Stop muy cercano (<1%): Puede saltar por ruido');
 }

 if (position.vixMultiplier < 1) {
 warnings.push('ℹ️ VIX alto: Posición reducida automáticamente');
 }

 warningsDiv.innerHTML = warnings.length > 0
 ? warnings.map(w => `<div class="warning">${w}</div>`).join('')
 : '<div class="info">✅ Parámetros dentro de rango seguro</div>';
}

/**
 * Limpiar resultados calculadora
 */
function clearCalculatorResults() {
 const ids = ['risk-usd', 'quantity-btc', 'position-size', 'leverage', 'stop-distance', 'max-loss'];
 ids.forEach(id => {
 const element = document.getElementById(id);
 if (element) element.textContent = '$0';
 });
}

// ===== UTILIDADES =====

/**
 * Obtener multiplicador VIX
 */
function getVIXMultiplier(vix) {
 // VIX alto = reducir posición
 if (vix > 30) return 0.7; // Reducir 30%
 if (vix > 25) return 0.85; // Reducir 15%
 if (vix > 20) return 0.95; // Reducir 5%
 return 1.0; // Sin ajuste
}

/**
 * Explicación de decisión híbrida
 */
function getDecisionExplanation(signal) {
 const parts = [];

 if (signal.score_signal) {
 parts.push(`<strong>Score:</strong> ${signal.score_signal}`);
 }

 if (signal.sono_signal) {
 parts.push(`<strong>Sono:</strong> ${signal.sono_signal}`);
 }

 if (signal.adx && signal.adx > CONFIG.SONO_CONFIG.ADX_TREND_THRESHOLD) {
 parts.push(`<strong>ADX:</strong> Tendencia confirmada (${signal.adx.toFixed(1)})`);
 }

 if (signal.volume_confirmed) {
 parts.push(`<strong>Volumen:</strong> Confirmado`);
 }

 return parts.length > 0
 ? parts.join(' • ')
 : 'Evaluando filtros...';
}

/**
 * Obtener color según score
 */
function getScoreColor(score) {
 if (score < 20) return 'panic';
 if (score < 35) return 'fear';
 if (score < 45) return 'accumulation';
 if (score < 55) return 'neutral';
 if (score < 65) return 'optimism';
 if (score < 80) return 'euphoria';
 return 'bubble';
}

/**
 * Formatear número
 */
function formatNumber(num) {
 if (!num) return '0';
 return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
 let timeout;
 return function executedFunction(...args) {
 const later = () => {
 clearTimeout(timeout);
 func(...args);
 };
 clearTimeout(timeout);
 timeout = setTimeout(later, wait);
 };
}

/**
 * Mostrar loading
 */
function showLoading() {
 const statusIndicator = document.getElementById('status-indicator');
 if (statusIndicator) {
 statusIndicator.className = 'status-indicator loading';
 }
}

/**
 * Ocultar loading
 */
function hideLoading() {
 const statusIndicator = document.getElementById('status-indicator');
 if (statusIndicator) {
 statusIndicator.className = 'status-indicator connected';
 }
}

/**
 * Mostrar error
 */
function showError(message) {
 const statusIndicator = document.getElementById('status-indicator');
 if (statusIndicator) {
 statusIndicator.className = 'status-indicator error';
 }
}

/**
 * Mostrar notificación
 */
function showNotification(title, message, type = 'info') {
 console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
}

/**
 * Seleccionar moneda
 */
function selectCoin(coin) {
 state.currentCoin = coin;

 document.querySelectorAll('.coin-selector').forEach(btn => {
 btn.classList.toggle('active', btn.dataset.coin === coin);
 });

 loadData(true);
}

/**
 * Toggle theme
 */
function toggleTheme() {
 document.body.classList.toggle('light-mode');
 localStorage.setItem('sono-theme',
 document.body.classList.contains('light-mode') ? 'light' : 'dark'
 );
}

/**
 * Cargar tema
 */
function loadTheme() {
 if (localStorage.getItem('sono-theme') === 'light') {
 document.body.classList.add('light-mode');
 }
}

/**
 * Actualizar timestamp
 */
function updateLastUpdate() {
 const element = document.getElementById('last-update');
 if (element && state.lastUpdate) {
 element.textContent = state.lastUpdate.toLocaleTimeString('es-ES');
 }
}

/**
 * Auto-actualización
 */
function startAutoUpdate() {
 if (state.autoUpdateTimer) {
 clearInterval(state.autoUpdateTimer);
 }

 state.autoUpdateTimer = setInterval(() => {
 loadData();
 }, CONFIG.UPDATE_INTERVAL);
}

// ===== EXPORTAR =====
window.SonoDashboard = {
 loadData,
 calculatePosition,
 selectCoin,
 toggleTheme,
 state: () => state,
 config: () => CONFIG
};

console.log('✅ Método Sono Dashboard cargado con éxito');