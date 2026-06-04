/**
 * app.module.js — ES Module bridge for Dashboard V6
 * Carga el data layer completo + indicadores y los expone al window
 * para que app.js (script normal) pueda consumirlos.
 *
 * Uso en index.html:
 *   <script type="module" src="/app.module.js">
 *   <script src="/app.js">
 */
 
// ── Data layer ──
import { fetchMarketData, fetchMacroOnly } from './js/data/adapters.js';

// ── Core ──
import { ASSETS, TIMEFRAMES, DEFAULT_TF, SCORE_BARRERAS, SWR_TTLS_MS, EUR_FALLBACK, FNG_FALLBACK, VIX_FALLBACK } from './js/core/config.js';
import { store } from './js/core/state.js';
import { fmtPrice, fmtMarketCap, fmtChange, fmtEurPrice, fmtTime, fmtDateTime } from './js/core/formatters.js';

// ── Indicadores ──
import { getMAs, clearMACache } from './js/indicators/ma.js';
import { rsi, classifyRsi } from './js/indicators/rsi.js';
import { adx, classifyAdx } from './js/indicators/adx.js';
import { bb, classifyBB } from './js/indicators/bb.js';
import { computeScore, classifyScore, macroScore, regimeName, loadConfig as loadScoreConfig } from './js/indicators/score-maestro.js';
import { findSR } from './js/indicators/ranges.js';
import { computeConfluence } from './js/indicators/confluence.js';

// ── Exponer todo al window para app.js ──
window._moduleExports = {
  // Data
  fetchMarketData,
  fetchMacroOnly,
  
  // Core
  ASSETS,
  TIMEFRAMES,
  DEFAULT_TF,
  SCORE_BARRERAS,
  SWR_TTLS_MS,
  EUR_FALLBACK,
  FNG_FALLBACK,
  VIX_FALLBACK,
  store,
  
  // Formatters
  fmtPrice,
  fmtMarketCap,
  fmtChange,
  fmtEurPrice,
  fmtTime,
  fmtDateTime,
  
  // Indicadores
  getMAs,
  clearMACache,
  rsi,
  classifyRsi,
  adx,
  classifyAdx,
  bb,
  classifyBB,
  computeScore,
  classifyScore,
  macroScore,
  regimeName,
  loadScoreConfig,
  findSR,
  computeConfluence,
};

// También exponer directamente en window para compatibilidad
window.fetchMarketData = fetchMarketData;
window.fetchMacroOnly = fetchMacroOnly;
window._usingModule = true;

console.log('[SONO] ES module data layer + indicators loaded');
