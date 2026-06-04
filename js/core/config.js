/**
 * js/core/config.js — Configuración centralizada de Sono PRO
 * Única fuente de verdad para assets, timeframes, intervalos, umbrales
 */

export const ASSETS = {
  BTC: { name: 'Bitcoin', symbol: 'BTCUSDT', color: '#f7931a', coingeckoId: 'bitcoin' },
  ETH: { name: 'Ethereum', symbol: 'ETHUSDT', color: '#627eea', coingeckoId: 'ethereum' },
  SOL: { name: 'Solana', symbol: 'SOLUSDT', color: '#9945ff', coingeckoId: 'solana' },
  XRP: { name: 'Ripple', symbol: 'XRPUSDT', color: '#00aae4', coingeckoId: 'ripple' },
};

export const ASSET_KEYS = Object.keys(ASSETS);

export const TIMEFRAMES = {
  '1m':  { label: '1m',  binance: '1m',  kucoin: '1min',  klines: 220 },
  '3m':  { label: '3m',  binance: '3m',  kucoin: '3min',  klines: 220 },
  '5m':  { label: '5m',  binance: '5m',  kucoin: '5min',  klines: 220 },
  '15m': { label: '15m', binance: '15m', kucoin: '15min', klines: 220 },
  '1h':  { label: '1h',  binance: '1h',  kucoin: '1hour', klines: 300 },
  '3d':  { label: '3d',  binance: '3d',  kucoin: '1day',  klines: 30 },
};

export const DEFAULT_TF = '15m';

export const SCORE_UPPER_BOUND = 100;

/**
 * Umbrales por defecto del Score Maestro
 * Se sobreescriben con sono-score-config.json si está disponible
 */
export const SCORE_PESOS = {
  p1_cruces_ma: 35,
  p2_momentum: 35,
  p3_bollinger: 30,
};

export const SCORE_BARRERAS = {
  compra_fuerte: 78,
  compra: 62,
  acumulacion: 52,
  neutral: 42,
  distribucion: 30,
  venta: 18,
};

export const SCORE_LABELS = {
  strong_long: 'COMPRA FUERTE',
  long: 'COMPRA',
  accumulate: 'ACUMULACIÓN',
  neutral: 'NEUTRAL',
  distribute: 'DISTRIBUCIÓN',
  short: 'VENTA',
  capitulate: 'CAPITULACIÓN',
};

export const RSI_PERIOD = 14;
export const ADX_PERIOD = 14;
export const BB_PERIOD = 20;
export const BB_STDDEV = 2;

export const SWR_TTLS_MS = {
  fg: 300000,    // 5 min
  cg: 180000,    // 3 min
  vx: 120000,    // 2 min
  eur: 900000,   // 15 min
  klines: 30000, // 30s
  ticker: 30000, // 30s
};

export const EUR_FALLBACK = 1.08;
export const FNG_FALLBACK = 50;
export const VIX_FALLBACK = 15;
