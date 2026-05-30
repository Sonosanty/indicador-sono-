// ═══════════════════════════════════════════════════════════════
// scoreEngine.js — ALGORITMO ÚNICO DE SCORE (bot + SPA)
// Fuente de verdad: sono-score-config.json
// Cualquier cambio de umbrales, pesos o etiquetas se hace
// ÚNICAMENTE en el JSON; este código lo consume.
// ═══════════════════════════════════════════════════════════════

import scoreConfig from '../sono-score-config.json'

// ── helpers ──────────────────────────────────────────────
export const calcMA = (arr, p) =>
  arr.length < p ? null : arr.slice(-p).reduce((s, v) => s + v, 0) / p

export const calcRSI = (closes, p = 14) => {
  if (closes.length <= p) return null
  const diffs = closes.slice(-(p + 1))
    .map((v, i, a) => (i > 0 ? v - a[i - 1] : 0)).slice(1)
  const gains  = diffs.filter(d => d > 0).reduce((s, v) => s + v, 0) / p
  const losses = diffs.filter(d => d < 0).reduce((s, v) => s + Math.abs(v), 0) / p
  if (losses === 0) return 100
  return +(100 - 100 / (1 + gains / losses)).toFixed(2)
}

export const calcBB = (closes, p = 20, mult = 2) => {
  if (closes.length < p) return null
  const sl  = closes.slice(-p)
  const ma  = sl.reduce((s, v) => s + v, 0) / p
  const std = Math.sqrt(sl.reduce((s, v) => s + (v - ma) ** 2, 0) / p)
  return { upper: ma + mult * std, middle: ma, lower: ma - mult * std, std, pct: std / ma }
}

export const calcATR = (candles, p = 14) => {
  if (candles.length < p + 1) return null
  const trs = candles.slice(-(p + 1)).map((c, i, a) =>
    i === 0 ? c.high - c.low
    : Math.max(c.high - c.low, Math.abs(c.high - a[i - 1].close), Math.abs(c.low - a[i - 1].close))
  ).slice(1)
  return trs.reduce((s, v) => s + v, 0) / p
}

export const calcADX = (candles, p = 14) => {
  if (candles.length < p * 2) return null
  const sl = candles.slice(-(p * 2))
  let dmP = 0, dmM = 0, tr = 0
  for (let i = 1; i < sl.length; i++) {
    const c = sl[i], pv = sl[i - 1]
    const up = c.high - pv.high, dn = pv.low - c.low
    dmP += up > dn && up > 0 ? up : 0
    dmM += dn > up && dn > 0 ? dn : 0
    tr  += Math.max(c.high - c.low, Math.abs(c.high - pv.close), Math.abs(c.low - pv.close))
  }
  if (tr === 0) return 0
  const diP = (dmP / tr) * 100, diM = (dmM / tr) * 100
  return +((Math.abs(diP - diM) / (diP + diM + 0.001)) * 100).toFixed(1)
}

// ── Score — Misma lógica para bot Python y SPA JS ────────
//   Se exponen computeScore() con firma idéntica y
//   classifyScore() si solo tenemos un número.
//   Ver también sono-score-config.json para los valores.
// ─────────────────────────────────────────────────────────

const B = scoreConfig.barreras
const W = scoreConfig.pesos_maximos

/**
 * Calcula el Score Maestro 0-100 a partir de velas OHLC.
 * @param {{open,high,low,close}[]} candles - Mínimo 210 velas
 * @returns {Object|null} { total, level, label, action, biasColor, labelKey, p1,p2,p3, ... }
 */
