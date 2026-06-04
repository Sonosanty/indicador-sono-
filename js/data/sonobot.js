/**
 * js/data/sonobot.js — Sono-Bot Worker adapter
 * Worker consolidado que devuelve scores precalculados + macro
 */

import { fetchWithTimeout } from '../core/cache.js';

const URL = 'https://sono-bot.sonosanty.workers.dev/api/status';

/**
 * Fetch datos consolidados del Worker Sono-Bot
 * @returns {Promise<{scores:object, macro:object}|null>}
 *   scores: { BTC: { price, change_24h, high_24h, low_24h, total, p1, p2, p3, rsi, adx, pb, ma6, ma40, ma70, ma200 }, ... }
 *   macro: { fng, vix, dominance, mcap, eth_dominance, eur }
 */
export async function fetchStatus() {
  const data = await fetchWithTimeout(URL, 8000);
  if (!data || !data.scores || !data.macro) return null;
  return data;
}
