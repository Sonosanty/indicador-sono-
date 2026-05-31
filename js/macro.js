/* ══════════════════════════════════════════════════════════════
   MACRO DATA v5.0
   Fear & Greed · CoinGecko · VIX proxy
   ══════════════════════════════════════════════════════════════ */

const MacroData = (() => {
  const FNG_URL   = 'https://api.alternative.me/fng/?limit=1';
  const GECKO_URL = 'https://api.coingecko.com/api/v3/global';
  const VIX_URL   = 'https://vix-proxy.sonosanty.workers.dev/vix'; // tu proxy Worker

  const cache = {};
  const TTL = { fng: 5*60*1000, gecko: 5*60*1000, vix: 10*60*1000 };

  async function fetchFG() {
    if (cache.fng && Date.now() - cache.fng.ts < TTL.fng) return cache.fng.data;
    try {
      const r = await fetch(FNG_URL);
      const j = await r.json();
      const d = j.data[0];
      cache.fng = { ts: Date.now(), data: { value: parseInt(d.value), label: d.value_classification } };
    } catch {
      cache.fng = { ts: Date.now(), data: { value: 50, label: 'Neutral', error: true } };
    }
    return cache.fng.data;
  }

  async function fetchGecko() {
    if (cache.gecko && Date.now() - cache.gecko.ts < TTL.gecko) return cache.gecko.data;
    try {
      const r = await fetch(GECKO_URL);
      const j = await r.json();
      const d = j.data;
      cache.gecko = {
        ts: Date.now(),
        data: {
          btcDom:  parseFloat(d.market_cap_percentage.btc || 0).toFixed(1),
          ethDom:  parseFloat(d.market_cap_percentage.eth || 0).toFixed(1),
          totalMC: d.total_market_cap.usd,
          totalVol: d.total_volume.usd,
          altsDom: (100 - parseFloat(d.market_cap_percentage.btc || 0) - parseFloat(d.market_cap_percentage.eth || 0)).toFixed(1),
        }
      };
    } catch {
      cache.gecko = { ts: Date.now(), data: { btcDom: '--', ethDom: '--', totalMC: null, altsDom: '--', error: true } };
    }
    return cache.gecko.data;
  }

  async function fetchVIX() {
    if (cache.vix && Date.now() - cache.vix.ts < TTL.vix) return cache.vix.data;
    try {
      const r = await fetch(VIX_URL);
      if (!r.ok) throw new Error();
      const j = await r.json();
      cache.vix = { ts: Date.now(), data: { value: parseFloat(j.vix || j.value || 0).toFixed(2) } };
    } catch {
      // Fallback: estimar VIX por F&G inverso
      const fg = cache.fng ? cache.fng.data.value : 50;
      const estimated = (100 - fg) * 0.4 + 8; // rough estimate
      cache.vix = { ts: Date.now(), data: { value: estimated.toFixed(2), estimated: true } };
    }
    return cache.vix.data;
  }

  async function fetchAll() {
    const [fg, gecko, vix] = await Promise.allSettled([fetchFG(), fetchGecko(), fetchVIX()]);
    return {
      fg:    fg.status    === 'fulfilled' ? fg.value    : { value: 50, label: 'Neutral' },
      gecko: gecko.status === 'fulfilled' ? gecko.value : { btcDom: '--', ethDom: '--' },
      vix:   vix.status   === 'fulfilled' ? vix.value   : { value: '--' },
    };
  }

  /** Régimen de mercado 1-6 basado en score + F&G */
  function regime(score, fgValue) {
    if (score >= 70 && fgValue >= 60) return { level: 6, label: 'EUFORIA', color: '#00d085' };
    if (score >= 60 && fgValue >= 40) return { level: 5, label: 'ALCISTA FUERTE', color: '#00d085' };
    if (score >= 50 && fgValue >= 30) return { level: 4, label: 'ALCISTA CAUTO', color: '#80e8b0' };
    if (score >= 40 && fgValue >= 20) return { level: 3, label: 'NEUTRAL', color: '#9db8d8' };
    if (score >= 30)                  return { level: 2, label: 'BAJISTA CAUTO', color: '#ff9060' };
    return { level: 1, label: 'CAPITULACIÓN', color: '#ff4d6a' };
  }

  function fmtMC(v) {
    if (!v) return '--';
    if (v >= 1e12) return `$${(v/1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `$${(v/1e9).toFixed(0)}B`;
    return `$${(v/1e6).toFixed(0)}M`;
  }

  return { fetchAll, fetchFG, fetchGecko, fetchVIX, regime, fmtMC };
})();
