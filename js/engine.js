/* ══════════════════════════════════════════════════════════════
   SONO ENGINE v5.0 — Motor de Indicadores Técnicos
   Calcula: SMA, EMA, RSI, ADX, Bollinger Bands, Score Maestro
   ══════════════════════════════════════════════════════════════ */

const SonoEngine = (() => {

  /** SMA simple sobre array de closes */
  function sma(closes, n) {
    if (closes.length < n) return null;
    const slice = closes.slice(-n);
    return slice.reduce((a, b) => a + b, 0) / n;
  }

  /** EMA exponencial */
  function ema(closes, n) {
    if (closes.length < n) return null;
    const k = 2 / (n + 1);
    let val = closes.slice(0, n).reduce((a, b) => a + b, 0) / n;
    for (let i = n; i < closes.length; i++) {
      val = closes[i] * k + val * (1 - k);
    }
    return val;
  }

  /** RSI(14) */
  function rsi(closes, period = 14) {
    if (closes.length < period + 1) return null;
    const recent = closes.slice(-(period + 30));
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = recent[i] - recent[i - 1];
      if (diff > 0) gains += diff; else losses += Math.abs(diff);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /** ADX(14) — retorna { adx, pdi, mdi } */
  function adx(highs, lows, closes, period = 14) {
    const n = closes.length;
    if (n < period * 2 + 1) return null;
    const H = highs.slice(-(period * 3));
    const L = lows.slice(-(period * 3));
    const C = closes.slice(-(period * 3));
    const TRs = [], pDMs = [], mDMs = [];
    for (let i = 1; i < H.length; i++) {
      const trA = H[i] - L[i];
      const trB = Math.abs(H[i] - C[i - 1]);
      const trC = Math.abs(L[i] - C[i - 1]);
      TRs.push(Math.max(trA, trB, trC));
      const upMove = H[i] - H[i - 1];
      const downMove = L[i - 1] - L[i];
      pDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
      mDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    // Wilder smoothing
    let sTR = TRs.slice(0, period).reduce((a, b) => a + b, 0);
    let sPDM = pDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let sMDM = mDMs.slice(0, period).reduce((a, b) => a + b, 0);
    const DXs = [];
    const calcDX = (p, m, tr) => {
      if (tr === 0) return 0;
      const pDI = 100 * p / tr;
      const mDI = 100 * m / tr;
      const sum = pDI + mDI;
      return sum === 0 ? 0 : 100 * Math.abs(pDI - mDI) / sum;
    };
    DXs.push(calcDX(sPDM, sMDM, sTR));
    for (let i = period; i < TRs.length; i++) {
      sTR = sTR - sTR / period + TRs[i];
      sPDM = sPDM - sPDM / period + pDMs[i];
      sMDM = sMDM - sMDM / period + mDMs[i];
      DXs.push(calcDX(sPDM, sMDM, sTR));
    }
    const adxVal = DXs.slice(-period).reduce((a, b) => a + b, 0) / period;
    const pDI = sTR > 0 ? 100 * sPDM / sTR : 0;
    const mDI = sTR > 0 ? 100 * sMDM / sTR : 0;
    return { adx: adxVal, pdi: pDI, mdi: mDI };
  }

  /** Bollinger Bands(20, 2) */
  function bollinger(closes, period = 20, mult = 2) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mid, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = mid + mult * std;
    const lower = mid - mult * std;
    const pctB = (closes[closes.length - 1] - lower) / (upper - lower);
    return { upper, mid, lower, pctB };
  }

  /**
   * SCORE MAESTRO 0-100
   * P1 (35pts): Cruces MA6×MA70, Precio vs MA40, Precio vs MA200
   * P2 (35pts): ADX fuerza + RSI posición
   * P3 (30pts): Bollinger %B
   */
  function scoreMaestro(closes, highs, lows) {
    const price = closes[closes.length - 1];
    let p1 = 0, p2 = 0, p3 = 0;
    const detail = {};

    // Pilar 1: MAs
    const ma6   = sma(closes, 6);
    const ma40  = sma(closes, 40);
    const ma70  = sma(closes, 70);
    const ma200 = sma(closes, 200);

    detail.ma6 = ma6; detail.ma40 = ma40; detail.ma70 = ma70; detail.ma200 = ma200;

    if (ma6 && ma70) {
      const ratio = (ma6 - ma70) / ma70;
      p1 += Math.min(15, Math.max(0, (ratio * 1000 + 7.5)));
    }
    if (ma40) {
      p1 += price > ma40 ? 10 : 0;
    }
    if (ma200) {
      p1 += price > ma200 ? 10 : 0;
    }

    // Pilar 2: ADX + RSI
    const rsiVal = rsi(closes);
    const adxVal = adx(highs, lows, closes);
    detail.rsi = rsiVal; detail.adxData = adxVal;

    if (adxVal) {
      if (adxVal.adx > 40) p2 += 15;
      else if (adxVal.adx > 25) p2 += 10;
      else if (adxVal.adx > 15) p2 += 5;
    }
    if (rsiVal !== null) {
      if (rsiVal > 60 && rsiVal < 80) p2 += 20;
      else if (rsiVal > 50 && rsiVal <= 60) p2 += 14;
      else if (rsiVal >= 40 && rsiVal <= 50) p2 += 8;
      else if (rsiVal > 20 && rsiVal < 40) p2 += 4;
    }

    // Pilar 3: Bollinger
    const bb = bollinger(closes);
    detail.bb = bb;

    if (bb) {
      const pB = bb.pctB;
      if (pB > 0.5 && pB < 0.85) p3 += 30;
      else if (pB >= 0.85) p3 += 15;
      else if (pB >= 0.3 && pB <= 0.5) p3 += 20;
      else if (pB >= 0 && pB < 0.3) p3 += 8;
    }

    const score = Math.round(Math.min(100, Math.max(0, p1 + p2 + p3)));
    const signal = score >= 60 ? 'LONG' : score <= 40 ? 'SHORT' : 'ESPERAR';

    return { score, p1: Math.round(p1), p2: Math.round(p2), p3: Math.round(p3), signal, detail };
  }

  /** Señal de texto según RSI */
  function rsiLabel(v) {
    if (v === null) return '--';
    if (v > 70) return 'SOBRECOMPRA';
    if (v > 60) return 'ALCISTA';
    if (v < 30) return 'SOBREVENTA';
    if (v < 40) return 'BAJISTA';
    return 'NEUTRAL';
  }

  /** Presión de mercado (bias) basada en ADX + RSI */
  function pressurePct(adxData, rsiVal) {
    if (!adxData || rsiVal === null) return 50;
    let p = 50;
    if (adxData.pdi > adxData.mdi) p += 15;
    else p -= 15;
    if (rsiVal > 55) p += 10;
    else if (rsiVal < 45) p -= 10;
    return Math.min(95, Math.max(5, p));
  }

  return { sma, ema, rsi, adx, bollinger, scoreMaestro, rsiLabel, pressurePct };
})();
