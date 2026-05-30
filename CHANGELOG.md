# CHANGELOG — Sono Pro Ecosystem

## v1.5 (2026-05-30) — Quick Wins Sprint

### 🆕 Alertas Telegram
- Nuevo módulo `telegram_alerts.py` con envío de alertas vía HTTP API
- Formatos: score alerts con emojis, trade alerts con PnL, resúmenes diarios
- Rate limiting: batch máx 10 mensajes, 1s entre mensajes
- Integración en `sono_bot.py`: alertas en cruces de señal, compras, ventas

### 🆕 WebSocket Robusto
- Nuevo hook `useWebSocket.js` con state machine y reconexión exponencial
- Refactor de `useBinance.js` para usar el nuevo hook
- Indicador de estado de conexión (live/connecting/reconnecting/stalled/error)

### 🧹 Cleanup
- Eliminados ALT y OSMO de ASSETS (quedan BTC, ETH, SOL, XRP)
- Eliminados helpers duplicados (calcMA, calcRSI, calcBB, calcATR, calcADX)
- SYMBOL_MAP limpiado: solo 4 activos reales

### 🚀 CI/CD
- Nuevos scripts `scripts/deploy-worker.sh` y `deploy-worker.ps1`
- Deploy automatizado del VIX Proxy Worker vía wrangler
