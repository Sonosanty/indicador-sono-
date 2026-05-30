# Auditoría de Código: Bot Python Sono PRO

**Fecha:** 2026-05-30  
**Analista:** Subagente de auditoría  
**Archivos analizados:** sono_bot.py, sono_score.py, telegram_alerts.py, main.py, pionex_credentials.json, telegram_config.json, sono-score-config.json, sono_bot.log  

---

## Resumen Ejecutivo

Se encontraron **22 hallazgos**, distribuidos así:

| Gravedad | Cantidad |
|----------|----------|
| 🔴 CRÍTICO | 5 |
| 🟠 ALTO | 7 |
| 🟡 MEDIO | 5 |
| 🔵 BAJO | 5 |

---

## 🔴 CRÍTICOS

### C1. API keys de Pionex y Telegram en texto plano (filtrables)

**Archivo:** `pionex_credentials.json`, `telegram_config.json`  
**Problema:** Las credenciales están en texto plano en archivos JSON accesibles dentro del workspace. Ambos archivos contienen API keys reales:
- Pionex API Key: `23sBSGJW...` (con permisos de trading)  
- Telegram Bot Token: `7872485935:AAF-OVaaa...` (puede leer/escribir mensajes como el bot)

**Riesgo:** Si alguien accede al workspace, o si estos archivos se suben por error a Git, cualquier atacante puede:
- Tradear en la cuenta de Pionex
- Enviar mensajes como el bot de Telegram
- Leer el historial de chats del bot

**Evidencia en logs:**
```
2026-05-27 16:55:55,525 [INFO] Ejecutando en Pionex con API Key: 3o527NLg...
```

### C2. main.py importa 5 módulos que NO EXISTEN

**Archivo:** `main.py` líneas 18-24  
**Problema:** Los siguientes imports fallarán en tiempo de ejecución porque los archivos no existen:
- `from indicators import fetch_binance_klines, calculate_rsi, calculate_sma`
- `from scoring import calculate_advanced_score`
- `from db_utils import get_latest_snapshot, get_historical_snapshots, save_snapshot`
- `from sono_strategy import SonoStrategy`
- `from sistema_hibrido import SistemaHibridoBTC`

**Riesgo:** `main.py` es completamente **inservible** — nunca podrá iniciar. Esto significa que el servidor FastAPI y todos sus endpoints WS/HTTP son dead code. No hay dashboard, no hay WebSockets, no hay endpoint `/api/sono/signals` funcional.

**Archivos faltantes confirmados:** indicators.py, scoring.py, db_utils.py, sono_strategy.py, sistema_hibrido.py — los 5 en la carpeta raíz del workspace.

**Posible causa:** Estos archivos fueron eliminados o nunca existieron. El frontend SPA hace llamadas REST que nunca responderán.

### C3. Formato de string inválido causa crash parcial cada ciclo

**Archivo:** `sono_bot.py` línea ~141  
**Problema:** El logging del ATR usa una f-string con formato condicional que es sintácticamente inválido:

```python
f'ATR=$' + (f'{atr:.2f}' if atr else 'N/A')
```

Cuando `atr` existe y es float, se usa `+` entre un f-string y otro f-string, lo cual **funciona por accidente** en algunos contextos pero produjo este error real en los logs:

```
ERROR] Error checking BTC: Invalid format specifier '.2f if atr else "N/A"' for object of type 'float'
```

**Impacto:** El `check_signals()` captura la excepción y continúa, pero el score de ese activo se pierde en ese ciclo y no se evalúa para trading.

### C4. Paper mode permite recompra del mismo activo sin verificar saldo correctamente

**Archivo:** `sono_bot.py` - `execute_buy()`  
**Problema:** Cuando `PAPER_MODE = True`, tras comprar se actualiza `self.paper_balances['USDT']` restando el monto, pero **no se verifica que el balance sea suficiente antes de la segunda compra**. En los logs se observan múltiples compras de BTC:

