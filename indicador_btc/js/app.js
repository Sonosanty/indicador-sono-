// ========================================
// INDICADOR SONO - MAIN APP.JS
// Versión: 2.0 - Funcional Completo con Fallback Local Estático
// ========================================

// ===== CONFIGURACIÓN =====
const CONFIG = {
 // API URL - cambiar según entorno
 API_URL: window.location.hostname === 'localhost'
 ? 'http://localhost:8000'
 : 'https://btc-api.onrender.com', // Tu API deployada

 // Intervalo de actualización (ms)
 UPDATE_INTERVAL: 30000, // 30 segundos

 // Monedas soportadas
 COINS: {
 BTC: { name: 'Bitcoin', symbol: '🟠', color: '#f7931a' },
 ETH: { name: 'Ethereum', symbol: '🔵', color: '#627eea' },
 SOL: { name: 'Solana', symbol: '🟣', color: '#9945ff' },
 XRP: { name: 'XRP', symbol: '🟢', color: '#23292f' }
 },

 // Moneda actual
 currentCoin: 'BTC'
};

// ===== ESTADO GLOBAL =====
let state = {
 data: null,
 isLoading: false,
 error: null,
 lastUpdate: null,
 autoUpdateTimer: null
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
 console.log('🚀 Indicador Sono inicializado');

 // Configurar eventos
 setupEventListeners();

 // Cargar datos iniciales
 loadData();

 // Iniciar auto-actualización
 startAutoUpdate();

 // Cargar tema guardado
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

 // Botón refresh manual
 const refreshBtn = document.getElementById('refresh-btn');
 if (refreshBtn) {
 refreshBtn.addEventListener('click', () => loadData(true));
 }

 // Toggle theme
 const themeToggle = document.getElementById('theme-toggle');
 if (themeToggle) {
 themeToggle.addEventListener('click', toggleTheme);
 }
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Cargar datos de la API o Fallback Estático
 */
async function loadData(forceRefresh = false) {
 if (state.isLoading && !forceRefresh) return;

 state.isLoading = true;
 showLoading();

 try {
 const coin = CONFIG.currentCoin.toUpperCase();
 let rawData = null;
 let isApi = true;

 // 1. Intentar fetch de API real
 try {
 const response = await fetch(`${CONFIG.API_URL}/api/coins/${coin.toLowerCase()}`);
 if (response.ok) {
 rawData = await response.json();
 }
 } catch (e) {
 console.log('⚠️ API de Onrender no disponible, buscando base de datos local...');
 }

 // 2. Fallback a indicador_data.json (Cloudflare / Local)
 if (!rawData) {
 const jsonResponse = await fetch(`indicador_data.json`);
 if (jsonResponse.ok) {
 const dbData = await jsonResponse.json();
 const coinDetails = dbData.coins[coin];
 const sentiment = dbData.sentimiento_mercado || {};
 const scalping = dbData.scalping_trades || [];
 
 if (coinDetails) {
 rawData = {
 score: coinDetails.confluence_score,
 price: coinDetails.price_usd,
 price_change_24h: coinDetails.price_change_24h,
 fear_greed: sentiment.fear_greed ? sentiment.fear_greed.value : 28,
 vix: sentiment.vix || 16.7,
 google_trends: sentiment.google_trends_volume_btc || 79,
 ma_values: {
 ma20: coinDetails.timeframes["1h"].ma20,
 ma50: coinDetails.timeframes["1h"].ma50,
 ma200: coinDetails.timeframes["1h"].ma200
 },
 signals: scalping.filter(t => t.coin === coin).map(t => ({
 timestamp: t.fecha || new Date().toISOString(),
 type: t.tipo || "LONG",
 entry: t.precio_entrada,
 exit: t.precio_salida,
 result: t.resultado_pct,
 pattern: t.patron || "Sono Cruce"
 }))
 };
 isApi = false;
 }
 }
 }

 if (!rawData) {
 throw new Error("No se pudieron cargar datos técnicos de ninguna fuente.");
 }

 // Actualizar estado
 state.data = rawData;
 state.error = null;
 state.lastUpdate = new Date();

 // Actualizar UI
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
 console.error('❌ Error cargando datos:', error);
 state.error = error.message;
 showError(error.message);
 } finally {
 state.isLoading = false;
 hideLoading();
 }
}

/**
 * Actualizar toda la UI con los datos
 */
function updateUI(data) {
 updateScore(data.score);
 updatePrice(data.price, data.price_change_24h);
 updateSentiment(data);
 updateMovingAverages(data.ma_values);
 updateSignals(data.signals);
 updateLastUpdate();
}

/**
 * Actualizar Score Maestro
 */
function updateScore(score) {
 const scoreElement = document.getElementById('score-value');
 const scoreBar = document.getElementById('score-bar');
 const scoreStatus = document.getElementById('score-status');

 if (scoreElement) {
 scoreElement.textContent = score || '--';
 }

 if (scoreBar) {
 scoreBar.style.width = `${score}%`;
 scoreBar.className = `score-bar ${getScoreColor(score)}`;
 }

 if (scoreStatus) {
 scoreStatus.textContent = getScoreStatus(score);
 }
}

/**
 * Actualizar precio
 */
function updatePrice(price, change24h) {
 const priceUSD = document.getElementById('price-usd');
 const priceEUR = document.getElementById('price-eur');
 const change = document.getElementById('price-change');

 if (priceUSD && price) {
 priceUSD.textContent = `$${formatNumber(price)}`;
 }

 if (priceEUR && price) {
 // Conversión a euros basada en tasa real o fija
 const eurPrice = price * 0.924;
 priceEUR.textContent = `€${formatNumber(eurPrice)}`;
 }

 if (change && change24h !== undefined) {
 change.textContent = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
 change.className = change24h >= 0 ? 'positive' : 'negative';
 }
}

/**
 * Actualizar sentimiento
 */
function updateSentiment(data) {
 // Fear & Greed
 const fgElement = document.getElementById('fear-greed');
 if (fgElement && data.fear_greed !== undefined) {
 fgElement.textContent = data.fear_greed;
 fgElement.className = `indicator ${getFearGreedClass(data.fear_greed)}`;
 }

 // VIX
 const vixElement = document.getElementById('vix');
 if (vixElement && data.vix !== undefined) {
 vixElement.textContent = data.vix.toFixed(2);
 }

 // Google Trends
 const trendsElement = document.getElementById('google-trends');
 if (trendsElement && data.google_trends !== undefined) {
 trendsElement.textContent = `${data.google_trends}/100`;
 }
}

/**
 * Actualizar medias móviles
 */
function updateMovingAverages(maValues) {
 if (!maValues) return;

 const tableBody = document.getElementById('ma-table-body');
 if (!tableBody) return;

 const price = state.data?.price || 0;

 tableBody.innerHTML = `
 <tr>
 <td>1H</td>
 <td>${formatPrice(maValues.ma20)}</td>
 <td>${formatPrice(maValues.ma50)}</td>
 <td>${formatPrice(maValues.ma200)}</td>
 </tr>
 <tr>
 <td>4H</td>
 <td class="${price > maValues.ma20 ? 'bullish' : 'bearish'}">
 ${price > maValues.ma20 ? '🟢 Arriba' : '🔴 Abajo'}
 </td>
 <td class="${price > maValues.ma50 ? 'bullish' : 'bearish'}">
 ${price > maValues.ma50 ? '🟢 Arriba' : '🔴 Abajo'}
 </td>
 <td class="${price > maValues.ma200 ? 'bullish' : 'bearish'}">
 ${price > maValues.ma200 ? '🟢 Arriba' : '🔴 Abajo'}
 </td>
 </tr>
 `;
}

/**
 * Actualizar señales
 */
function updateSignals(signals) {
 const tableBody = document.getElementById('signals-table-body');
 if (!tableBody) return;

 if (!signals || signals.length === 0) {
 tableBody.innerHTML = `
 <tr>
 <td colspan="6" class="text-center text-muted">Sin señales recientes</td>
 </tr>
 `;
 return;
 }

 tableBody.innerHTML = signals.map(signal => `
 <tr>
 <td>${formatDateTime(signal.timestamp)}</td>
 <td class="${signal.type.toLowerCase()}">${signal.type}</td>
 <td>$${formatNumber(signal.entry)}</td>
 <td>${signal.exit ? '$' + formatNumber(signal.exit) : 'Abierta'}</td>
 <td class="${signal.result >= 0 ? 'positive' : 'negative'}">
 ${signal.result !== null && signal.result !== undefined ? signal.result.toFixed(2) + '%' : '--'}
 </td>
 <td>${signal.pattern}</td>
 </tr>
 `).join('');
}

/**
 * Actualizar timestamp
 */
function updateLastUpdate() {
 const element = document.getElementById('last-update');
 if (element && state.lastUpdate) {
 element.textContent = formatTime(state.lastUpdate);
 }
}

// ===== FUNCIONES DE SELECCIÓN =====

/**
 * Seleccionar moneda
 */
function selectCoin(coin) {
 if (!CONFIG.COINS[coin]) return;

 CONFIG.currentCoin = coin;

 // Actualizar UI de selector
 document.querySelectorAll('.coin-selector').forEach(btn => {
 btn.classList.toggle('active', btn.dataset.coin === coin);
 });

 // Actualizar título
 const coinInfo = CONFIG.COINS[coin];
 const titleElement = document.getElementById('coin-title');
 if (titleElement) {
 titleElement.textContent = `${coinInfo.symbol} ${coinInfo.name} (${coin})`;
 }

 // Recargar datos
 loadData(true);
}

// ===== FUNCIONES DE ESTADO UI =====

/**
 * Mostrar loading
 */
function showLoading() {
 const spinner = document.getElementById('loading-spinner');
 if (spinner) {
 spinner.classList.remove('hidden');
 }

 const statusIndicator = document.getElementById('status-indicator');
 if (statusIndicator) {
 statusIndicator.className = 'status-indicator loading';
 }
}

/**
 * Ocultar loading
 */
function hideLoading() {
 const spinner = document.getElementById('loading-spinner');
 if (spinner) {
 spinner.classList.add('hidden');
 }

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

 // Mostrar notificación
 showNotification('⚠️ Estado', message, 'warning');
}

/**
 * Mostrar notificación
 */
function showNotification(title, message, type = 'info') {
 const container = document.getElementById('notifications');
 if (!container) return;

 const notification = document.createElement('div');
 notification.className = `notification notification-${type}`;
 notification.innerHTML = `
 <div class="notification-title">${title}</div>
 <div class="notification-message">${message}</div>
 <button class="notification-close">×</button>
 `;

 container.appendChild(notification);

 // Auto-cerrar después de 5 segundos
 setTimeout(() => {
 notification.style.opacity = '0';
 setTimeout(() => notification.remove(), 300);
 }, 5000);

 // Botón cerrar
 notification.querySelector('.notification-close').addEventListener('click', () => {
 notification.remove();
 });
}

// ===== AUTO-ACTUALIZACIÓN =====

/**
 * Iniciar auto-actualización
 */
function startAutoUpdate() {
 // Limpiar timer existente
 if (state.autoUpdateTimer) {
 clearInterval(state.autoUpdateTimer);
 }

 // Nuevo timer
 state.autoUpdateTimer = setInterval(() => {
 loadData();
 }, CONFIG.UPDATE_INTERVAL);

 console.log(`⏰ Auto-actualización cada ${CONFIG.UPDATE_INTERVAL / 1000}s`);
}

/**
 * Detener auto-actualización
 */
function stopAutoUpdate() {
 if (state.autoUpdateTimer) {
 clearInterval(state.autoUpdateTimer);
 state.autoUpdateTimer = null;
 }
}

// ===== TEMA =====

/**
 * Toggle dark/light theme
 */
function toggleTheme() {
 document.body.classList.toggle('light-mode');
 const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
 localStorage.setItem('sono-theme', theme);
}

/**
 * Cargar tema guardado
 */
function loadTheme() {
 const savedTheme = localStorage.getItem('sono-theme');
 if (savedTheme === 'light') {
 document.body.classList.add('light-mode');
 }
}

// ===== UTILIDADES =====

/**
 * Formatear número con comas
 */
function formatNumber(num) {
 if (!num) return '--';
 return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Formatear precio con decimales
 */
function formatPrice(price) {
 if (!price) return '--';
 return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formatear fecha/hora
 */
function formatDateTime(timestamp) {
 if (!timestamp) return '--';
 const date = new Date(timestamp);
 return date.toLocaleString('es-ES', {
 day: '2-digit',
 month: '2-digit',
 hour: '2-digit',
 minute: '2-digit'
 });
}

/**
 * Formatear hora
 */
function formatTime(date) {
 return date.toLocaleTimeString('es-ES', {
 hour: '2-digit',
 minute: '2-digit',
 second: '2-digit'
 });
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
 * Obtener estado según score
 */
function getScoreStatus(score) {
 if (score < 20) return 'PÁNICO EXTREMO';
 if (score < 35) return 'ACUMULACIÓN';
 if (score < 45) return 'ACUMULACIÓN MODERADA';
 if (score < 55) return 'NEUTRAL';
 if (score < 65) return 'OPTIMISMO';
 if (score < 80) return 'EUFORIA';
 return 'BURBUJA';
}

/**
 * Obtener clase Fear & Greed
 */
function getFearGreedClass(value) {
 if (value < 25) return 'extreme-fear';
 if (value < 45) return 'fear';
 if (value < 55) return 'neutral';
 if (value < 75) return 'greed';
 return 'extreme-greed';
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.SonoApp = {
 loadData,
 selectCoin,
 toggleTheme,
 state: () => state,
 config: () => CONFIG
};

console.log('✅ Sono App cargada con éxito');