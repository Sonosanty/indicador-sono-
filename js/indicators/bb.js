/**
 * js/indicators/bb.js — Bollinger Bands %B
 * Periodo: 20, Desviaciones: 2 (default)
 * Alineado con calc_bb en sono_score.py
 */

import { BB_PERIOD, BB_STDDEV } from '../core/config.js';

/**
 * Calcular Bollinger %B
 * %B = (price - lower) / (upper - lower)
 * @param {Array<number>} closes
 * @param {number} [period=20]
 * @param {number} [stddev=2]
 * @returns {{ pb: number|null, upper: number|null, middle: number|null, lower: number|null }}
 */
export function bb(closes, period, stddev) {
  period = period || BB_PERIOD;
  stddev = stddev || BB_STDDEV;

  if (!closes || closes.length < period) {
    return { pb: null, upper: null, middle: null, lower: null };
  }

  const slice = closes.slice(-period);
  let mean = 0;
  for (let i = 0; i < period; i++) mean += +slice[i];
  mean /= period;

  let variance = 0;
  for (let i = 0; i < period; i++) variance += (+slice[i] - mean) * (+slice[i] - mean);
  variance /= period;
  const sd = Math.sqrt(variance);

  const upper = mean + stddev * sd;
  const lower = mean - stddev * sd;
  const price = +closes[closes.length - 1];

  if (upper - lower === 0) return { pb: 0.5, upper, middle: mean, lower };

  return {
    pb: (price - lower) / (upper - lower),
    upper,
    middle: mean,
    lower,
  };
}

/**
 * Clasificar %B
 * @param {number|null} pb - Percent B (0-1)
 * @returns {{ label: string, color: string, zone: string }}
 */
export function classifyBB(pb) {
  if (pb == null) return { label: '--', color: '#64748b', zone: 'unknown' };
  if (pb < 0.15) return { label: 'Oversold extremo', color: '#22c55e', zone: 'oversold_extreme' };
  if (pb < 0.35) return { label: 'Oversold', color: '#22c55e', zone: 'oversold' };
  if (pb < 0.65) return { label: 'Neutral', color: '#3b82f6', zone: 'neutral' };
  if (pb < 0.85) return { label: 'Overbought', color: '#f59e0b', zone: 'overbought' };
  return { label: 'Overbought extremo', color: '#ef4444', zone: 'overbought_extreme' };
}
