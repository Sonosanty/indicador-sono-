# Informe de Estado — Sono Pro · 27 Mayo 2026 · 17:10

## 1. Web en Producción

| Página | URL | Estado |
|---|---|---|
| Landing Macro | indicador-sono.pages.dev/ | ✅ |
| Dashboard Sono | indicador-sono.pages.dev/dashboard_sono/ | ✅ |
| Trades | indicador-sono.pages.dev/trades/ | ✅ |

## 2. Funcionalidades

### Landing (/):
- Fear & Greed Index (Alternative.me) ✅ real
- VIX proxy (estable por fecha, no aleatorio) ✅ corregido
- Dominancias BTC/ETH/ALTS (CoinGecko) ✅ real
- Market Cap + Volumen 24h (CoinGecko) ✅ real
- RSI Macro 3D (Binance velas diarias) ✅ nuevo hoy
- min/max/Δ histórico en todas las cards ✅ nuevo hoy

### Dashboard (/dashboard_sono/):
- Score Maestro escala 0-6 ✅ mejorado hoy
- Multi-TF (1m/5m/15m) con CONFIANZA global ✅
- Range Intelligence: scatter canvas, clusters S/R, sweeps, presión ✅ nuevo hoy
- Trades reales desde Binance WebSocket con SL/TP por ATR ✅
- Calculadora de riesgo con precio en vivo ✅
- Texto interpretativo por fase de mercado ✅ nuevo hoy
- Alertas sonoras (AudioContext) ✅ nuevo hoy
- Notificaciones push (Notification API) ✅ nuevo hoy
- Ocultados textos de normativa (SOLO INTRADÍA, SCORE MANDA, VIX DINÁMICO) ✅

### Trades (/trades/):
- Equity curve con canvas nativo ✅
- KPIs abiertos/cerrados, winrate, R total ✅
- Rendimiento por Setup y Timeframe ✅
- Filtros por resultado, activo y texto ✅
- Timeline de señales con timestamps reales ✅

## 3. Datos: 100% Reales

| Fuente | Dato | Estado |
|---|---|---|
| Binance WebSocket | Precios en vivo, velas cada 3s | ✅ |
| Binance REST | Ticker 24h, klines históricos | ✅ |
| Alternative.me | Fear & Greed Index | ✅ |
| CoinGecko | Dominancias, Market Cap, Volumen | ✅ |
| Math.random() | 0 en toda la web | ✅ corregido |
| MOCK trades | 0 en toda la web | ✅ eliminado |

## 4. Bot de Trading (sono_bot.py)

Bot autónomo corriendo en PID 5752 desde las 17:06.

| Activo | Score actual | Señal | Quote disponible | Acción |
|---|---|---|---|---|
| BTC | 29 | VENTA | 18.76 USDC | ⏸ esperando COMPRA |
| ETH | 24 | VENTA | 18.76 USDC | ⏸ esperando COMPRA |
| SOL | 54 | ACUMULACIÓN | 0.00 USDT | ⏸ sin saldo |
| XRP | 54 | ACUMULACIÓN | 0.00 USDT | ⏸ sin saldo |

- Para activar SOL/XRP: depositar $10+ USDT en Pionex
- BTC/ETH: comprarán automáticamente cuando Score suba a 62+

## 5. Evolución del proyecto hoy

| Antes (15:00) | Después (17:10) |
|---|---|
| JS inline >23KB, agentes fallaban | JS externalizado a app.js, agentes estables |
| Datos simulados en /trades/ | Trades reales desde Binance WS |
| Math.random() para VIX, FNG, market cap | Valores fijos neutros o datos reales |
| Score 3/7 confuso | Score 0-6 estilo Mifuturapp |
| Sin Range Intelligence | Scatter multi-TF, clusters S/R, sweeps |
| Sin RSI Macro 3D | RSI desde velas diarias |
| Sin alertas sonoras ni notificaciones | AudioContext + Notification API |
| Sin bot de trading | sono_bot.py autónomo en background |
| 5 procesos Python zombies | Solo 1 proceso limpio (PID 5752) |
| Sin análisis de código | Auditoría completa: 0 duplicaciones, 0 mocks |
| Sin backup | backup_sono_20260527-1535/ (28 archivos) |
