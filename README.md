# Sono PRO — Dashboard de Trading

Dashboard de trading en tiempo real para BTC, ETH, SOL y XRP. Desplegado en Cloudflare Pages con arquitectura modular ES.

**URL:** https://indicador-sono.pages.dev

## Stack

- **Frontend:** HTML+CSS+JS vanilla, ES modules, Chart.js
- **Indicadores:** SMA, RSI Cutler, ADX 14, Bollinger %B, Score Maestro proprietario
- **APIs:** Binance (klines + ticker), KuCoin (fallback klines), CoinGecko (global), Alternative.me (Fear & Greed), Proxy VIX (Cloudflare Worker)
- **Deploy:** Cloudflare Pages v3 (build script Bash, auto-deploy en push a `main`)
- **Bot:** Python (sono_bot.py + sono_score.py) para señales reales (requiere $10 USDT en Pionex)

## Estructura del proyecto

```
indicador-sono-/
├── index.html                  ← Dashboard principal
├── build.sh                    ← Script de build para Cloudflare Pages
├── _headers / _routes.json     ← Configuración Cloudflare (CSP, CORS, SPA fallback)
├── sono-score-config.json      ← Config del Score Maestro (única fuente de verdad)
├── assets/css/                 ← Design tokens modulares
│   ├── tokens.css              ← Variables CSS (colores, spacing, fonts)
│   ├── base.css                ← Reset, tipografía, animaciones
│   ├── layout.css              ← Grids, topbar, nav, responsive
│   └── components.css          ← Cards, rings, pills, tablas, skeletons
├── js/                         ← Módulos ES (lógica compartida)
│   ├── core/                   ← Config, state, cache, formatters
│   │   ├── config.js           ← Constantes (assets, TFs, umbrales score)
│   │   ├── state.js            ← Store reactivo pub/sub
│   │   ├── formatters.js       ← Formatos de precio, market cap, %, tiempo
│   │   └── cache.js            ← SWR cache con TTL, fetch con timeout
│   ├── data/                   ← Adapters de fuentes de datos
│   │   ├── adapters.js         ← Orquestador (Worker → Binance → KuCoin → fallbacks)
│   │   ├── binance.js          ← Klines, ticker 24h, EUR/USD
│   │   ├── kucoin.js           ← Klines con mapper defensivo de columnas
│   │   ├── coingecko.js        ← Global (market cap, dominancia)
│   │   ├── alternative.js      ← Fear & Greed Index
│   │   ├── vix.js              ← VIX proxy worker (VIX + global + EUR)
│   │   └── sonobot.js          ← Worker Sono-Bot (datos consolidados)
│   └── indicators/             ← Indicadores técnicos
│       ├── ma.js               ← SMA con cache por hash
│       ├── rsi.js              ← Cutler RSI 14
│       ├── adx.js              ← ADX 14
│       ├── bb.js               ← Bollinger %B
│       ├── score-maestro.js    ← Score Maestro (P1+P2+P3, classifyScore, macroScore)
│       ├── ranges.js           ← Soportes y resistencias por pivotes
│       └── confluence.js       ← Confluencia multi-timeframe
└── frontend/                   ← HTMLs de las páginas
    ├── app.js                  ← Dashboard (IIFE, funcional legacy)
    ├── app.module.js           ← ES module bridge (expone módulos al window)
    ├── metodo.html             ← Vista analítica con gráficos
    ├── range_explorer.html     ← Range Intelligence
    └── trades_explorer.html    ← Historial de trades (demo)
```

## Score Maestro (P1+P2+P3 = 0-100)

Sistema propietario de scoring en tiempo real basado en tres pilares:

| Pilar | Máximo | Componentes |
|-------|--------|-------------|
| **P1 — Tendencia** | 35 | MA6>MA40 (+12), MA6>MA70 (+10), MA40>MA200 (+13) |
| **P2 — Momentum** | 35 | ADX>35/25/else (+15/10/3), RSI>=50/>=35/else (+12/7/2), Precio>MA200 (+8) |
| **P3 — Bollinger** | 30 | %B<0.15/0.35/0.65/0.85/else (+28/20/14/7/2) |

### Clasificación

| Rango | Señal | Acción |
|-------|-------|--------|
| 78-100 | COMPRA FUERTE | Long agresivo |
| 62-77 | COMPRA | Long prudente |
| 52-61 | ACUMULAR | Entradas parciales |
| 42-51 | NEUTRAL | Esperar |
| 30-41 | VENTA | Reducir posición |
| 18-29 | VENTA FUERTE | Short |
| 0-17 | CAPITULACIÓN | Cash / oportunidad de compra |

## APIs y fallbacks

| Dato | Fuente primaria | Fallback | TTL |
|------|----------------|----------|-----|
| Klines | Binance REST | KuCoin (mapper defensivo) | 30s |
| Ticker 24h | Binance REST | CoinGecko simple/price | 30s |
| Fear & Greed | Alternative.me | Worker Sono-Bot | 5 min |
| Market Cap / Dominancia | CoinGecko global | Worker VIX proxy | 3 min |
| VIX | Worker VIX proxy | — | 2 min |
| EUR/USD | Binance EURUSDT | — | 15 min |

## Deploy

Cada push a `main` activa el build automático en Cloudflare Pages:

```bash
bash build.sh
# → output en indicador_cloudflare/
# → deploy en https://indicador-sono.pages.dev
```

Para forzar recarga de caché en el navegador: `Ctrl+Shift+R`

## Bot Python (offline)

- `sono_bot.py` — Bot de trading para Pionex (requiere $10 USDT mínimo)
- `sono_score.py` — Score Maestro en Python (canónico, fuente de verdad de los pesos)
- `sono-score-config.json` — Config compartida (umbrales, labels, colores)

## Licencia

Uso privado — Santy / ultrafino.com
