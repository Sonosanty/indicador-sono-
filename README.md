# Indicador Sono Pro

Dashboard de trading multi-activo con Score Maestro para swing trading en timeframe 15m.

**URL:** https://indicador-sono.pages.dev

## Estrategia

Score Maestro 0-100 basado en Smart Money Concepts + momentum. Señales de COMPRA/VENTA/NEUTRAL/DISTRIBUCIÓN según el score y su tendencia. Swing trading en temporalidad 15m con SL/TP dinámico.

## Monedas

- BTC
- ETH
- SOL
- XRP

## Componentes

| Componente | Descripción |
|---|---|
| `index.html` | Dashboard principal (V6 standalone, HTML+CSS+JS) |
| `rangos.html` | Rangos multi-timeframe por moneda |
| `trades.html` | Historial de trades y posiciones |
| `metodo.html` | Estrategia con gráfico multi-panel Chart.js |
| `sono_bot.py` | Bot de trading Pionex modo paper |
| `sono_score.py` | Motor de score unificado (importado por el bot) |

## APIs externas

- **Binance** — precios y velas en tiempo real (WebSocket + REST)
- **CoinGecko** — datos de mercado (dominancia, market cap)
- **Alternative.me** — Fear & Greed Index
- **Worker VIX** — proxy propio para VIX y EUR (Edge Worker Cloudflare)

## Despliegue

El dashboard se despliega automáticamente en Cloudflare Pages desde la rama `main`. Push a GitHub → build automático en Cloudflare.

Build output: raíz del repo (sin build command — HTML estático).

## Worker VIX

El Worker `vix-proxy-worker` (rama `worker-vix`) corre en Cloudflare Workers y sirve:
- VIX (CBOE Volatility Index)
- EUR/USD

Worker URL: `https://vix-proxy.sonosanty.workers.dev`

## Estado del proyecto

- Dashboard: ✅ Activo en `indicador-sono.pages.dev`
- VIX Worker: ✅ Activo
- Bot Pionex: Paper trading (requiere arranque manual)
- Build: Automático via Cloudflare Pages + GitHub

---

*Proyecto personal de análisis cuantitativo BTC/ETH/SOL/XRP.*
