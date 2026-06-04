/**
 * js/indicators/confluence.js — Confluencia de señales multi-timeframe
 * Orquesta scores de múltiples TFs para determinar presión direccional
 */

import { computeScore, classifyScore } from './score-maestro.js';
import { TIMEFRAMES } from '../core/config.js';

/**
 * Calcular confluencia multi-timeframe
 * @param {object} klinesByTf - { '1m': [...], '3m': [...], '5m': [...], '15m': [...], '1h': [...] }
 * @returns {object} { scores, avgScore, pressure, signals, mtfSummary }
 */
export function computeConfluence(klinesByTf) {
  const tfs = Object.keys(TIMEFRAMES).filter(tf => tf !== '3d');
  const scores = {};
  let totalScore = 0;
  let count = 0;

  tfs.forEach(tf => {
    const k = klinesByTf[tf];
    if (k && k.length >= 30) {
      const s = computeScore(k, tf);
      if (s) {
        scores[tf] = s;
        totalScore += s.sc;
        count++;
      }
    }
  });

  const avgScore = count > 0 ? Math.round(totalScore / count) : null;

  // Señales individuales
  const signals = {};
  Object.entries(scores).forEach(([tf, s]) => {
    const cls = classifyScore(s.sc);
    signals[tf] = {
      score: s.sc,
      label: cls.label,
      cssClass: cls.cssClass,
      r: s.r,
      a: s.a,
    };
  });

  // Presión general (0 = venta fuerte, 50 = neutral, 100 = compra fuerte)
  const pressure = avgScore !== null ? avgScore : 50;

  // Resumen MTF
  const longs = Object.values(signals).filter(s => s.score >= 52).length;
  const shorts = Object.values(signals).filter(s => s.score < 42).length;
  const neutrals = count - longs - shorts;

  const mtfSummary = {
    total: count,
    longs,
    shorts,
    neutrals,
    bias: longs > shorts ? 'alcista' : shorts > longs ? 'bajista' : 'neutral',
  };

  return { scores, avgScore, pressure, signals, mtfSummary };
}
