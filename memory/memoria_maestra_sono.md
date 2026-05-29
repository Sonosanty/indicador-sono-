# MEMORIA MAESTRA — Sono Pro (28 mayo 2026)
# Backup: backup_sono_20260528_2138 (90MB)

## 🌐 WEB SONO PRO v3.1 — Producción
- **URL**: https://indicador-sono.pages.dev/
- **Framework**: React 18 + Vite + HashRouter SPA
- **5 páginas**: Macro, Trades, Rangos, Método, Agentes (oculto)
- **3 chunks**: index 62KB, react-vendor 164KB, icons 3KB
- **Code splitting**: manualChunks react-vendor + icons
- **Skeleton CSS**: placeholders visibles al instante

### Páginas
| Ruta | Función | Estado |
|---|---|---|
| `/#/` (Macro) | Contexto macro: F&G, VIX, Market Cap, Dominancia, RSI | ✅ |
| `/#/trades` | Señales reales, R calculado del movimiento del precio | ✅ |
| `/#/rangos` | 4 timeframes, useBinanceMulti (1 WS), presión/contexto | ✅ |
| `/#/metodo` | Panel 4 cripto + 10 cards interactivas con modales | ✅ |
| `/#/agentes` | Bot status, configuración swing (oculto del menú) | ✅ |

### APIs conectadas
- Binance REST (ticker/klines) + WebSocket (aggTrade + stream)
- CoinGecko (market cap, dominancia)
- Alternative.me (Fear & Greed)
- Worker VIX proxy (Yahoo Finance ^VIX + exchangerate-api EUR)

### Seguridad aplicada
- robots.txt: bloquea Trades/Rangos/Agentes + GPTBot/ChatGPT/anthropic
- Headers: HSTS 2 años, CSP estricto, X-Frame-Options DENY, X-Content-Type-Options nosniff
- Assets inmutables cacheados 1 año
- CSP: permite Binance API+WS, CoinGecko, Alternative.me, Worker VIX

## 🤖 BOT PIONEX (Swing Trading)
- **Script**: `sono_bot.py` — proceso independiente, no depende de OpenClaw
- **PID**: 10504 (activo)
- **Auto-arranque**: Startup shortcut en Windows (al iniciar sesión)
- **Timeframe**: 15m (swing)
- **Intervalo**: cada 2 minutos
- **Máx posiciones**: 2 simultáneas
- **Umbrales**: COMPRA_FUERTE ≥80, COMPRA ≥68, salida ≤35
- **Trailing stop**: 2% desde máximo
- **Prioridad activos**: XRP > ETH > SOL > BTC
- **Estrategia**: Score Maestro Sono (P1+P2+P3, mismo que la web)
- **Log**: `sono_bot.log`
- **Última operación**: COMPRA SOL $11.64 @ $82.54 (21:12)

## 🧠 AGENTES CRON (dependen de OpenClaw)
| Nombre | Frecuencia | Fuente |
|---|---|---|
| sono-trading-signals | Cada 30 min | Bot log + web + macro |
| sono-market-intel | Cada hora | 4 páginas web + log |
| sono-daily-report | 22:00 CET | Todas las fuentes |
| Revisión Mañana | 7:00 CET | Estado nocturno |
| Revisión Noche | 20:00 CET | Resumen del día |

## 📊 ESTADO DEL MERCADO (21:38 28/5/26)
- BTC: $73,551 (-2.00%) — Score 39 (DISTRIBUCIÓN en 15m)
- ETH: $2,023 (-1.71%) — Score 46 (NEUTRAL en 15m)
- SOL: $82.68 (-1.52%) — Score 39 (DISTRIBUCIÓN en 15m)
- XRP: $1.33 (-0.45%) — Score 71 (COMPRA en 15m)
- Fear & Greed: 22 (Extreme Fear)
- VIX: 15.77
- Market Cap: $2.55T
- Dominancia BTC: 57.57%
- RSI 3D: 42.14 (Neutral)

## ⚙️ CONFIGURACIÓN SWING
- Timeframe: 15m
- Entrada COMPRA_FUERTE: Score ≥ 80
- Entrada COMPRA: Score ≥ 68
- Salida: Score < 35
- Trailing stop: 2%
- Riesgo por trade: 50% del saldo
- Activos: BTC/ETH/SOL/XRP/ALT/OSMO
- Prioridad: XRP > ETH > SOL > BTC

## 🔧 ARCHIVOS DEL PROYECTO
- `sono-v3/` — Código React (sin node_modules)
- `vix-proxy-worker/` — Worker Cloudflare VIX+EUR
- `indicador_cloudflare/` — Deploy producción
- `sono_bot.py` — Bot trading Pionex
- `metodo_ajram_premium_v2.pine` — Pine Script Premium v2
- `sono-estrategia-pinescript.txt` — Estrategias Pine
- `metodo_ajram_dashboard.pine` — Dashboard Pine
- `metodo_ajram_pro_parte2.pine` — Parte 2 Pine

## 🚨 PENDIENTE
- [ ] VIX: el usuario debe hacer Ctrl+Shift+R para que el CSP se aplique
- [ ] El bot no tradea porque balance Pionex $4.52 < mínimo $10
- [ ] Depositar fondos en Pionex para que el bot opere