```
PAPER BUY BTC | $80.00 @ $73635.04 | Size: 0.001086 | Bal: $20.00
PAPER BUY BTC | $80.00 @ $73631.01 | Size: 0.001086 | Bal: $20.00
PAPER BUY BTC | $80.00 @ $73647.85 | Size: 0.001086 | Bal: $20.00
```

El bot compró BTC **3 veces consecutivas** en paper mode con balance residual de $20, permitiendo compras de $80 con solo $20 disponibles. Esto indica que no se chequea `paper_balances['USDT'] < amount` antes de ejecutar. La lógica de `update_balances()` asigna `self.balances = self.paper_balances` directamente, pero el chequeo de saldo usa `self.balances` que es la referencia al dict. **El bug es que en paper mode no se recalcula antes del chequeo.**

**Causa raíz:** `update_balances()` se llama una vez por ciclo, pero las compras reducen el balance **durante** ese ciclo. Si hay múltiples activos con señales de compra, el saldo USDT puede quedar negativo.

### C5. Telegram envía alertas con token inválido (401 Unauthorized)

**Archivo:** `telegram_config.json`, `telegram_alerts.py`  
**Evidencia en logs:**
```
ERROR] Telegram error 401: {"ok":false,"error_code":401,"description":"Unauthorized"}
```

**Problema:** El token de Telegram `7872485935:AAF-OVaaa...` está siendo rechazado por la API de Telegram. Posibles causas: (a) token revocado, (b) bot detenido por BotFather, (c) token incorrecto. El bot está enviando decenas de alertas fallidas por hora (cada 2 minutos), todas fallando con 401.

**Impacto:** El sistema de alertas es 100% no funcional. Además, hay un gasto inútil de CPU/IO intentando enviar mensajes que siempre fallan.

---

## 🟠 ALTOS

### H1. Evento `check_signals()` sin límite de velocidad a Binance

**Archivo:** `sono_bot.py` - `run_forever(interval_seconds=120)` llama a `check_signals()`  
**Problema:** En cada ciclo, para CADA activo (4 activos), el bot hace:
1. `fetch_candles()` → 1 request a Binance REST
2. `fetch_ticker()` → 1 request a Binance REST

Eso son **8 requests a Binance cada 2 minutos = 240 requests/hora**. Si el bot se reinicia o hay error y cae al `time.sleep(interval_seconds * 2)`, la frecuencia se duplica. Además no hay backoff exponencial.

**Impacto:** Riesgo de rate limiting por Binance. En logs se observan timeouts:
```
ERROR] Error checking SOL: HTTPSConnectionPool(host='api.binance.com', port=443): Read timed out. (read timeout=15)
```

### H2. Pionex timestamp sync failure (INVALID_TIMESTAMP)

**Archivo:** `sono_bot.py` - `_pionex_sig()`  
**Evidencia en logs:**
```
ERROR] get_balances: {'result': False, 'code': 'INVALID_TIMESTAMP', 'message': 'timestamp expired'}
```

**Problema:** La función `_pionex_sig()` usa `time.time()` local del servidor para generar el timestamp. No hay sincronización NTP ni chequeo de desviación contra el servidor de Pionex. Pionex requiere timestamps dentro de una ventana de tolerancia (generalmente 5-30 segundos). Si el reloj del servidor se desvía (cosa común en máquinas virtuales Windows), todas las requests firman con timestamp inválido.

**Impacto:** El bot no puede operar en modo real. Ocurrió múltiples veces en logs del 27-28 de mayo.

### H3. No hay WebSocket real — polling HTTP cada 2s disfrazado de "tiempo real"

**Archivo:** `main.py` - `binance_ticker_ws_listener()`  
**Problema:** La función se llama `*_ws_listener` y promete "transmisión en tiempo real" pero en realidad es **HTTP polling cada 2 segundos** a `https://api.binance.com/api/v3/ticker/price`. No hay ningún WebSocket de Binance.

Esto no es un bug per se (funciona), pero el nombre es engañoso y la latencia es de ~2s + tiempo de red, mientras que WebSocket real de Binance es sub-100ms.

