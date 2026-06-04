/**
 * js/data/alternative.js — Alternative.me Fear & Greed Index
 */

import { fetchWithTimeout } from '../core/cache.js';

const URL = 'https://api.alternative.me/fng/?limit=1';

/**
 * Fetch Fear & Greed Index
 * @returns {Promise<number|null>} valor 0-100
 */
export async function fetchFearGreed() {
  const data = await fetchWithTimeout(URL, 8000);
  if (!data || !data.data || !data.data[0]) return null;
  return +data.data[0].value;
}
