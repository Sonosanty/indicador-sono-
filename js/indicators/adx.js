/**
 * js/indicators/adx.js — Average Directional Index
 * Periodo: 14 (default)
 * Alineado con calc_adx en sono_score.py
 */

import { ADX_PERIOD } from '../core/config.js';

/**
 * Calcular ADX 14
 * @param {Array<number>} highs
 * @param {Array<number>} lows
 * @param {Array<number>} closes
 * @param {number} [period=14]
 * @returns {number|null} 0-100
 */
export function adx(highs, lows, closes, period) {
  period = period || ADX_PERIOD;
  if (!closes || closes.length < period * 2) return null;

  const pD = [], mD = [], tr = [];
  for (let i = 1; i < closes.length; i++) {
    const upMove = +highs[i] - +highs[i - 1];
    const downMove = +lows[i - 1] - +lows[i];
    pD.push(upMove > downMove && upMove > 0 ? upMove : 0);
    mD.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(
      +highs[i] - +lows[i],
      Math.abs(+highs[i] - +closes[i - 1]),
      Math.abs(+lows[i] - +closes[i - 1])
    ));
  }

  let sumPD = 0, sumMD = 0, sumTR = 0;
  for (let i = pD.length - period; i < pD.length; i++) {
    sumPD += pD[i];
    sumMD += mD[i];
    sumTR += tr[i];
  }

  sumTR = sumTR || 1;
  const pDI = Math.round(100 * sumPD / sumTR);
  const mDI = Math.round(100 * sumMD / sumTR);

  if (pDI + mDI === 0) return 0;
  return Math.round(Math.abs(pDI - mDI) / ((pDI + mDI) || 1) * 100);
}

/**
 * Clasificar fuerza de tendencia según ADX
 * @param {number|null} val
 * @returns {{ label: string, color: string }}
 */
export function classifyAdx(val) {
  if (val == null) return { label: '--', color: '#64748b' };
  if (val >= 35) return { label: 'Tendencia fuerte', color: '#22c55e' };
  if (val >= 25) return { label: 'Tendencia moderada', color: '#f59e0b' };
  return { label: 'Rango / Lateral', color: '#64748b' };
}