### H4. MAIN.PY — Fear & Greed y VIX hardcodeados

**Archivo:** `main.py` líneas 152-154:
```python
fear_greed_val = 28
fear_greed_label = "Fear"
vix_val = 16.74
btc_dominance = 58.34
```

**Problema:** Estos valores macro son fijos y nunca cambian a menos que `indicador_data.json` exista. Si `indicador_data.json` se actualiza, los usa; pero los defaults están hardcodeados a valores del día de creación. Son válidos solo para el momento en que se escribió el código.

**Impacto:** Si el servidor iniciara (cosa que no puede por C2), los datos macro serían incorrectos o stale.

### H5. MAIN.PY — Sin límite de conexiones WebSocket ni protección DoS

**Archivo:** `main.py` — `ConnectionManager`  
**Problema:** No hay límite en `active_connections`. Un atacante podría abrir miles de conexiones WebSocket y:
1. Saturar la memoria del servidor
2. Causar broadcast masivo (cada ticker se envía a todas las conexiones)
3. No hay autenticación en el WebSocket

### H6. Config duplicada y divergente entre sono_bot.py y sono-score-config.json

**Archivo:** `sono_bot.py` vs `sono-score-config.json`  
**Problema:** `sono_score.py` lee umbrales de `sono-score-config.json` (barreras), pero `sono_bot.py` tiene **thresholds hardcodeados**:
```python
self.BUY_THRESHOLD = 68
self.SELL_THRESHOLD = 35
self.STRONG_BUY_THRESHOLD = 80
```

Estos thresholds NO se usan en ningún lugar del código de `sono_bot.py`. Las decisiones de trading se basan en `score['signal']` que proviene de `classify_score()` en `sono_score.py`. **Hay dead code y potencial confusión** si alguien intenta modificar los umbrales pensando que afectan al trading.

### H7. MAIN.PY falla silenciosamente en broadcast WebSocket

**Archivo:** `main.py` — `ConnectionManager.broadcast()`  
**Problema:**
```python
async def broadcast(self, data):
    for connection in self.active_connections:
        try:
            await connection.send_json(data)
        except Exception:
            pass  # ← captura pero no remueve la conexión muerta
```

Si una conexión WebSocket se cierra inesperadamente (sin `WebSocketDisconnect`), el broadcast falla, captura la excepción... pero **la conexión muerta sigue en la lista**. En cada broadcast posterior se reintenta enviar a una conexión muerta, acumulando excepciones silenciosas. Esto es un **memory/resource leak** de conexiones zombies.

---

## 🟡 MEDIOS

### M1. Variable `PAPER_MODE = True` hardcodeada — peligro de modo real accidental

**Archivo:** `sono_bot.py` línea 48  
**Problema:** No hay variable de entorno ni flag de CLI. Para cambiar a modo real hay que editar el código. Combinado con C1 (API keys en texto plano), hay riesgo de que alguien haga `PAPER_MODE = False` sin darse cuenta y el bot empiece a operar con fondos reales.

**Recomendación:** Usar `os.environ.get('SONO_PAPER_MODE', 'true').lower() == 'true'`

### M2. Log file crece sin rotación

**Archivo:** `sono_bot.log` — 1.28 MB en 3 días de ejecución  
**Problema:** El logging usa `FileHandler` sin `RotatingFileHandler`. Cada 2 minutos se añaden ~5-10 líneas. En un mes serían ~150 MB. Sin rotación, eventualmente llena el disco.

### M3. POSIBLE: RSI división por cero

**Archivo:** `sono_score.py` — `calc_rsi()`  
**Problema:**
```python
losses = sum(abs(d) for d in diffs if d < 0) / p
if losses == 0:
    return 100.0
```

Si `gains` es 0 (o muy cercano), la fórmula `100 - 100 / (1 + gains / losses)` devuelve 0.0 correctamente. Si ambos son 0, `losses == 0` devuelve 100. Esto es correcto para casos límite. Sin embargo, **no hay protección contra `losses` extremadamente pequeño pero no cero** que cause división estable pero resultados extraños.

