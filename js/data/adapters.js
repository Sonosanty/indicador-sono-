/**
 * js/data/adapters.js — Orchestrador de fuentes de datos
 * Prioridad: Worker Sono-Bot -> Binance -> KuOCKoin (fallback) -> CoinGecko/Alternative -> VIX Proxy -> defaults
 *
 * Uso:
 *   import { fetchMarketData } from './js/data/adapters.js';
 *   const data = await fetchMarketData('BTC');
 *   // data = { price, high, low, change24hPct, klines: { '1m': [...], ... },
 *   //          fng, vix, btcDominance, marketCap, ethDominance, eurUsd,
 *   //          indicators: { rsi, adx, bbp, ma6, ma40, ma70, ma200 },
 *   //          score: { total, label, p1, p2, p3 },
 *   //          health: { source, stale, latencyMs, updatedAt } }
 */

import { createSWRCache, fetchWithTimeout } from '../core/cache.js';
import * as binance from './binance.js';
import * as kucoin from './kucoin.js';
import * as coingecko from './coingecko.js';
import * as alternative from './alternative.js';
import * as vixProxy from './vix.js';
import * as sonobot from './sonobot.js';

// TTLs SWR
const SWR_TTLS = {
  fg: 300000,    // 5 min
  cg: 180000,    // 3 min
  vx: 120000,    // 2 min
  eur: 900000,   // 15 min
  klines: 30000, // 30s
  ticker: 30000  // 30s
};

const swr = createSWRCache(SWR_TTLS);

// Valores por defecto seguros
const DEFAULTS = {
  fng: 50,
  vix: 15,
  btcDominance: 55,
  marketCap: null,
  ethDominance: null,
  eurUsd: 1.08
};

/**
 * Fetch datos completos de mercado para un asset
 * @param {string} asset - 'BTC'|'ETH'|'SOL'|'XRP'
 * @param {object} options
 * @param {Array<string>} options.timeframes - timeframes a fetch (default ['1m','3m','5m','15m','1h','3d'])
 * @param {boolean} options.forceFresh - ignorar cache
 * @returns {Promise<object>}
 */
export async function fetchMarketData(asset, options) {
  const tfs = (options && options.timeframes) || ['1m','3m','5m','15m','1h','3d'];
  const startTime = Date.now();
  let stale = false;
  let source = 'defaults';

  // 1. Intentar Worker Sono-Bot primero (datos consolidados)
  const workerData = await sonobot.fetchStatus();
  if (workerData) {
    source = 'sonobot';
    const assetData = workerData.scores ? workerData.scores[asset] : null;
    const macro = workerData.macro || {};

    if (assetData && assetData.price) {
      // Si tenemos datos del worker, usarlos directamente
      const result = buildResult(asset, {
        price: assetData.price,
        high: assetData.high_24h,
        low: assetData.low_24h,
        change24hPct: assetData.change_24h,
        klines: {},  // Worker no devuelve klines individuales
        fng: macro.fng,
        vix: macro.vix,
        btcDominance: macro.dominance,
        marketCap: macro.mcap,
        ethDominance: macro.eth_dominance,
        eurUsd: macro.eur,
        indicators: {
          rsi: assetData.rsi,
          adx: assetData.adx,
          bbp: assetData.pb,
          ma6: assetData.ma6,
          ma40: assetData.ma40,
          ma70: assetData.ma70,
          ma200: assetData.ma200
        },
        score: {
          total: assetData.total,
          label: null,  // se calcula en la UI
          p1: assetData.p1,
          p2: assetData.p2,
          p3: assetData.p3
        }
      }, startTime, source, stale);
      result.health.source = 'sonobot';
      // Fetch klines en background si el worker no las trajo
      fetchKlinesBackground(asset, tfs);
      return result;
    }
  }

  // 2. Fallback: Binance directo
  source = 'binance';
  stale = false;

  // Fetch en paralelo
  const [tickerResult, fngResult, globalResult, vixResult, eurResult] = await Promise.all([
    binance.fetchTicker(asset).catch(() => null),
    swr.isFresh('fg') ? null : alternative.fetchFearGreed().then(v => { if (v) swr.set('fg', v); return v; }).catch(() => null),
    swr.isFresh('cg') ? null : fetchGlobalData().then(v => { if (v) swr.set('cg', v); return v; }).catch(() => null),
    swr.isFresh('vx') ? null : vixProxy.fetchVix().then(v => { if (v) swr.set('vx', v); return v; }).catch(() => null),
    swr.isFresh('eur') ? null : binance.fetchEurUsd().then(v => { if (v) swr.set('eur', v); return v; }).catch(() => null)
  ]);

  // Si Binance falló, intentar KuCoin
  let price = tickerResult ? tickerResult.price : null;
  let high = tickerResult ? tickerResult.high : null;
  let low = tickerResult ? tickerResult.low : null;
  let change24hPct = tickerResult ? tickerResult.change24hPct : null;

  if (!tickerResult) {
    source = 'kucoin';
    stale = true;
    const kcStats = await kucoin.fetchStats(asset).catch(() => null);
    if (kcStats) {
      price = kcStats.price;
      change24hPct = kcStats.changePct;
    }
  }

  // 3. Fetch klines en secuencia
  const klines = {};
  for (const tf of tfs) {
    const cached = swr.get(`kl_${asset}_${tf}`);
    if (cached && !stale) {
      klines[tf] = cached;
    } else {
      let data = await binance.fetchKlines(asset, tf).catch(() => null);
      if (!data) {
        data = await kucoin.fetchKlines(asset, tf).catch(() => null);
        if (data) source = 'kucoin';
      }
      if (data && data.length > 0) {
        klines[tf] = data;
        swr.set(`kl_${asset}_${tf}`, data);
      }
    }
  }

  return buildResult(asset, {
    price, high, low, change24hPct,
    klines,
    fng: fngResult || swr.get('fg'),
    vix: vixResult || swr.get('vx'),
    btcDominance: globalResult ? globalResult.btcDominance : null,
    marketCap: globalResult ? globalResult.marketCap : null,
    ethDominance: globalResult ? globalResult.ethDominance : null,
    eurUsd: eurResult || swr.get('eur'),
    indicators: null,  // se calcula en la UI desde klines
    score: null        // se calcula en la UI
  }, startTime, source, stale);
}

