/**
 * js/data/binance.js — Binance REST API adapter
 * Devuelve datos normalizados al schema unificado de Sono PRO
 */

import { fetchWithTimeout } from '../core/cache.js';

const BASE = 'https://api.binance.com';
const WS_BASE = 'wss://stream.binance.com:9443/ws';

const SYMBOL_MAP = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT'
};

/**
 * Fetch klines de Binance
 * @param {string} asset - 'BTC' | 'ETH' | 'SOL' | 'XRP'
 * @param {string} interval - '1m'|'3m'|'5m'|'15m'|'1h'|'3d'
 * @param {number} limit - max velas (default 220)
 * @returns {Promise<Array<[time,open,high,low,close,volume]>|null>}
 */
export async function fetchKlines(asset, interval, limit) {
  const sym = SYMBOL_MAP[asset];
  if (!sym) return null;
  const lim = limit || (interval === '3d' ? 30 : interval === '1h' ? 300 : 220);
  const url = `${BASE}/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${lim}`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !Array.isArray(data)) return null;
  // Binance devuelve [time, open, high, low, close, volume, ...]
  return data.map(k => [+k[0], +k[1], +k[2], +k[3], +k[4], +k[5]]);
}

/**
 * Fetch ticker 24h
 * @param {string} asset
 * @returns {Promise<{price:number, high:number, low:number, change24hPct:number}|null>}
 */
export async function fetchTicker(asset) {
  const sym = SYMBOL_MAP[asset];
  if (!sym) return null;
  const url = `${BASE}/api/v3/ticker/24hr?symbol=${sym}`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !data.lastPrice) return null;
  return {
    price: +data.lastPrice,
    high: +data.highPrice,
    low: +data.lowPrice,
    change24hPct: +data.priceChangePercent
  };
}

/**
 * Fetch EUR/USD rate
 * @returns {Promise<number|null>}
 */
export async function fetchEurUsd() {
  const url = `${BASE}/api/v3/ticker/price?symbol=EURUSDT`;
  const data = await fetchWithTimeout(url, 8000);
  return data ? +data.price : null;
}

/**
 * Construir URL de WebSocket para aggtrade
 * @param {string} asset
 * @returns {string} WebSocket URL
 */
export function wsAggTradeURL(asset) {
  const sym = SYMBOL_MAP[asset];
  if (!sym) return null;
  return `${WS_BASE}/${sym.toLowerCase()}@aggTrade`;
}