**Nota:** Probablemente no es bug en la práctica, pero vale la pena validar.

### M4. MAIN.PY — Danger: `urllib.request` bloqueante dentro de asyncio

**Archivo:** `main.py` — `binance_ticker_ws_listener()`  
**Problema:** Se usa `loop.run_in_executor(None, fetch_url)` para el fetch, lo cual es correcto. Pero en la función `compute_timeframe_data`, que también se ejecuta en executor, se usa **directamente `fetch_binance_klines`** (que probablemente usa requests/urllib también). La mezcla de urllib síncrono dentro de executors es frágil — si `fetch_binance_klines` también usa urllib, podría haber conflictos de conexión.

### M5. `compute_timeframe_data` devuelve fallbacks silenciosos

**Archivo:** `main.py` — `compute_timeframe_data()`
```python
except Exception as e:
    return {"price": 77000.0, "change_percent": 0.0, ...}
```

**Problema:** Cuando falla, devuelve valores hardcodeados (`price: 77000.0`, RSI 50, etc.) sin registrar qué activo falló ni propagar el error. Si el fallo es persistente, el dashboard muestra datos incorrectos sin que el usuario lo sepa.

---

## 🔵 BAJOS

### L1. Encoding de logging produce caracteres corruptos en español

**Archivo:** `sono_bot.py` — `logging.FileHandler('sono_bot.log', encoding='utf-8')`  
**Evidencia en logs:**
```
ETH: Score=77 (COMPRA) P1=35 P2=35 P3=7 RSI=66.42 ADX=54.2
SOL: Score=60 (ACUMULACI�"N) P1=35 P2=23 P3=2 RSI=65.91 ADX=22.6
```

**Problema:** A pesar de que el handler especifica UTF-8, algunos caracteres (Ó, Í) aparecen corruptos. Posiblemente la consola stdout no es UTF-8 y contamina el stream.

### L2. Import duplicado de sys

**Archivo:** `sono_bot.py` líneas 8 y 10:
```python
import sys
from datetime import datetime
import sys  # ← duplicado
```

### L3. Variable `MICRO_MODE` determina `priority_order` pero no se usa como toggle real

**Archivo:** `sono_bot.py` líneas 290-292  
**Problema:** `MICRO_MODE` solo cambia el orden de prioridad de activos, pero `max_positions` se calcula como `1 if micro_mode else 2` que depende de `MICRO_MODE`. La variable global `MICRO_MODE` está hardcodeada a `True`. No hay forma externa de cambiarla.

### L4. `SEND_TELEGRAM_ALERTS` hardcodeada a `True`, sin supresión posible

Igual que M1, no hay variable de entorno ni flag de CLI. Si Telegram falla continuamente (que es el caso, ver C5), el bot intenta enviar en cada ciclo gastando CPU.

### L5. `trade_log` en memoria sin límite de tamaño

**Archivo:** `sono_bot.py` — `self.trade_log = []`
**Problema:** Es una lista en memoria que crece indefinidamente con cada trade. Con operaciones cada ~2 minutos, en 1 mes serían ~21,600 entradas. No hay purge ni límite. Esto es un **memory leak potencial** (aunque pequeño en términos absolutos).

---

## Hallazgos Adicionales por Archivo

### sono_score.py

| Hallazgo | Gravedad | Detalle |
|----------|----------|---------|
| ✅ No hay bugs de lógica | N/A | El cálculo de score coincide con el contrato JSON |
| ✅ Las funciones helper son puras | N/A | Sin efectos secundarios |
| ⚠️ RSI usa `//` slicing frágil | Bajo | `[-(p+1):]` luego `[1:]` — si `len(closes) <= p+2` puede dar índices incorrectos |
| ⚠️ No hay validación de `config` | Bajo | Si el JSON tiene keys faltantes, crashea con KeyError |

### telegram_alerts.py

