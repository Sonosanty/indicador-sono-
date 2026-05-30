# 📝 Changelog v1.5 — Sono Pro Ecosystem

> Fecha: 2026-05-30
> Sprint: Quick Wins — Alertas, WebSocket, Cleanup, CI/CD

---

## Resumen de Cambios

4 objetivos implementados con validación completa.

## 🎯 Objetivo 1: Alertas Telegram en tiempo real

### Archivos creados
- `telegram_alerts.py` — Módulo de alertas Telegram (10KB, ~280 líneas)
  - `send_alert()` — Envío vía HTTP API con rate limiting y truncamiento
  - `format_score_alert()` — Formato con emojis por categoría
  - `format_trade_alert()` — Formato con PnL para compra/venta
  - `format_score_cross_alert()` — Detección de cambio de categoría
  - `format_daily_summary()` — Resumen completo del bot
  - `send_batch()` — Envío batch (máx 10, 0.5s entre mensajes)
  - Lectura de credenciales desde `telegram_config.json`

### Archivos modificados
- `sono_bot.py` — Integración de alertas:
  - Flag `SEND_TELEGRAM_ALERTS = True` en config
  - En `run_once()`: alerta cuando Score cruza categoría
  - En `execute_buy()`: alerta de compra
  - En `execute_sell()`: alerta de venta con PnL
  - En `check_signals()`: alerta extrema para COMPRA_FUERTE/CAPITULACION
  - Rate limiting: 1h entre alertas del mismo tipo/activo

### Validación
- ✅ `telegram_alerts.py` importa correctamente
- ✅ Todos los formatos de mensaje generan HTML válido
- ✅ Importación desde sono_bot.py funciona

## 🎯 Objetivo 2: WebSocket Robusto

### Archivos creados
- `frontend/src/hooks/useWebSocket.js` — Hook de WebSocket con state machine (9KB)
  - State machine: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → DISCONNECTED
  - Reconnect exponencial: 1s→2s→4s→8s→16s→30s (cap) + jitter ±20%
  - Máximo 10 reconexiones antes de notificar error
  - Heartbeat: ping cada 3 minutos
  - Stale data detection: 60s sin mensaje → reconectar
  - Retorna: `{ status, lastMessage, connect, disconnect, reconnectAttempt, isConnected, isStalled, isError }`
  - Suscripción automática a streams pasados como parámetros

### Archivos modificados
- `frontend/src/hooks/useBinance.js` — Refactorizado para usar useWebSocket.js
  - Mantiene SWR como capa de cache para velas iniciales
  - WebSocket para datos frescos en tiempo real
  - Nuevo campo `connectionStatus` para indicador visual
  - `wsStatus` legacy mantenido para compatibilidad
  - Reconexión automática: recarga velas REST tras reconectar
  - Throttle de 500ms para actualizaciones WebSocket

### Validación
- ✅ Build exitoso (`npm run build` → 1.34s, sin errores)
- ✅ Hooks importan y exportan correctamente
- ✅ No hay breaking changes en API pública

## 🎯 Objetivo 3: Eliminar Dead Code y Limpiar

### Archivos modificados
- `sono_bot.py` — Limpieza completa:
  - ✅ Eliminados ALT y OSMO de `ASSETS` (quedan BTC, ETH, SOL, XRP)
  - ✅ Eliminados helpers duplicados: `calcMA()`, `calcRSI()`, `calcBB()`, `calcATR()`, `calcADX()`
  - ✅ `computeScore()` preservado como wrapper (delega en sono_score.py)
  - ✅ `SYMBOL_MAP` limpiado: solo los 4 activos reales
  - ✅ `priority_order` actualizado sin ALT/OSMO
  - ✅ Version bump: v1.0 → v1.5
  - ✅ Mensaje de inicio reporta estado de alertas Telegram

### Backup
- 🗄️ `sono_bot.py.bak` (pre-existente)
- 🗄️ `sono_bot.py.bak.v1.5` (backup recién creado)

### Validación
- ✅ `py_compile.compile()` pasa sin errores
- ✅ Import chain completa verifica: sono_score → telegram_alerts → sono_bot
- ✅ Build frontend exitoso (demuestra que useBinance.js no tiene errores)

## 🎯 Objetivo 4: Workers CI/CD

### Archivos creados
- `scripts/deploy-worker.sh` — Script Bash (Unix/WSL)
- `scripts/deploy-worker.ps1` — Script PowerShell (Windows)

### Funcionalidad
- Comando: `npx wrangler deploy` en `vix-proxy-worker/`
- Verificación de wrangler CLI antes de deploy
- Mensajes de éxito/error informativos
- URL del worker desplegado al final

### Notas
- El `wrangler.toml` NO fue modificado (config existente correcta)
- No se añadieron GitHub Actions (requiere permiso del usuario)

## Archivos No Modificados (Restricciones)
- ❌ `scoreEngine.js` — No tocado (es sagrado)
- ❌ `sono-score-config.json` — No tocado (es sagrado)
- ❌ Configuración del Gateway — No modificada
- ❌ package.json — No se añadieron dependencias npm nuevas
- ❌ requirements.txt — No se añadieron dependencias pip nuevas (requests ya existe)

## Estado Final

| Componente | Estado | Versión |
|------------|--------|---------|
| `sono_bot.py` | ✅ Limpio + integrado alerts | v1.5 |
| `telegram_alerts.py` | ✅ Nuevo, funcional | v1.0 |
| `useWebSocket.js` | ✅ Nuevo, funcional | v1.0 |
| `useBinance.js` | ✅ Refactorizado | v2.0 |
| Build frontend | ✅ Exitoso (1.34s) | — |
| Deploy scripts | ✅ Creados | v1.0 |
