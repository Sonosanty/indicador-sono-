# Schema de Datos — Sono PRO

## Klines unificado

Todas las fuentes (Binance, KuCoin) normalizan al mismo formato:

```typescript
type Kline = [timestamp: number, open: number, high: number, low: number, close: number, volume: number]
```

**Binance:** `[time, open, high, low, close, volume]` — coincide con el schema unificado.

**KuCoin (conversión):** `[time, open, close, high, low, volume]` → El mapper defensivo en `kucoin.js` detecta automáticamente si `close` está entre `open` y `high` (formato KuCoin puro) y reordena a `[time, open, high, low, close, volume]`.

### Ejemplo
```js
[1717488000000, 69420.50, 69800.00, 69200.00, 69600.00, 1234.56]
```

## Market Data (fetchMarketData)

```typescript
interface MarketData {
  asset: string;           // 'BTC' | 'ETH' | 'SOL' | 'XRP'
  price: number | null;
  change24hPct: number | null;
  high: number | null;
  low: number | null;
  marketCap: number | null;
  btcDominance: number | null;
  ethDominance: number | null;
  fng: number;             // Fear & Greed, default 50
  vix: number;             // VIX, default 15
  eurUsd: number;          // default 1.08
  klines: Record<string, Array<Kline>>;  // { '1m': [...], '3m': [...], ... }
  indicators: {
    rsi: number | null;
    adx: number | null;
    bbp: number | null;     // Bollinger %B
    ma6: number | null;
    ma40: number | null;
    ma70: number | null;
    ma200: number | null;
  } | null;
  score: {
    total: number;          // 0-100
    label: string | null;
    p1: number;
    p2: number;
    p3: number;
  } | null;
  health: {
    source: string;         // 'sonobot' | 'binance' | 'kucoin (stale)'
    stale: boolean;
    latencyMs: number;
    updatedAt: number;      // Date.now()
  };
}
```

## Score Maestro

```typescript
interface ScoreResult {
  sc: number;       // 0-100
  p1: number;       // 0-35 (Tendencia)
  p2: number;       // 0-35 (Momentum)
  p3: number;       // 0-30 (Bollinger)
  ma6: number | null;
  ma40: number | null;
  ma70: number | null;
  ma200: number | null;
  price: number;
  r: number | null;  // RSI
  a: number | null;  // ADX
  pb: number | null; // Bollinger %B
  tLen: number;      // velas usadas
  ma200Avail: boolean;
}

interface ScoreClassify {
  label: string;     // 'COMPRA FUERTE' | 'COMPRA' | 'ACUMULAR' | ...
  cssClass: string;  // 'pgg' | 'pb' | 'pgg2' | 'pw' | 'prr'
  level: string;     // 'strong_long' | 'long' | ...
}
```

## Confluencia MTF

```typescript
interface ConfluenceResult {
  scores: Record<string, ScoreResult>;  // keyed by TF
  avgScore: number | null;
  pressure: number;     // 0-100 (0=venta fuerte, 50=neutral, 100=compra fuerte)
  signals: Record<string, { score: number, label: string, cssClass: string, r: number|null, a: number|null }>;
  mtfSummary: {
    total: number;
    longs: number;
    shorts: number;
    neutrals: number;
    bias: 'alcista' | 'bajista' | 'neutral';
  };
}
```

## Store (state.js)

```typescript
interface Store {
  // Setters
  set(key: string, value: any): void;
  setMultiple(pairs: Record<string, any>): void;
  
  // Getters
  get(key: string): any;
  getAll(): Record<string, any>;
  
  // Subscribe
  subscribe(key: string, fn: (value: any, prev: any) => void): () => void;
  onAny(fn: (key: string, value: any, prev: any) => void): () => void;
  
  // Reset
  clear(): void;
}
```

## MA_CACHE

```typescript
interface MACache {
  [key: string]: number | undefined;
  // key format: '<tf>_<period>_<klineHash>'
  // example: '15m_40_220_1717488000000'
}
```

El hash se genera desde `hashKlines()` que toma el timestamp de la última vela + length. Esto previene el bug de stale cache cuando se cambia de timeframe.

## Service Worker Cache

| Cache | Estrategia | Contenido |
|-------|-----------|-----------|
| `sono-v2` | Cache-first | CSS, JS, SVGs, fuentes (stale-while-revalidate) |
| `sono-v2` | Network-first | HTML, datos propios (con timeout 5-8s) |
| — | Network-only | APIs externas (Binance, CoinGecko, etc.) |