| Hallazgo | Gravedad | Detalle |
|----------|----------|---------|
| 🔴 Telegram 401 (CRÍTICO C5) | Crítico | Token rechazado |
| ✅ Rate limiting correcto | N/A | `_MIN_INTERVAL = 1.0s` implementado correctamente |
| ✅ Retry-after en 429 | N/A | Respeta rate limiting de Telegram |
| ⚠️ `_load_config()` cachea global | Bajo | Si se cambia el archivo en caliente, no se refleja hasta reiniciar |
| ✅ Truncamiento a 4000 chars | N/A | Correcto |

### main.py

| Hallazgo | Gravedad | Detalle |
|----------|----------|---------|
| 🔴 5 módulos faltantes (CRÍTICO C2) | Crítico | El servidor no arranca |
| 🟠 Polling HTTP disfrazado de WS (H3) | Alto | 2s de latencia en lugar de sub-100ms |
| 🟠 Conexiones zombies en broadcast (H7) | Alto | Memory leak de conexiones |
| 🟠 F&G / VIX hardcodeados (H4) | Alto | Datos macro stale |
| 🟠 Sin límite de WS connections (H5) | Alto | Vulnerable a DoS |
| 🟡 Fallbacks silenciosos (M5) | Medio | Datos incorrectos sin aviso |
| ✅ CORS abierto (*) | Bajo | En entorno local es aceptable, en producción no |

---

## Matriz de Riesgos de Trading

### ¿El bot opera correctamente en Paper Mode?

- **Sí, aproximadamente.** El score se calcula bien y las decisiones de compra/venta son lógicas según la estrategia.
- **Pero:** El bug C4 (recompras sin saldo suficiente) invalida el paper trading como simulador realista. Los PnL reportados no son fiables.

### ¿El bot podría operar en modo real hoy?

**NO.** Razones:
1. C5: Telegram no funciona — el operador no recibiría alertas de trades
2. H2: Pionex timestamp sync falla — las órdenes serían rechazadas
3. H1: Las requests a Binance pueden rate-limitearse
4. M1: Sin variable de entorno, cualquiera puede activar modo real por accidente

### ¿El score es consistente con el frontend?

- ✅ **Sí.** `sono_score.py` y el frontend JS usan el mismo `sono-score-config.json` como fuente de verdad.
- ✅ Las funciones `calc_ma`, `calc_rsi`, `calc_bb`, `calc_atr`, `calc_adx` son equivalentes a las del frontend.
- ✅ La función `classify_score()` usa exactamente las mismas barreras del contrato JSON.

---

## Ranking de Prioridades para Corrección

| Prioridad | Hallazgo | Esfuerzo Est. | Impacto |
|-----------|----------|---------------|---------|
| 1 | C5: Arreglar/reemplazar token Telegram | 5 min | Alertas funcionales |
| 2 | C4: Corregir verificación de saldo en paper mode | 15 min | Paper trading realista |
| 3 | C2: Restaurar módulos faltantes de main.py | 2-8h | Servidor funcional |
| 4 | H2: Sincronizar timestamp con Pionex (NTP) | 30 min | Trading real posible |
| 5 | C1: Mover credenciales a .env o secrets manager | 30 min | Seguridad |
| 6 | H1: Agregar rate limiting a Binance | 15 min | Evitar bans |
| 7 | H7: Limpiar conexiones WebSocket muertas | 10 min | Estabilidad WS |
| 8 | M1, M3, L1-L5: Correcciones menores | 1h | Calidad de código |

---

## Conclusión

**El corazón del sistema (sono_score.py) es sólido.** El cálculo del Score Maestro es correcto y consistente con el frontend. Los problemas graves están en la **orquestación**: el bot de trading (`sono_bot.py`) tiene bugs de lógica de saldos y dependencias rotas; el servidor (`main.py`) no puede ni arrancar; y las alertas Telegram no funcionan.

El bot en paper mode está operando (y lo ha estado por días), pero los balances reportados no son fiables debido al bug de recompras sin verificación de saldo. En modo real, no funcionaría por el problema de timestamp de Pionex.

**TL;DR:** El score está bien, el bot no está listo para producción real.
