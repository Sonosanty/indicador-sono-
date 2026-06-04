/**
 * js/data/vix.js — VIX proxy worker adapter
 * Proxy Cloudflare Worker que devuelve VIX, global y EUR
 */

import { fetchWithTimeout } from '../core/cache.js';

const BASE = 'https://vix-proxy.sonosanty.workers.dev';

/**
 * Fetch VIX index
 * @returns {Promise<number|null>}
 */
export async function fetchVix() {
  const data = await fetchWithTimeout(`${BASE}/vix`, 8000);
  return data && data.vix ? +data.vix : null;
}

/**
 * Fetch datos globales desde el Worker (fallback de CoinGecko)
 * @returns {Promise<{marketCap:number, btcDominance:number, ethDominance:number}|null>}
 */
export async function fetchGlobal() {
  const data = await fetchWithTimeout(`${BASE}/global`, 8000);
  if (!data || !data.data || !data.data.total_market_cap) return null;
  return {
    marketCap: data.data.total_market_cap || null,
    btcDominance: data.data.dominance || null,
    ethDominance: data.data.eth_dominance || null
  };
}

/**
 * Fetch EUR/USD
 * @returns {Promise<number|null>}
 */
export async function fetchEurUsd() {
  const data = await fetchWithTimeout(`${BASE}/eur`, 8000);
  return data && data.eur ? +data.eur : null;
}
