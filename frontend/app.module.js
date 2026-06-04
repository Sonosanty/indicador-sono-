/**
 * app.module.js — ES Module bridge for Dashboard V6
 * Carga el data layer (js/data/adapters.js) y expone al window.
 * Se carga ANTES que app.js con <script type="module" src="/app.module.js"> 
 */
import { fetchMarketData, fetchMacroOnly } from './js/data/adapters.js';

window._fetchMarketData = fetchMarketData;
window._fetchMacroOnly = fetchMacroOnly;
window._usingModule = true;

console.log('[SONO] ES module data layer loaded');