function buildResult(asset, data, startTime, source, stale) {
  return {
    asset,
    price: data.price || DEFAULTS.price,
    change24hPct: data.change24hPct,
    high: data.high,
    low: data.low,
    marketCap: data.marketCap || DEFAULTS.marketCap,
    btcDominance: data.btcDominance || DEFAULTS.btcDominance,
    ethDominance: data.ethDominance || DEFAULTS.ethDominance,
    fng: data.fng || DEFAULTS.fng,
    vix: data.vix || DEFAULTS.vix,
    eurUsd: data.eurUsd || DEFAULTS.eurUsd,
    klines: data.klines || {},
    indicators: data.indicators,
    score: data.score,
    health: {
      source: stale ? `${source} (stale)` : source,
      stale: !!stale,
      latencyMs: Date.now() - startTime,
      updatedAt: Date.now()
    }
  };
}

/**
 * Fetch global data (CoinGecko -> VIX proxy fallback)
 */
async function fetchGlobalData() {
  const cg = await coingecko.fetchGlobal().catch(() => null);
  if (cg) return cg;
  const vix = await vixProxy.fetchGlobal().catch(() => null);
  return vix;
}

/**
 * Fetch klines en background (sin bloquear)
 */
function fetchKlinesBackground(asset, tfs) {
  setTimeout(async () => {
    for (const tf of tfs) {
      try {
        let data = await binance.fetchKlines(asset, tf);
        if (!data) data = await kucoin.fetchKlines(asset, tf);
        if (data) swr.set(`kl_${asset}_${tf}`, data);
      } catch (e) { /* ignore */ }
    }
  }, 0);
}

/**
 * Fetch solo macro (sin klines) — mas rapido para updates periodicos
 */
export async function fetchMacroOnly() {
  const [fng, global, vix, eur] = await Promise.all([
    swr.isFresh('fg') ? swr.get('fg') : alternative.fetchFearGreed().then(v => { if (v) swr.set('fg', v); return v; }),
    swr.isFresh('cg') ? swr.get('cg') : fetchGlobalData().then(v => { if (v) swr.set('cg', v); return v; }),
    swr.isFresh('vx') ? swr.get('vx') : vixProxy.fetchVix().then(v => { if (v) swr.set('vx', v); return v; }),
    swr.isFresh('eur') ? swr.get('eur') : binance.fetchEurUsd().then(v => { if (v) swr.set('eur', v); return v; })
  ]);

  return {
    fng: fng || DEFAULTS.fng,
    vix: vix || DEFAULTS.vix,
    btcDominance: global ? global.btcDominance : null,
    marketCap: global ? global.marketCap : null,
    ethDominance: global ? global.ethDominance : null,
    eurUsd: eur || DEFAULTS.eurUsd
  };
}
