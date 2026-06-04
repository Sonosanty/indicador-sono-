/**
 * js/indicators/score-maestro.js — Score Maestro Unificado
 * Alineado con sono_score.py (Python) — fuente canónica
 * Lee son-score-config.json como fuente de verdad para umbrales
 *
 * P1: MA cruzados (max 35)
 *   MA6 > MA40 = +12
 *   MA6 > MA70 = +10
 *   MA40 > MA200 = +13
 *
 * P2: Momentum (max 35)
 *   ADX > 35 = +15, > 25 = +10, else +3
 *   RSI >= 50 y < 70 = +12, >= 35 = +7, else +2
 *   Precio > MA200 = +8
 *
 * P3: Bollinger %B (max 30)
 *   %B < 0.15 = +28
 *   %B < 0.35 = +20
 *   %B < 0.65 = +14
 *   %B < 0.85 = +7
 *   else = +2
 */

import { sma, getMAs } from './ma.js';
import { rsi } from './rsi.js';
import { adx } from './adx.js';
import { bb } from './bb.js';
import { SCORE_PESOS, SCORE_BARRERAS } from '../core/config.js';

let SCORE_CFG = null;

/**
 * Cargar configuración desde son-score-config.json
 * @returns {Promise<void>}
 */
export async function loadConfig() {
  try {
    const r = await fetch('/sono-score-config.json', { cache: 'no-store' });
    SCORE_CFG = await r.json();
  } catch {
    // Usar defaults del config.js
    SCORE_CFG = null;
  }
}

/**
 * Calcular Score Maestro completo desde klines raw
 * @param {Array<Array>} klines - velas [time, open, high, low, close, volume]
 * @param {string} timeframeKey - para cache key
 * @returns {object|null} { sc, p1, p2, p3, ma6, ma40, ma70, ma200, price, r, a, pb }
 */
export function computeScore(klines, timeframeKey) {
  if (!klines || klines.length < 30) return null;

  const closes = klines.map(k => +k[4]);
  const highs = klines.map(k => +k[2]);
  const lows = klines.map(k => +k[3]);
  const price = closes[closes.length - 1];

  // MAs via módulo ma.js
  const mas = getMAs(klines, timeframeKey || 'default');

  // RSI + ADX
  const r = rsi(closes);
  const a = adx(highs, lows, closes);

  // Bollinger %B
  const bp = bb(closes);
  const pb = bp.pb;

  // --- P1: Tendencia (max 35) ---
  let p1 = 0;
  if (mas.ma6 !== null && mas.ma40 !== null) p1 += mas.ma6 > mas.ma40 ? 12 : 0;
  if (mas.ma6 !== null && mas.ma70 !== null) p1 += mas.ma6 > mas.ma70 ? 10 : 0;
  if (mas.ma40 !== null && mas.ma200 !== null) p1 += mas.ma40 > mas.ma200 ? 13 : 0;

  // --- P2: Momentum (max 35) ---
  let p2 = 0;
  if (a !== null) {
    p2 += a > 35 ? 15 : a > 25 ? 10 : 3;
  }
  if (r !== null) {
    p2 += r >= 50 && r < 70 ? 12 : r >= 35 ? 7 : 2;
  }
  if (mas.ma200 !== null) {
    p2 += price > mas.ma200 ? 8 : 0;
  }

  // --- P3: Bollinger (max 30) ---
  let p3 = 0;
  if (pb !== null) {
    if (pb < 0.15) p3 = 28;
    else if (pb < 0.35) p3 = 20;
    else if (pb < 0.65) p3 = 14;
    else if (pb < 0.85) p3 = 7;
    else p3 = 2;
  }

  const total = Math.min(100, Math.round(p1 + p2 + p3));

  return {
    sc: total,
    p1: Math.round(p1),
    p2: Math.round(p2),
    p3: Math.round(p3),
    ma6: mas.ma6,
    ma40: mas.ma40,
    ma70: mas.ma70,
    ma200: mas.ma200,
    ma200Avail: mas.ma200Avail,
    price,
    r,
    a,
    pb,
    tLen: closes.length,
  };
}

/**
 * Clasificar valor de score según barreras configuradas
 * @param {number} s - score 0-100
 * @returns {{ label: string, cssClass: string, level: string }}
 */
export function classifyScore(s) {
  const B = SCORE_CFG ? SCORE_CFG.barreras : SCORE_BARRERAS;

  if (s >= B.compra_fuerte) return { label: 'COMPRA FUERTE', cssClass: 'pgg', level: 'strong_long' };
  if (s >= B.compra) return { label: 'COMPRA', cssClass: 'pgg', level: 'long' };
  if (s >= B.acumulacion) return { label: 'ACUMULAR', cssClass: 'pb', level: 'accumulate' };
  if (s >= B.neutral) return { label: 'NEUTRAL', cssClass: 'pgg2', level: 'neutral' };
  if (s >= B.distribucion) return { label: 'VENTA', cssClass: 'pw', level: 'distribute' };
  if (s >= B.venta) return { label: 'VENTA FUERTE', cssClass: 'prr', level: 'short' };
  return { label: 'CAPITULACIÓN', cssClass: 'prr', level: 'capitulate' };
}

/**
 * Calcular score macro (Fear & Greed + VIX + Dominancia)
 * @param {number} fng - Fear & Greed 0-100
 * @param {number} vix - VIX index
 * @param {number} dom - BTC dominance %
 * @returns {number} 0-6
 */
export function macroScore(fng, vix, dom) {
  let score = 0;
  if (fng) {
    score += fng < 20 ? 2 : fng < 40 ? 1 : fng > 80 ? -1 : 0;
  }
  if (vix) {
    score += vix < 15 ? 1 : vix > 25 ? -1 : 0;
  }
  score += dom > 58 ? 1 : dom < 45 ? -1 : 0;
  return Math.max(0, Math.min(6, score + 2));
}

/**
 * Nombre del régimen basado en score macro
 */
export function regimeName(macroSc, fng, dom) {
  if (macroSc >= 70 && fng < 40) return { name: 'Acum. agresiva', tag: 'LONG SWING', risk: 'Bajo', css: 'pgg' };
  if (macroSc >= 62) return { name: 'Tendencia alcista', tag: 'LONG', risk: 'Medio', css: 'pgg' };
  if (macroSc >= 50 && dom > 55) return { name: 'Rotación BTC', tag: 'LONG BTC', risk: 'Medio', css: 'pb' };
  if (macroSc >= 42) return { name: 'Consolidación', tag: 'NEUTRAL', risk: 'Medio', css: 'pgg2' };
  if (macroSc >= 30) return { name: 'Distribución', tag: 'SHORT', risk: 'Alto', css: 'pw' };
  return { name: 'Capitulación', tag: 'CASH', risk: 'Muy alto', css: 'prr' };
}
