/**
 * js/core/cache.js — SWR Cache con TTL
 * Uso:
 *   const { get, set } = createSWRCache({ fg: 300000, vx: 120000 })
 *   if (!swrOk(cache, 'fg')) { ... set(cache, 'fg', val) }
 */
export function createSWRCache(ttls) {
  const store = {};
  const timestamps = {};
  return {
    get(key) {
      const ttl = ttls[key] || 60000;
      if (timestamps[key] && Date.now() - timestamps[key] < ttl) {
        return store[key];
      }
      return undefined;
    },
    set(key, val) {
      store[key] = val;
      timestamps[key] = Date.now();
    },
    isFresh(key) {
      const ttl = ttls[key] || 60000;
      return timestamps[key] && Date.now() - timestamps[key] < ttl;
    },
    age(key) {
      return timestamps[key] ? Date.now() - timestamps[key] : Infinity;
    },
    clear() { Object.keys(store).forEach(k => { delete store[k]; delete timestamps[k]; }); }
  };
}

/**
 * Fetch con timeout y AbortController
 * @param {string} url
 * @param {number} timeoutMs default 8000
 * @returns {Promise<object|null>}
 */
export function fetchWithTimeout(url, timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, cache: 'no-store' })
    .then(r => { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(err => { clearTimeout(timer); return null; });
}

/**
 * Intentar N fuentes en orden, devolver primera que responda
 * @param {Array<() => Promise<object|null>>} fetchers
 * @returns {Promise<object|null>}
 */
export function raceSources(fetchers) {
  return new Promise(resolve => {
    let done = false;
    fetchers.forEach(fn => {
      Promise.resolve().then(fn).then(result => {
        if (!done && result !== null && result !== undefined) {
          done = true;
          resolve(result);
        }
      }).catch(() => {});
    });
    // Timeout global
    setTimeout(() => { if (!done) { done = true; resolve(null); } }, 15000);
  });
}
