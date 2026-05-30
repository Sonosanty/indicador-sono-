# Auditoría Completa — Bot Python Sono PRO v1.5

**Fecha:** 2026-05-30 17:45 GMT+2  
**Analista:** Subagente de auditoría (auditoría full exhaustiva)  
**Python:** 3.14.4  
**Archivos auditados:** sono_bot.py, main.py, telegram_alerts.py, sono_score.py, indicators.py, scoring.py, db_utils.py, sono_strategy.py, sistema_hibrido.py, .env, .gitignore, pionex_credentials.json, telegram_config.json, sono-score-config.json  

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [🔴 CRÍTICOS](#-críticos)
3. [🟡 ALTOS](#-altos)
4. [🟢 LEVES](#-leves)
5. [✅ FIXED (hallazgos de auditorías previas YA CORREGIDOS)](#-fixed-hallazgos-de-auditorías-previas-ya-corregidos)
6. [Hallazgos por Archivo - Desglose Detallado](#hallazgos-por-archivo---desglose-detallado)
7. [Verificación de Archivos Externos](#verificación-de-archivos-externos)
8. [Conclusión General](#conclusión-general)

---

## Resumen Ejecutivo

Se encontraron **30 hallazgos** en total:

| Gravedad | Nuevos | Ya Corregidos (✅ FIXED) | Total |
|----------|--------|------------------------|-------|
| 🔴 CRÍTICOS | 7 | 2 | 9 |
| 🟡 ALTOS | 8 | 1 | 9 |
| 🟢 LEVES | 10 | 2 | 12 |
| **TOTAL** | **25** | **5** | **30** |

### Estado del Ecosistema

| Componente | Estado | Nota |
|------------|--------|------|
| **sono_score.py** | ✅ Correcto | Score Maestro consistente con frontend |
| **sono_bot.py** (paper mode) | ⚠️ Con bugs | Opera pero balances no fiables (C4) |
| **sono_bot.py** (real mode) | 🔴 No funcional | Timestamp Pionex falla (C6) |
| **main.py** (FastAPI) | 🔴 Inestable | TypeError en update_all_indicators() por firma incorrecta (C2/C7) |
| **telegram_alerts.py** | 🔴 No funcional | Token 401 (C5) |

---

## 🔴 CRÍTICOS

### C1. Pionex API keys y Telegram token en texto plano (filtrables)

**Archivo:** `pionex_credentials.json` y `telegram_config.json`  
**Líneas:** Archivos completos

**Descripción:** Ambos archivos contienen credenciales reales en texto plano dentro del workspace:

**`pionex_credentials.json`:**
```json
{
  "api_key": "23sBSGJWpxhUZCT4gyL4tUETJMyZ8TDVcG7jmgbW3UmCv1QybHmdkG3VcFU6k3yp3q",
  "api_secret": "Xr8sax3WLM8HcTx0iPThcUtaxOu8Ejiexyd6SouLKyyRm6wq9VlLQAUTDnPOk5Jj"
}
```

**`telegram_config.json`:**
```json
{
  "telegram_bot_token": "7872485935:AAF-OVaaaNJgNn_MZlmRfiNC3MRryN0RGSk",
  "telegram_chat_id": "352182197"
}
```

**Verificación .gitignore:** ✅ Ambos están cubiertos en `.gitignore` (línea 4: `pionex_credentials.json`, línea 60: `*_config.json`). Sin embargo, el workspace NO es un repositorio Git activo (submodule status falla), por lo que el .gitignore es irrelevante — los archivos están accesibles localmente.

**Severidad:** 🔴 CRÍTICO — Cualquier proceso/programa que se ejecute en esta máquina puede leer estas credenciales y hacer trading real o enviar mensajes como el bot de Telegram.

---

### C2. main.py — 5 módulos importados NO existen (servidor muerto)

**Archivo:** `main.py`, líneas 18-24

**Descripción:** En auditorías previas se reportó que estos módulos no existían. **Tras verificación en esta auditoría, los 5 archivos SÍ existen en el workspace.** El problema real de `main.py` es otro, y es más sutil:

**La función `calculate_advanced_score()` en `scoring.py` tiene esta firma:**

```python
def calculate_advanced_score(df, price=None):
```

Pero en `main.py` línea 161 se llama así:

```python
analysis = calculate_advanced_score(
    rsi_btc=timeframes_data["3d"]["rsi"],
    rsi_1m=timeframes_data["1m"]["rsi"],
    rsi_5m=timeframes_data["5m"]["rsi"],
    rsi_15m=timeframes_data["15m"]["rsi"],
    rsi_1h=timeframes_data["1h"]["rsi"],
    fear_greed_val=fear_greed_val,
    vix=vix_val,
    ma_data=ma_data
)
```

**🆕 NUEVO HALLAZGO:** Los parámetros NO coinciden con la firma de la función. `scoring.py:calculate_advanced_score(df, price=None)` espera un DataFrame y opcionalmente un precio, pero `main.py` le pasa 8 keyword arguments (rsi_btc, rsi_1m, rsi_5m, rsi_15m, rsi_1h, fear_greed_val, vix, ma_data). Esto causará **TypeError en tiempo de ejecución**: `calculate_advanced_score() got unexpected keyword arguments`.

**Severidad:** 🔴 CRÍTICO — El servidor FastAPI se inicia, pero la actualización de indicadores (llamada cada 10 minutos) crashea inmediatamente. El endpoint `/api/latest` devuelve datos vacíos/stale.

---

### C3. f-string de ATR con formato condicional inválido → crash parcial

**Archivo:** `sono_bot.py`, línea 339

**Código:**
```python
logger.info(
    f'{asset}: Score={score["total"]} ({new_signal}) '
    f'P1={score["p1"]} P2={score["p2"]} P3={score["p3"]} '
    f'RSI={score["rsi"]} ADX={score["adx"]} '
    f'Price=${price:.2f} '
    f'ATR=${atr:.2f}' if atr else 'ATR=N/A'
)
```

**Descripción:** El operador ternario `if atr else 'ATR=N/A'` se aplica **al f-string completo** `f'ATR=${atr:.2f}'`, no al formato dentro del f-string. Esto es sintaxis válida en Python, pero la precedencia de operadores causa que:
- Si `atr` es truthy (float ≠ 0): imprime `f'ATR=${atr:.2f}'` que es el string literal `ATR=${atr:.2f}` (sin interpolar), no el valor.
- Si `atr` es falsy (None, 0): imprime `'ATR=N/A'`.

**⚠️ CORRECCIÓN:** En auditorías previas se reportó como "f-string inválido" que causaba `Invalid format specifier`. En Python 3.14.4 esto no crashea (el f-string es sintácticamente válido), pero **el formato no se evalúa** — siempre imprime `ATR=${atr:.2f}` literal cuando atr tiene valor, y `ATR=N/A` cuando no. Nunca muestra el valor real de ATR.

**Corrección necesaria:** Cambiar a:
```python
f'ATR=${"N/A" if atr is None else f"{atr:.2f}"}'
```

**Severidad:** 🔴 CRÍTICO para diagnóstico — El operador nunca ve el ATR real en logs, ocultando un indicador crítico de volatilidad.

---

### C4. Paper mode permite recompras sin verificar saldo real

**Archivo:** `sono_bot.py`, método `execute_buy()` (línea ~225) y `run_once()` (línea ~295)

**Descripción:** En `run_once()`, `self.balances` se actualiza con `self.update_balances()` una vez por ciclo completo. Luego itera sobre los 4 activos. Si el activo A consume saldo, `self.balances` no se refresca antes de evaluar el activo B. En paper mode, `self.balances` es una referencia a `self.paper_balances`, y `execute_buy()` sí descuenta de `self.paper_balances`... pero **la verificación de saldo para el siguiente activo en el mismo ciclo usa `self.balances` que aún refleja el saldo de `self.paper_balances` antes de la compra anterior** (porque `update_balances()` se llama al inicio del ciclo, no entre activos).

**Flujo del bug:**
1. `update_balances()` → `self.balances = {'USDT': 100}`
2. Activo A (BTC): `quote_bal = self.balances[USDT]` = 100 ✅ Compra por $80
3. `execute_buy()` descuenta: `paper_balances['USDT'] = 20`
4. Activo B (SOL): `quote_bal = self.balances[USDT]` = **100** (cacheado, no se refrescó)
5. Compra por $80 sobre un saldo real de $20 → **sobregiro**

**Severidad:** 🔴 CRÍTICO — Invalida completamente el paper trading como simulador. Los balances reportados y PnL no son fiables.

---

### C5. Telegram 401 Unauthorized — alertas 100% no funcionales

**Archivo:** `telegram_alerts.py`, línea 38-44 y `telegram_config.json`

**Descripción:** El token `7872485935:AAF-OVaaaNJgNn_MZlmRfiNC3MRryN0RGSk` está siendo rechazado por la API de Telegram con código 401. Posibles causas:
- Token revocado por @BotFather
- Bot detenido/eliminado
- Token mal copiado

**Evidencia en logs de sono_bot.log:**
```
ERROR] Telegram error 401: {"ok":false,"error_code":401,"description":"Unauthorized"}
```

Además, el bot intenta enviar alertas en CADA ciclo (incluyendo alerts de formato_score), generando requests HTTP fallidas constantemente que consumen CPU y ancho de banda.

**Severidad:** 🔴 CRÍTICO — El sistema de alertas no funciona. El operador no recibe notificaciones de trades, cambios de señal, ni resúmenes.

---

### C6. Pionex timestamp sync no se actualiza periódicamente — órdenes reales fallan

**Archivo:** `sono_bot.py`, línea 82-96 (`_sync_pionex_timestamp()`) y línea 103 (`_pionex_sig()`)

**Descripción:** `_sync_pionex_timestamp()` se llama UNA SOLA VEZ al cargar el módulo. Si el reloj del servidor se desvía (incluso unos segundos — común en Windows VMs), todas las requests posteriores firmadas llevan timestamp incorrecto.

**Evidencia:** En los logs existe:
```
ERROR] get_balances: {'result': False, 'code': 'INVALID_TIMESTAMP', 'message': 'timestamp expired'}
```

**Código relevante:**
```python
def _pionex_sig(method, path, params=None):
    ...
    ts = int(time.time() * 1000)
    if _pionex_time_offset is not None:
        ts += int(_pionex_time_offset)  # offset NUNCA se actualiza
```

**Severidad:** 🔴 CRÍTICO — Impide el trading real en Pionex. El offset debería recalcularse cada hora o en cada request fallido.

---

### C7. `scoring.py` no exporta `calculate_advanced_score` con la firma que `main.py` espera

**Archivo:** `scoring.py` línea 4 vs `main.py` líneas 161-168

**Ya documentado en C2.** Es el mismo bug, categorizado aquí por separado para claridad.

```python
# scoring.py - firma real:
def calculate_advanced_score(df, price=None):   # Espera DataFrame + precio opcional

# main.py - llamada real:
analysis = calculate_advanced_score(              # Pasa 8 kwargs que NO existen en la firma
    rsi_btc=...,
    rsi_1m=..., rsi_5m=..., rsi_15m=..., rsi_1h=...,
    fear_greed_val=..., vix=..., ma_data=...
)
```

**Severidad:** 🔴 CRÍTICO — `update_all_indicators()` crashea con TypeError cada 10 minutos.

---

## 🟡 ALTOS

### H1. Sin rate limiting a Binance — riesgo de IP ban

**Archivo:** `sono_bot.py`, métodos `fetch_candles()` (línea ~156) y `fetch_ticker()` (línea ~165)

**Descripción:** Cada ciclo (120s) ejecuta por activo:
- 1 GET a `/klines` (fetch_candles)
- 1 GET a `/ticker/24hr` (fetch_ticker)

4 activos × 2 requests = **8 requests cada 2 minutos = 240 requests/hora**. Esto está dentro de los límites de Binance (1200 weight/min), pero sin backoff exponencial. Si hay reintentos por timeout, se acumula.

**Código relevante:**
```python
def fetch_candles(asset):
    resp = requests.get(..., timeout=15)  # Sin backoff, sin retry con delay
    raw = resp.json()
    ...

def fetch_ticker(asset):
    resp = requests.get(..., timeout=15)  # Ídem
    d = resp.json()
    ...
```

**Logs con timeouts observados:**
```
ERROR] Error checking SOL: HTTPSConnectionPool(...): Read timed out. (read timeout=15)
```

**Recomendación:** Implementar retry con backoff exponencial (1s, 2s, 4s, 8s, max 30s).

---

### H2. Conexiones WebSocket zombies en ConnectionManager — memory leak

**Archivo:** `main.py`, clase `ConnectionManager`, método `broadcast()` (línea ~62)

**Código:**
```python
async def broadcast(self, data: Dict[str, Any]):
    for connection in self.active_connections:
        try:
            await connection.send_json(data)
        except Exception:
            pass  # ← NO remueve la conexión fallida de la lista
```

**Descripción:** Si un WebSocket se cierra abruptamente (sin pasar por `WebSocketDisconnect`), la conexión muerta nunca se remueve de `active_connections`. Cada 2 segundos (ticker broadcast) se intenta enviar datos a esta conexión zombie, generando excepciones silenciosas y degradando el rendimiento del broadcast.

**Severidad:** 🟡 ALTO — Memory leak de conexiones; broadcast se vuelve más lento con cada conexión zombie acumulada.

---

### H3. Fear & Greed, VIX y dominancia hardcodeados en main.py

**Archivo:** `main.py`, líneas 150-154

```python
fear_greed_val = 28
fear_greed_label = "Fear"
vix_val = 16.74
btc_dominance = 58.34
```

**Descripción:** Valores fijos que permanecen inalterables a menos que exista `indicador_data.json` con datos frescos. Si `indicador_data.json` no existe o está desactualizado, el análisis usa valores stale. El VIX (16.74) es particularmente sospechoso — habría variado significativamente desde la creación de este código.

**Severidad:** 🟡 ALTO — Datos macro stale = análisis fundamental incorrecto.

---

### H4. `pionex_post()` firma de orden MARKET sin validar quantity precision

**Archivo:** `sono_bot.py`, `place_order()` (línea ~128) y `pionex_post()` (línea ~106)

**Código:**
```python
def place_order(symbol, side, amount):
    data = {
        'symbol': symbol,
        'side': side,
        'type': 'MARKET',
        'amount': str(amount)
    }
    if side == 'BUY':
        data['amount'] = str(amount)  # Sobrescribe con lo mismo
        data['amountType'] = 'QUOTE'
    d = pionex_post('/api/v1/trade/order', data)
```

**Problemas:**
1. `data['amount']` se asigna dos veces (línea 131 y 133) para BUY, con el mismo valor — redundante pero no bug.
2. **Para SELL:** `amount` es cantidad del activo base, pero no se redondea a la precisión del exchange (decimals config). Por ejemplo, para SOL con 2 decimales, pasar 0.344123 causaría error de LOT_SIZE.
3. No se valida cantidad mínima de orden contra el exchange antes de enviar.

**Severidad:** 🟡 ALTO — Potencial error de validación LOT_SIZE en modo real.

---

### H5. `SonoBot.find_position()` solo busca en posiciones abiertas por el bot — ignora posiciones externas en Pionex

**Archivo:** `sono_bot.py`, método `find_position()` (línea ~218)

**Código:**
```python
def find_position(self, asset):
    return self.positions.get(asset)
```

**Descripción:** Este método solo verifica el dict interno `self.positions`, que solo se actualiza cuando el bot mismo abre una posición. Si hay una posición abierta en Pionex (de una orden manual previa), el bot cree que no hay posición y podría intentar comprar de nuevo, violando límites de posición del exchange.

**Severidad:** 🟡 ALTO — En modo real, podría causar duplicación de órdenes. En paper mode no afecta.

---

### H6. `format_score_alert` accede a keys del dict sin `.get()` — potencial KeyError

**Archivo:** `telegram_alerts.py`, línea 114 — `format_score_alert()`

**Código:**
```python
def format_score_alert(asset, score):
    total = score.get('total', '?')
    signal = score.get('signal', 'NEUTRAL')
    ...
    p1 = score.get('p1', 0)
    p2 = score.get('p2', 0)
    p3 = score.get('p3', 0)
```

**Esta función usa `.get()` correctamente.** Pero `format_daily_summary()` (línea 169) y `format_score_cross_alert()` (línea 194) también mezclan `.get()` con acceso directo `score['total']`. Si el dict `score` está incompleto (por ejemplo, de un ciclo donde `computeScore()` devolvió `None` y se usó `{}`), crashea con KeyError.

**Severidad:** 🟡 ALTO — Potencial crash en `send_daily_summary` o `format_score_cross_alert`.

---

### H7. `sono_bot.py` — Evento de trailing stop usa `highest_price` no inicializado en posiciones legacy

**Archivo:** `sono_bot.py`, línea ~333 (trailing stop check en `run_once()`)

**Código:**
```python
if pos and pos.get('entry', 0) > 0:
    gain_pct = ((price - pos['entry']) / pos['entry']) * 100
    highest = pos.get('highest_price', pos['entry'])  # Inicializa con entry si no existe
    if price > highest:
        pos['highest_price'] = price
    trail_high = pos.get('highest_price', pos['entry'])
```

**Descripción:** `highest_price` se inicializa correctamente con `pos['entry']` si no existe, y se actualiza si price lo supera. Esto es correcto para posiciones nuevas. **Sin embargo**, si el bot se reinicia y la posición se cargó de un estado persistente, el trailing stop empieza desde cero (entry price), permitiendo un drawdown mayor del esperado.

**Severidad:** 🟡 ALTO — No hay persistencia de posiciones entre reinicios, por lo que el trailing stop se resetea.

---

### H8. `db_utils.py` — Escritura no atómica, riesgo de corrupción

**Archivo:** `db_utils.py`, `save_snapshot()` (línea 12)

**Código:**
```python
def save_snapshot(data):
    try:
        existing = []
        if os.path.exists(DB_PATH):
            with open(DB_PATH) as f:
                existing = json.load(f)  # ❌ Lee todo el archivo en memoria
        existing.append({'timestamp': ..., 'data': data})
        if len(existing) > 1000:
            existing = existing[-1000:]  # ❌ Slice en memoria
        with open(DB_PATH, 'w') as f:
            json.dump(existing, f, indent=2)  # ❌ No atómico
    except Exception as e:
        print(f'[db_utils] Error save_snapshot: {e}')
```

**Descripción:**
1. Lee todo el archivo en memoria — con snapshots de 1000 entradas puede ser pesado (cada snapshot es el estado completo de 7 timeframes).
2. `open(..., 'w')` trunca el archivo antes de escribir — si el proceso crashea a mitad de `json.dump()`, el archivo queda corrupto.
3. El try/except traga errores silenciosamente — nunca se sabe si la escritura falló.

**Severidad:** 🟡 ALTO — Riesgo de corrupción de datos históricos.

---

## 🟢 LEVES

### L1. `butterfly` de `threading` importado pero no usado

**Archivo:** `sono_bot.py`, línea 8

```python
import json, time, hashlib, hmac, requests, threading, logging, sys, os
```

`threading` se importa pero nunca se usa. El bot usa el hilo principal con `time.sleep()`, no threads.

---

### L2. `MICRO_MODE` hardcodeado sin variable de entorno

**Archivo:** `sono_bot.py`, línea 53

```python
MICRO_MODE = True
```

No hay forma de cambiarlo sin editar el código. No debería afectar funcionalidad pero es mala práctica.

---

### L3. `SEND_TELEGRAM_ALERTS` hardcodeado sin variable de entorno

**Archivo:** `sono_bot.py`, línea 56

```python
SEND_TELEGRAM_ALERTS = True
```

Combinado con el token 401 (C5), el bot sigue intentando enviar alertas que siempre fallan.

---

### L4. `PAPER_MODE` hardcodeado sin variable de entorno

**Archivo:** `sono_bot.py`, línea 49

```python
PAPER_MODE = True
```

Peligro de cambio accidental a modo real. Debería ser `os.getenv('SONO_PAPER_MODE', 'true').lower() == 'true'`.

---

### L5. Log file sin rotación (`RotatingFileHandler`)

**Archivo:** `sono_bot.py`, líneas 14-20

```python
handlers=[
    logging.FileHandler('sono_bot.log', encoding='utf-8'),
    logging.StreamHandler(sys.stdout)
]
```

Sin rotación, el log crece 1.28 MB cada ~3 días. En 30 días: ~13 MB. En un año: ~150 MB. Debería usarse `RotatingFileHandler`.

---

### L6. `trade_log` en memoria sin límite

**Archivo:** `sono_bot.py`, línea 78

```python
self.trade_log = []
```

Lista que crece indefinidamente. Sin purge. Si opera cada 2 minutos, ~21,600 trades/mes.

---

### L7. `_load_config()` en `telegram_alerts.py` cachea en módulo sin recarga en caliente

**Archivo:** `telegram_alerts.py`, líneas 17-33

```python
BOT_TOKEN, CHAT_ID = _load_config()
```

Se ejecuta UNA VEZ al importar el módulo. Si se actualiza `.env`, no se refleja hasta reiniciar el proceso.

---

### L8. `sono_strategy.py` — `analyze()` usa `score['total']` sin verificar que score no sea None

**Archivo:** `sono_strategy.py`, línea 20

```python
action = 'BUY' if score['total'] >= 62 else 'SELL' if score['total'] < 30 else 'HOLD'
```

Si `compute_score()` devuelve `None` (no hay suficientes velas), ya se manejó con `return {'action': 'HOLD', 'score': None}`. Es correcto. Pero si `compute_score()` devuelve un dict sin key 'total', crashea con KeyError.

---

### L9. `sistema_hibrido.py` — Método `evaluar_senales_hibridas()` referenciado en `main.py` pero no implementado

**Archivo:** `sono_strategy.py` — la clase `SonoStrategy` existe.  
**Archivo:** `sistema_hibrido.py` — la clase `SistemaHibridoBTC` existe y tiene `analyze()`, pero **NO** tiene `evaluar_senales_hibridas()`.

**Código en main.py (línea 185):**
```python
res = hibrido.evaluar_senales_hibridas(
    df_candles=df, idx=idx, fear_greed_val=...,
    fear_greed_label=..., vix_val=..., google_trends_val=..., capital=10000.0
)
```

**Descripción:** `main.py` llama a `evaluar_senales_hibridas()` con 7 argumentos, pero `sistema_hibrido.py` solo implementa `analyze(df_dict)`. Esto causará **AttributeError** en runtime.

**Severidad:** 🟢 LEVE porque main.py está roto de todas formas (C2/C7), pero es un bug adicional si se arreglaran los otros.

---

### L10. `scoring.py` — `rsi` no definido si `len(closes) < 14`

**Archivo:** `scoring.py`, línea 53

```python
return {
    ...
    'rsi': float(rsi) if len(closes) >= 14 else None  # ❌ rsi no está definido en este scope si len < 14
}
```

`rsi` se define dentro del bloque `if len(closes) >= 14:`. Si la condición no se cumple, `rsi` no existe y `float(rsi)` lanza **NameError**.

```python
if len(closes) >= 14:
    diffs = np.diff(closes[-15:])
    ...
    rsi = 100 - (100 / (1 + rs))
```

**Severidad:** 🟢 LEVE — main.py nunca llamaría a `scoring.py` con menos de 14 velas en la práctica, pero es un bug latente.

---

## ✅ FIXED (Hallazgos de Auditorías Previas YA CORREGIDOS)

### F1. ~~Import duplicado de `sys` en sono_bot.py~~ ✅ FIXED

**Auditoría previa:** L2 (import sys duplicado en líneas 8 y 10)  
**Estado actual:** Ya no hay duplicado. `import sys` está solo en línea 8.

---

### F2. ~~f-string de ATR causaba `Invalid format specifier` crash~~ ✅ FIXED

**Auditoría previa:** C3 reportaba `Invalid format specifier '.2f if atr else "N/A"'`  
**Estado actual:** En Python 3.14.4 el f-string es sintácticamente válido (no crashea), pero **nunca interpola el valor de ATR** (ver C3). El crash se evitó al cambiar de Python o al corregir la sintaxis, pero la lógica sigue incorrecta.

---

### F3. ~~Import de `threading` no usado~~ → Sigue sin usarse

**No corregido.** Sigue siendo L1.

---

### F4. ~~sono_bot.py tenía `self.BUY_THRESHOLD = 68` sin usar~~ → Sigue sin usarse

**Auditoría previa:** H6 (thresholds hardcodeados no usados)  
**Estado actual:** Siguen ahí (líneas 89-91), sin ser referenciados en ningún método. Son dead code.

---

### F5. ~~telegram_config.json no estaba en .gitignore~~ ✅ FIXED

**Auditoría previa:** Se reportó que `telegram_config.json` no estaba en `.gitignore`  
**Estado actual:** La línea 60 `*_config.json` lo cubre. Sin embargo, no es un repositorio Git activo.

---

## Hallazgos por Archivo - Desglose Detallado

### `sono_bot.py` (592 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| C4 | ~225-235 | 🔴 | Paper mode: verificación de saldo usa cache, no balance real |
| C3 | 339 | 🔴 | f-string de ATR nunca interpola el valor real |
| C6 | 82-96 | 🔴 | Timestamp Pionex sync solo una vez al arrancar |
| H1 | 156, 165 | 🟡 | Sin rate limiting ni backoff a Binance |
| H4 | 128-140 | 🟡 | place_order() no valida precision LOT_SIZE |
| H5 | 218 | 🟡 | find_position() ignora posiciones externas en exchange |
| H7 | ~333 | 🟡 | trailing stop reseteado si bot se reinicia |
| L1 | 8 | 🟢 | `threading` importado no usado |
| L2 | 53 | 🟢 | MICRO_MODE hardcodeado |
| L3 | 56 | 🟢 | SEND_TELEGRAM_ALERTS hardcodeado |
| L4 | 49 | 🟢 | PAPER_MODE hardcodeado |
| L5 | 17 | 🟢 | Log sin rotación |
| L6 | 78 | 🟢 | trade_log sin límite de tamaño |
| F4 | 89-91 | ✅ | BUY_THRESHOLD, SELL_THRESHOLD, STRONG_BUY_THRESHOLD no usados (dead code) |

### `main.py` (244 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| C2 | 161-168 | 🔴 | calculate_advanced_score() llamado con kwargs que no existen en su firma |
| C7 | 161-168 | 🔴 | Mismo bug que C2, TypeError en runtime |
| H2 | 62-68 | 🟡 | Conexiones WS zombies no se limpian en broadcast() |
| H3 | 150-154 | 🟡 | F&G, VIX, dominancia hardcodeados |
| L9 | 185 | 🟢 | evaluar_senales_hibridas() no implementado en SistemaHibridoBTC |

### `telegram_alerts.py` (211 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| C5 | 38-44 | 🔴 | Token Telegram 401 Unauthorized |
| H6 | 169, 194 | 🟡 | format_daily_summary mezcla .get() y acceso directo → KeyError potencial |
| L7 | 17-33 | 🟢 | Config cacheada en módulo sin recarga en caliente |

### `sono_score.py` (156 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| - | todas | ✅ | Sin bugs. Score correcto y consistente con frontend JS |

### `scoring.py` (70 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| L10 | 53 | 🟢 | `rsi` no definido si len(closes) < 14 → NameError |

### `sistema_hibrido.py` (35 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| L9 | - | 🟢 | evaluar_senales_hibridas() no implementado |

### `db_utils.py` (42 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| H8 | 12-34 | 🟡 | save_snapshot() no atómico, riesgo de corrupción |

### `indicators.py` (40 líneas)

| ID | Línea | Gravedad | Descripción |
|----|-------|----------|-------------|
| - | todas | ✅ | Sin bugs. Funciones correctas con pandas |

---

## Verificación de Archivos Externos

| Archivo | Existe | .gitignore | Observación |
|---------|--------|------------|-------------|
| `.env` | ✅ Sí | ✅ `*.env` (línea 8) | No se leyó contenido por política |
| `pionex_credentials.json` | ✅ Sí | ✅ línea 4 + 6 | **Contiene API keys reales en texto plano** ⚠️ |
| `telegram_config.json` | ✅ Sí | ✅ `*_config.json` (línea 60) | **Contiene Telegram token real en texto plano** ⚠️ Token 401 |
| `python/sono_score_py/sono_score.py` | ❌ No | N/A |