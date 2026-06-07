# Indicador Sono Pro V8 — Dashboard de Trading

Dashboard de trading en tiempo real para BTC, ETH, SOL y XRP con Score Maestro integrado. Desplegado en Cloudflare Pages.

## Stack

- **Frontend**: HTML/CSS/JS monolítico (1 solo archivo, 55KB)
- **APIs**: Binance REST+WS (precios), CoinGecko (macro), Alternative.me (Fear & Greed)
- **WebSocket**: Binance stream (tick en vivo)
- **Hosting**: Cloudflare Pages (build automático desde push a main)
- **VIX Proxy**: Cloudflare Worker (`vix-proxy.sonosanty.workers.dev`)

## Estructura del repo

```
├── index.html              ← Dashboard principal V8 (monolítico, 55KB)
├── _headers                ← Seguridad: CSP, X-Frame-Options, etc.
├── trades.json             ← Historial de trades demo (14 trades)
├── robots.txt              ← Disallow crawlers
├── index.html.v7.backup    ← Backup de la versión anterior
└── .gitignore
```

## Cómo desplegar

Cada push a `main` dispara build automático en Cloudflare Pages:

```bash
git push origin main
```

Build command: `mkdir -p output && cp indicador_cloudflare/index.html indicador_cloudflare/trades.json output/`
Build output: `output`

## Funcionalidades

- Score Maestro Sono (0-100 basado en 3 pilares: MAs, Momentum, Bollinger)
- Indicadores técnicos: RSI 14, ADX 14, BB %B
- Confluencia Multi-Timeframe (1m, 3m, 5m, 15m)
- Zonas S/R por pivotes 15m
- Trades demo con columna R actual
- Asset selector: BTC, ETH, SOL, XRP
- WS en vivo con watchdog de reconexión
- Macros: Fear & Greed, dominancia BTC, market cap, EUR/USD

## URLs

- Producción: https://indicador-sono.pages.dev
- Preview: https://[hash].indicador-sono.pages.dev
- VIX Worker: https://vix-proxy.sonosanty.workers.dev
# touch to force deploy after build command fix
