/**
 * js/data/coingecko.js — CoinGecko API adapter
 * Market cap global, dominancia BTC/ETH
 */

import { fetchWithTimeout } from '../core/cache.js';

const BASE = 'https://api.coingecko.com/api/v3';

/**
 * Fetch datos globales (market cap, dominancia)
 * @returns {Promise<{marketCap:number, btcDominance:number, ethDominance:number}|null>}
 */
export async function fetchGlobal() {
  const url = `${BASE}/global`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !data.data) return null;
  const d = data.data;
  return {
    marketCap: d.total_market_cap ? d.total_market_cap.usd : null,
    btcDominance: d.market_cap_percentage ? d.market_cap_percentage.btc : null,
    ethDominance: d.market_cap_percentage ? d.market_cap_percentage.eth : null
  };
}

/**
 * Fetch precio simple como fallback
 * @param {string} asset - 'bitcoin'|'ethereum'|'solana'|'ripple'
 * @returns {Promise<{price:number, change24h:number}|null>}
 */
export async function fetchSimplePrice(assetId) {
  const ids = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple'
  };
  const id = ids[assetId] || assetId;
  const url = `${BASE}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
  const data = await fetchWithTimeout(url, 8000);
  if (!data || !data[id]) return null;
  return {
    price: data[id].usd,
    change24h: data[id].usd_24h_change || 0
  };
}
