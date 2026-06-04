/**
 * js/core/formatters.js — Formatos de número, moneda, porcentajes, tiempo
 */

/**
 * Formatear precio con sufijo
 * @param {number|null} n
 * @returns {string}
 */
export function fmtPrice(n) {
  if (n == null || isNaN(n)) return '---';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Formatear market cap con sufijo T/B/M
 * @param {number|null} n
 * @returns {string}
 */
export function fmtMarketCap(n) {
  if (n == null || isNaN(n)) return '---';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toFixed(0);
}

/**
 * Formatear cambio porcentual con signo
 * @param {number|null} n
 * @returns {string}
 */
export function fmtChange(n) {
  if (n == null || isNaN(n)) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

/**
 * Formatear precio en EUR
 * @param {number} usdPrice
 * @param {number} eurUsd
 * @returns {string}
 */
export function fmtEurPrice(usdPrice, eurUsd) {
  if (!usdPrice || !eurUsd) return '--';
  const eur = usdPrice / eurUsd;
  return '€' + Math.round(eur).toLocaleString('en-US');
}

/**
 * Formatear timestamp a hora local
 * @param {number} ts - Unix ms
 * @returns {string}
 */
export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formatear timestamp a fecha + hora completa
 */
export function fmtDateTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('es-ES');
}

/**
 * Clasificar valor dentro de un rango
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number} 0-100
 */
export function pctInRange(val, min, max) {
  if (max === min) return 50;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
}

/**
 * Redondear a N decimales
 */
export function round(n, decimals) {
  if (decimals == null) decimals = 0;
  const mult = Math.pow(10, decimals);
  return Math.round(n * mult) / mult;
}