export function computeScore(candles) {
  if (!candles || candles.length < 210) return null

  const closes = candles.map(c => c.close)
  const price  = closes.at(-1)
  const ma6   = calcMA(closes, 6)
  const ma40  = calcMA(closes, 40)
  const ma70  = calcMA(closes, 70)
  const ma200 = calcMA(closes, 200)
  const bb    = calcBB(closes, 20)
  const adx   = calcADX(candles, 14)
  const rsi   = calcRSI(closes, 14)
  const atr   = calcATR(candles, 14)

  // Pilar 1 — Cruces MA (max 35)
  let p1 = 0; const p1d = []
  if (ma6 && ma40)  { const ok = ma6 > ma40;  p1 += ok ? 12 : 0; p1d.push({ l: 'MA6 > MA40',   pts: ok?12:0, max:12, up:ok }) }
  if (ma6 && ma70)  { const ok = ma6 > ma70;  p1 += ok ? 10 : 0; p1d.push({ l: 'MA6 > MA70',   pts: ok?10:0, max:10, up:ok }) }
  if (ma40 && ma200){ const ok = ma40 > ma200;p1 += ok ? 13 : 0; p1d.push({ l: 'MA40 > MA200', pts: ok?13:0, max:13, up:ok }) }

  // Pilar 2 — Momentum / ADX / RSI (max 35)
  let p2 = 0; const p2d = []
  if (adx !== null) {
    const pts = adx > 35 ? 15 : adx > 25 ? 10 : 3
    p2 += pts
    p2d.push({ l: `ADX ${adx.toFixed(1)}`, pts, max:15, up: adx > 25 })
  }
  if (rsi !== null) {
    const pts = (rsi > 50 && rsi < 70) ? 12 : rsi >= 35 ? 7 : 2
    p2 += pts
    p2d.push({ l: `RSI ${rsi.toFixed(1)}`, pts, max:12, up: rsi > 50 && rsi < 70 })
  }
  if (ma200) {
    const ok = price > ma200
    p2 += ok ? 8 : 0
    p2d.push({ l: 'Precio > MA200', pts: ok?8:0, max:8, up:ok })
  }

  // Pilar 3 — Bollinger (max 30)
  let p3 = 0; const p3d = []
  if (bb) {
    const range = bb.upper - bb.lower
    const pctB  = range > 0 ? (price - bb.lower) / range : 0.5
    const pts   = pctB < 0.15 ? 28 : pctB < 0.35 ? 20 : pctB < 0.65 ? 14 : pctB < 0.85 ? 7 : 2
    const lbl   = pctB < 0.15 ? 'Sobreventa extrema'
                : pctB < 0.35 ? 'Zona baja'
                : pctB < 0.65 ? 'Banda media'
                : pctB < 0.85 ? 'Zona alta'
                :               'Sobrecompra'
    p3 += pts
    p3d.push({ l: lbl, pts, max:28, up: pctB < 0.5 })
    p3d.push({ l: `%B: ${(pctB*100).toFixed(0)}%`, pts:0, max:0, info:true })
  }

  const total = Math.min(100, Math.round(p1 + p2 + p3))
  return classifyScore(total, { p1, p2, p3, p1d, p2d, p3d, ma6, ma40, ma70, ma200, bb, adx, rsi, atr, price })
}

/**
 * Clasifica un total 0-100 en label/level/action usando el contrato JSON.
 * Decorado adicional opcional con datos técnicos.
 */
export function classifyScore(total, extra = {}) {
  let labelKey
  if      (total >= B.compra_fuerte) labelKey = 'strong_long'
  else if (total >= B.compra)        labelKey = 'long'
  else if (total >= B.acumulacion)   labelKey = 'accumulate'
  else if (total >= B.neutral)       labelKey = 'neutral'
  else if (total >= B.distribucion)  labelKey = 'distribute'
  else if (total >= B.venta)         labelKey = 'short'
  else                                labelKey = 'capitulate'

  return {
    total,
    level:   scoreConfig.niveles[labelKey],
    label:   scoreConfig.labels[labelKey],
    action:  scoreConfig.acciones[labelKey],
    biasColor: scoreConfig.colores[labelKey],
    labelKey,
    ...extra
  }
}
