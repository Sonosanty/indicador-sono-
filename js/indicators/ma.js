/**
 * js/indicators/ma.js — Moving Averages
 * SMA simple con cache por hash de velas
 */

let _cache = {};

/**
 * Calcular SMA
 * @param {Array<number>} values - array de precios close
 * @param {number} period - 6 | 40 | 70 | 200
 * @returns {number|null}
 */
export function sma(values, period) {
  if (!values || values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += +values[i];
  }
  return sum / period;
}

/**
 * Generar hash para cache basado en timestamp de última vela
 * @param {Array<Array>} klines - velas raw
 * @returns {string}
 */
export function hashKlines(klines) {
  if (!klines || klines.length === 0) return '';
  const last = klines[klines.length - 1];
  return klines.length + '_' + (+last[0] || 0);
}

/**
 * Obtener MAs con cache desde klines raw
 * @param {Array<Array>} klines - velas [time,open,high,low,close,volume]
 * @param {string} timeframeKey - '1m'|'3m'|...
 * @returns {object} { ma6, ma40, ma70, ma200, ma200Avail }
 */
export function getMAs(klines, timeframeKey) {
  if (!klines || klines.length < 6) {
    return { ma6: null, ma40: null, ma70: null, ma200: null, ma200Avail: false };
  }

  const h = hashKlines(klines);
  const tf = timeframeKey || 'default';
  const cacheKey = tf + '_' + h;

  if (_cache[cacheKey]) {
    return _cache[cacheKey];
  }

  const closes = klines.map(k => +k[4]);
  const tLen = closes.length;

  const result = {
    ma6: tLen >= 6 ? sma(closes, 6) : null,
    ma40: tLen >= 40 ? sma(closes, 40) : null,
    ma70: tLen >= 70 ? sma(closes, 70) : null,
    ma200: tLen >= 200 ? sma(closes, 200) : null,
    ma200Avail: tLen >= 200,
  };

  _cache[cacheKey] = result;
  return result;
}

/**
 * Limpiar cache
 */
export function clearMACache() {
  _cache = {};
}
