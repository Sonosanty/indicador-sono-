# 🏗️ Arquitectura Refinada — Sprint v1.5

> Generado por @architect para CC_GodMode Orchestrator
> Fecha: 2026-05-30
> Sprint: v1.5 — Quick Wins

---

## Resumen del Sprint

Basado en los reports de investigación (00), arquitectura (01) y plan (02), se refinan los objetivos del sprint v1.5 para alinearlos con el código existente.

### Decisiones de refinamiento

1. **telegram_alerts.py** → Archivo único, no paquete. El bot existente usa un solo archivo (`sono_bot.py`), no tiene `__init__.py` ni estructura de paquete. Un solo archivo `telegram_alerts.py` es más simple, testeable e importable.
2. **Token**: Usar `telegram_config.json` existente en la raíz (contiene botToken válido). OpenClaw channels.telegram tiene un token diferente. Mantenemos `telegram_config.json` como fuente de verdad.
3. **cleanup de sono_bot.py**: Eliminar ALT/OSMO de ASSETS, eliminar helpers duplicados (calcMA, calcRSI, calcBB, calcATR, calcADX), limpiar SYMBOL_MAP.
4. **useWebSocket.js**: Hook independiente, refactor de useBinance.js para usarlo.
5. **Deploy workers**: Scripts PowerShell y Bash para CI/CD manual.

---

## Plan de Implementación Detallado

### 📋 Objetivo 1: Alertas Telegram (ALTA PRIORIDAD)

**Archivo a crear:**
- `telegram_alerts.py` — Módulo único de alertas

**Archivo a modificar:**
- `sono_bot.py` — Integrar alertas en run_once(), execute_buy(), execute_sell()

**Dependencias:** `requests` (ya existe)

#### Especificación definitiva:

```python
# telegram_alerts.py
- send_alert(message, parse_mode='HTML') -> bool
- format_score_alert(asset, score) -> str   # Emojis según categoría
- format_trade_alert(action, asset, price, size, pnl=None) -> str
- send_daily_summary(scores, balances, trades) -> None
- Lectura de telegram_config.json para token y chat_id
- Rate limiting: batch 10 mensajes, 1s entre mensajes
```

### 📋 Objetivo 2: WebSocket Robusto

**Archivo a crear:**
- `frontend/src/hooks/useWebSocket.js`

**Archivo a modificar:**
- `frontend/src/hooks/useBinance.js` — Refactorizar usando useWebSocket

#### Especificación:

```javascript
// useWebSocket.js
- State machine: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → DISCONNECTED
- Reconnect exponencial: 1s → 2s → 4s → 8s → 16s → 30s (cap) + jitter 20%
- Máximo 10 reconexiones
- Heartbeat: ping cada 3 minutos
- Stale data detection: si no hay mensaje en 60s → reconectar
- Retornar { status, lastMessage, connect, disconnect }
```

### 📋 Objetivo 3: Cleanup Dead Code

**Archivo a modificar:**
- `sono_bot.py` — Limpiar activos, helpers, SYMBOL_MAP

**Backup previo:**
- `sono_bot.py` → `sono_bot.py.bak` (ya existe)

### 📋 Objetivo 4: Workers CI/CD

**Archivos a crear:**
- `scripts/deploy-worker.sh`
- `scripts/deploy-worker.ps1`

---

## Orden de Ejecución

1. Backup de sono_bot.py
2. Crear telegram_alerts.py + test
3. Modificar sono_bot.py (cleanup + integración alerts)
4. Crear useWebSocket.js + test
5. Modificar useBinance.js
6. Crear scripts de deploy
7. Verificación final (npm build)

---

## Restricciones Verificadas

- ✅ NO modificar scoreEngine.js
- ✅ NO modificar sono-score-config.json
- ✅ NO modificar configuración del Gateway
- ✅ NO añadir dependencias npm o pip nuevas
- ✅ Guardar backup del bot antes de modificar
- ✅ Todos los cambios deben ser 100% funcionales
