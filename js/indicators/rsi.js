/**
 * js/indicators/rsi.js — Relative Strength Index (Cutler's RSI)
 * Periodo: 14 (default)
 * Alineado con calc_rsi en sono_score.py
 */

import { RSI_PERIOD } from '../core/config.js';

/**
 * Calcular RSI Cutler (RSI sin Wilder Smoothing)
 * @param {Array<number>} closes - array de precios close
 * @param {number} [period=14]
 * @returns {number|null} 0-100
 */
export function rsi(closes, period) {
  period = period || RSI_PERIOD;
  if (!closes || closes.length < period + 1) return null;

  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = +closes[i] - +closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / (avgLoss || 0.0001);
  return Math.round(100 - 100 / (1 + rs));
}

/**
 * Clasificar valor RSI
 * @param {number|null} val
 * @returns {{ label: string, color: string }}
 */
export function classifyRsi(val) {
  if (val == null) return { label: '--', color: '#64748b' };
  if (val >= 70) return { label: 'Sobrecompra', color: '#ef4444' };
  if (val >= 60) return { label: 'Alto', color: '#f59e0b' };
  if (val >= 45) return { label: 'Neutral', color: '#3b82f6' };
  if (val >= 30) return { label: 'Bajo', color: '#3b82f6' };
  return { label: 'Sobreventa', color: '#22c55e' };
}
