/**
 * js/data/kucoin.js — KuCoin REST API adapter
 * Fallback para cuando Binance no responde (especialmente en metodo.html)
 * Incluye mapper defensivo con deteccion de columnas
 */

import { fetchWithTimeout } from '../core/cache.js';

const BASE = 'https://api.kucoin.com';

const SYMBOL_MAP = {
  BTC: 'BTC-USDT',
  ETH: 'ETH-USDT',
  SOL: 'SOL-USDT',
  XRP: 'XRP-USDT'
};

const TF_MAP = {
  '1m': '1min', '3m': '3min', '5m': '5min',
  '15m': '15min', '30m': '30min', '1h': '1hour'
};

/**
 * Fetch klines de KuCoin con mapper defensivo
 * KuCoin devuelve: [time, open, close, high, low, volume]
 * NOTA: high/low estan en indices 3 y 4 (no 2 y 3 como Binance)
 * @param {string} asset
 * @param {string} interval
 * @param {number} limit
 * @returns {Promise<Array<[time,open,high,low,close,volume]>|null>}
 */
export async function fetchKlines(asset, interval, limit) {
  const sym = SYMBOL_MAP[asset];
  const kcInt = TF_MAP[interval] || '15min';
  if (!sym) return null;
  const lim = limit || 220;
  const url = `${BASE}/api/v1/market/candles?type=${kcInt}&symbol=${sym}&limit=${lim}`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !data.data || !Array.isArray(data.data)) return null;
  
  // Mapper defensivo: detecta si high esta en indice 2 (Binance-style) o 3 (KuCoin-style)
  const raw = data.data;
  if (raw.length === 0) return null;
  
  // KuCoin: [time, open, close, high, low, volume]
  // Binance: [time, open, high, low, close, volume]
  // Detectamos: si close (indice 2) esta entre open y high, es formato KuCoin puro
  const first = raw[0];
  const openVal = +first[1];
  const closeVal = +first[2];
  const highVal = +first[3];
  const lowVal = +first[4];
  
  if (closeVal >= openVal && highVal >= closeVal && lowVal <= openVal) {
    // Formato KuCoin: [time, open, close, high, low, volume]
    return raw.map(c => [+c[0], +c[1], +c[3], +c[4], +c[2], +c[5]]);
  }
  
  // Fallback: asumir formato Binance-like [time, open, high, low, close, volume]
  return raw.map(c => [+c[0], +c[1], +c[2], +c[3], +c[4], +c[5]]);
}

/**
 * Fetch stats 24h de KuCoin
 * @param {string} asset
 * @returns {Promise<{price:number, changePct:number}|null>}
 */
export async function fetchStats(asset) {
  const sym = SYMBOL_MAP[asset];
  if (!sym) return null;
  const url = `${BASE}/api/v1/market/stats?symbol=${sym}`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !data.data) return null;
  return {
    price: +data.data.last,
    changePct: (+data.data.changeRate || 0) * 100
  };
}
