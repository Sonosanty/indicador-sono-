/**
 * js/indicators/ranges.js — Soportes y Resistencias
 * Basado en pivotes + niveles clave (MAs redondeados)
 */

/**
 * Encontrar niveles de soporte y resistencia desde klines
 * Método: pivotes de precio redondeados
 * @param {Array<Array>} klines
 * @param {object} [opts]
 * @param {number} [opts.roundTo] - redondeo (default 100 para BTC)
 * @returns {{ r2, r1, pivot, s1, s2 }}
 */
export function findSR(klines, opts) {
  if (!klines || klines.length < 10) {
    return { r2: null, r1: null, pivot: null, s1: null, s2: null };
  }

  const roundTo = (opts && opts.roundTo) || 100;
  const last = klines.length - 1;
  const high = Math.max(...klines.slice(-20).map(k => +k[2]));
  const low = Math.min(...klines.slice(-20).map(k => +k[3]));
  const close = +klines[last][4];

  const pivot = (high + low + close) / 3;
  const rc = (level) => Math.round(level / roundTo) * roundTo;

  return {
    r2: rc(pivot + (high - low)),
    r1: rc(2 * pivot - low),
    pivot: rc(pivot),
    s1: rc(2 * pivot - high),
    s2: rc(pivot - (high - low)),
  };
}
