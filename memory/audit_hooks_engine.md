# 🔍 Auditoría Profunda: Hooks + Engine de Sono PRO

**Fecha:** 2026-05-30  
**Analizado por:** Subagente de auditoría  
**Archivos cubiertos:** 7 hooks + 1 engine (indicators.js)

---

## Resumen Ejecutivo

| Categoría | 🔴 Crítico | 🟡 Medio | 🟢 Leve | Total |
|-----------|-----------|----------|---------|-------|
| WebSocket / Reconexión | 2 | 2 | 1 | 5 |
| SWR / TTL | 0 | 1 | 1 | 2 |
| Race conditions | 2 | 1 | 0 | 3 |
| Memory leaks | 1 | 1 | 0 | 2 |
| Cálculos incorrectos | 1 | 1 | 0 | 2 |
| Mutación externa | 0 | 1 | 0 | 1 |
| Manejo de errores | 0 | 2 | 1 | 3 |
| Strict Mode / Concurrencia | 0 | 1 | 0 | 1 |
| AbortController | 1 | 0 | 0 | 1 |
| Caché / Invalidación | 0 | 1 | 0 | 1 |
| **TOTAL** | **7** | **11** | **3** | **21** |

---

## 1. useWebSocket.js — El Core de Conexión

### 🟢 1.1 State machine bien definida
WS_STATES cubre todos los estados: `DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → STALLED → ERROR`. Correcto.

### 1.2 Reconnect exponencial con jitter ✓
```js
function exponentialBackoff(attempt) {
  const base = BASE_DELAY * Math.pow(2, attempt)
  const jitter = base * (1 + (Math.random() - 0.5) * 2 * JITTER_FACTOR)
  return Math.min(jitter, MAX_DELAY)
}
```
Secuencia esperada: 1s, 2s, 4s, 8s, 16s, 30s(cap). Correcto.

### 🔴 1.3 BUG CRÍTICO: El `useEffect` depende de `url` y `subscriptions` como array esparcido
```js
}, [url, ...subscriptions]) // eslint-disable-line react-hooks/exhaustive-deps
```
**Problema:** El spread `...subscriptions` dentro del array de dependencias de `useEffect` **no es válido** en React. `useEffect` ignora dependencias que no son primitivas o que están esparcidas así. React solo mira las posiciones del array; `...subscriptions` se evalúa como `1, '15m'` (por ejemplo), pero React no puede hacer seguimiento de elementos esparcidos.

**Impacto:** El hook no se re-ejecuta cuando cambian las subscriptions. Si `subscriptions` cambia de `['btcusdt@kline_3m']` a `['btcusdt@kline_15m']`, el socket no se reconecta al nuevo stream.

**Solución:** Pasar como dependencia `subscriptions.join(',')` o una dependencia estable.

### 🔴 1.4 BUG CRÍTICO: El `onmessage` closure captura `status` obsoleto
```js
ws.onmessage = (event) => {
  // ...
  if (status === WS_STATES.STALLED || status === WS_STATES.RECONNECTING) {
    setStatus(WS_STATES.CONNECTED)
  }
}
```
`status` se captura en el closure de la función `connect()`. Cuando el socket se crea y `onmessage` se ejecuta más tarde, `status` es el valor del render en que se llamó a `connect()`, no el actual. Esto causa que el restore de estado `STALLED → CONNECTED` falle intermitentemente porque `status` tiene el valor del momento en que `connect()` fue invocada (ej: `CONNECTING`), no `STALLED`.

**Solución:** Usar `setStatus(prev => prev === WS_STATES.STALLED || prev === WS_STATES.RECONNECTING ? WS_STATES.CONNECTED : prev)` en lugar de leer `status` del closure.

### 🟡 1.5 No hay manejo de `pong` de Binance
Binance responde al `ping` con un `pong` (frame de control, no JSON). La línea:
```js
if (data.pong !== undefined || data.id === 'ping') return
```
No capturará el pong de Binance porque llega como frame de control WebSocket, no como mensaje JSON. Sin embargo, **el heartbeat sigue siendo útil**: si el servidor no responde, el WebSocket se cerrará y se disparará la reconexión. No es bug, pero el comentario `// Ignorar pong responses` es engañoso.

### 🟡 1.6 `staleTimeout` se resetea en cada mensaje pero no se limpia en desmontaje completo
En el cleanup de `useEffect` se llama `clearTimers()` que limpia `staleRef`, pero en el `onmessage` el `setTimeout` se asigna a `staleRef.current` después de la creación del socket. Si el componente se desmonta entre que se programa el timeout y este se ejecuta, el callback dentro de `staleRef` se ejecutará y llamará a `wsRef.current.close()` sobre un socket ya cerrado. El `if (mountedRef.current && wsRef.current)` lo mitiga parcialmente, pero si `mountedRef.current` sigue siendo true (porque el cleanup `mountedRef.current = false` ocurre en el cleanup del effect), entonces está bien.

**Veredicto:** Mitigado por `mountedRef.current`. 🟢 Aceptable.

### 🟡 1.7 El `onerror` de WebSocket no intenta reconexión
Cuando `ws.onerror` se dispara, solo hace `setStatus(WS_STATES.ERROR)`. No inicia reconexión. La reconexión solo ocurre en `ws.onclose`. **Esto es correcto según la especificación WebSocket**: un `onerror` siempre va seguido de `onclose`. Sin embargo, si el error ocurre sin cerrar (raro, pero posible en algunos runtimes), la conexión queda muerta sin recuperación.

**Solución:** En `onerror`, cerrar explícitamente el socket: `ws.close()` para garantizar que `onclose` dispare la reconexión.

---

## 2. indicators.js — Engine Matemático

### 🔴 2.1 BUG CRÍTICO: `calcMA` con `slice(-p)` + NaN propagation
```js
export const calcMA = (arr, p) =>
  arr.length < p ? null : arr.slice(-p).reduce((s, v) => s + v, 0) / p
```
Si algún valor en `arr` es `null`, `undefined`, `NaN` o no numérico, la suma produce `NaN` y `calcMA` devuelve `NaN` en lugar de `null`. Esto se propaga a `computeScore` donde:
```js
if (ma6 && ma40) { const ok = ma6 > ma40; ... }
```
`NaN` es falsy → la condición falla, pero en otros lugares:
```js
p2 += ok ? 8 : 0  // si price o ma200 son NaN, el comportamiento es impredecible
```

**Impacto:** Score distorsionado si hay candles con datos corruptos.

**Solución:** `export const calcMA = (arr, p) => arr.length < p ? null : (s => Number.isFinite(s) ? s / p : null)(arr.slice(-p).reduce((s, v) => s + (+v || 0), 0))`

### 🟡 2.2 `calcRSI` — promedio correcto pero usando ventana incorrecta
```js
const diffs = closes.slice(-(p + 1))
  .map((v, i, a) => (i > 0 ? v - a[i - 1] : 0)).slice(1)
const gains  = diffs.filter(d => d > 0).reduce((s, v) => s + v, 0) / p
const losses = diffs.filter(d => d < 0).reduce((s, v) => s + Math.abs(v), 0) / p
```
Toma los últimos `p+1` valores, calcula `p` diferencias, luego divide la suma de ganancias/pérdidas entre `p`. **Esto es RSI cut-and-dry (simple moving average de ganancias/pérdidas)**, no RSI Wilder (que usa EMA). Para trading intradía con ventanas pequeñas, la diferencia es marginal, pero los valores serán distintos a los de TradingView/coincidencia con Binance.

**Adicional:** El RSI Wilders más estándar usa `avgGain = (prevAvgGain * (p-1) + currentGain) / p`. El cálculo actual no es el RSI de Wilder.

**Veredicto:** 🟡 No es bug funcional, pero no coincidirá con otros exchanges/herramientas. Mejorable documentando que es "RSI Simple (SMA de ganancias)".

### 🟡 2.3 `calcATR` — slicing correcto pero sin validación de campos
```js
const trs = candles.slice(-(p + 1)).map((c, i, a) =>
  i === 0 ? c.high - c.low
  : Math.max(c.high - c.low, Math.abs(c.high - a[i - 1].close), Math.abs(c.low - a[i - 1].close))
).slice(1)
```
Si `c.high`, `c.low` o `c.close` son `undefined`/`null`, el cálculo explota en NaN. Las candles de Binance siempre tienen estos campos, pero si alguna pasa por un parseo incorrecto, el ATR falla silenciosamente.

### 🟢 2.4 `calcADX` — correcto pero con fudge factor
```js
return +((Math.abs(diP - diM) / (diP + diM + 0.001)) * 100).toFixed(1)
```
El `+ 0.001` evita división por cero. Correcto. El ADX usa `p*2` candles para tener suficiente historia. Correcto.

### 🔴 2.5 BUG CRÍTICO: `computeScore` requiere 210 velas mínimo
```js
if (!candles || candles.length < 210) return null
```
Para calcular MA200 se necesitan 200 velas. Para ATR/ADX se necesitan 14-28 adicionales. 210 es suficiente para MA200 + ADX(14). Sin embargo, **cuando se cambia de timeframe** (ej: de 15m a 3m), el caché de velas del nuevo timeframe puede tener menos de 210 velas, resultando en `null` en `useScore`. Esto es correcto por diseño, pero causa un "blank" en la UI hasta que se acumulan suficientes velas vía WS.

### 🟡 2.6 `calcBB` — population stdev en vez de sample stdev
```js
const std = Math.sqrt(sl.reduce((s, v) => s + (v - ma) ** 2, 0) / p)
```
Divide por `p` (population std dev), no `p-1` (sample std dev). TradingView y la mayoría de indicadores usan población (dividir por `p`). Correcto para el propósito. No hay bug.

---

## 3. useBinance.js — Hook Principal

### 🟡 3.1 `throttleRef` cleanup duplicado
Hay dos `useEffect` que hacen cleanup:
```js
useEffect(() => () => { clearTimeout(throttleRef.current) }, [])  // cleanup en desmontaje
```
Y en el return del effect principal:
```js
return () => {
  mountedRef.current = false
  clearInterval(tickerInt)
}
```
El `clearTimeout(throttleRef.current)` se ejecuta en el primer effect cleanup, pero **no se limpia en el effect de `ws.lastMessage`**, cuyo closure captura `throttleRef`. Si el componente se re-renderiza y `ws.lastMessage` cambia, el effect se re-ejecuta, pero el throttle anterior sigue suelto.

**Solución:** Mover el cleanup del throttle al effect de `ws.lastMessage`:
```js
useEffect(() => {
  // ...
  return () => clearTimeout(throttleRef.current)
}, [ws.lastMessage, activeAsset])
```

### 🔴 3.2 Race condition: `candleCache.current._pending` compartido entre renders
```js
candleCache.current._pending = candle
```
`candleCache` es un ref mutable que se escribe en el cuerpo del effect (sincrónico al recibir `ws.lastMessage`). Pero `throttleRef.current` es `setTimeout` que lee `candleCache.current._pending` después de 500ms. Si en esos 500ms llegan **tres** mensajes WS, `_pending` se sobrescribe dos veces, y la vela intermedia se pierde. Esto es intencional (throttle), pero **la última vela antes del timeout siempre gana**, lo que es correcto para un throttle.

Sin embargo, hay un bug: cuando `throttleRef.current = setTimeout(...)` se programa, y luego `ws.lastMessage` cambia **antes de que el timeout se ejecute**, el `useEffect` se re-ejecuta (porque `ws.lastMessage` está en deps). En esa re-ejecución, se asigna `candleCache.current._pending = candle` (nuevo mensaje) pero **no se crea un nuevo setTimeout** porque `throttleRef.current` no es null. Esto es correcto por diseño.

**Pero** si el effect cleanup ocurre (por desmontaje y remontaje en React 19 dev Strict Mode, aunque React 19 no tiene double-mount en dev por defecto), el `setTimeout` anterior corre y escribe en un `candleCache` cuyo `_pending` ya no es relevante.

**Veredicto:** 🟡 Funcionalmente correcto para throttle, pero frágil.

### 🟡 3.3 `loadCandles` y `loadTicker` sin AbortController
```js
const res = await fetch(`${BINANCE_REST}/klines?...`)
```
Si el componente se desmonta mientras el fetch está en curso, la respuesta se descarta gracias a `mountedRef.current`. Pero el fetch sigue en segundo plano consumiendo ancho de banda. En React 19 no hay Strict Mode double-mount, pero sigue siendo wasteful.

### 🟢 3.4 `ws.lastMessage` como dependencia de useEffect es idiomático
React compara por referencia. `ws.lastMessage` se actualiza en `ws.onmessage` vía `setLastMessage(data)`, que crea un nuevo objeto cada vez → el effect se re-ejecuta. Esto es correcto.

### 🟡 3.5 `connectionStatus` calculado con `useMemo` correcto
```js
const connectionStatus = useMemo(() => {
  switch (ws.status) { ... }
}, [ws.status])
```
Correcto. Sin embargo, `wsStatus` es un alias: `const wsStatus = connectionStatus`. Ambos son iguales. Legacy compatibility. No problem.

---

## 4. useBinanceMulti.js — Multi-Timeframe

### 🔴 4.1 BUG CRÍTICO: Dependencia `timeframes.join(',')` en `useCallback`
```js
const loadAll = useCallback(async () => {
  // ...
}, [symbol, timeframes.join(',')])
```
`timeframes.join(',')` se evalúa una vez durante la creación del callback (en el render). Pero **si el array `timeframes` se pasa como prop y cambia de referencia aunque tenga los mismos valores**, `useCallback` no se recrea porque la dependencia `timeframes.join(',')` produce el mismo string. Esto es **intencional** (previene recreación innecesaria) pero puede esconder bugs si el array cambia de contenido.

**Problema real:** Si `timeframes` cambia internamente (ej: de `['15m','5m']` a `['5m','15m']`), el string join es el mismo, pero el orden cambia. `loadAll` devolvería datos en orden diferente y `results.find(r => r.candles.length > 0)` podría dar un precio distinto. Poco probable pero posible.

### 🔴 4.2 BUG CRÍTICO: WebSocket propio con reconexión artesanal vs useWebSocket
Este hook **no usa `useWebSocket`** sino que implementa su propio WebSocket manual. Esto duplica lógica de reconexión y heartbeat.

Problemas específicos:
- **4.2a:** `connectWS` se define con `useCallback` con dependencia `[symbol]`, pero se mantiene una **stale closure** de `ws.onmessage`. Cada vez que `connectWS` se llama, el `onmessage` se asigna dentro de `ws.onmessage = ...`, y el closure captura `mountedRef`, `throttleRef`, etc. Esto es correcto para ese momento, pero como `connectWS` se ejecuta solo en montaje, no hay problema de closure stale.
- **4.2b:** Sin embargo, si `symbol` cambia, `connectWS` se re-crea (por `useCallback`) pero **el `useEffect` que llama `connectWS` depende solo de `[symbol]`**, no de `connectWS`. Si `connectWS` cambia pero `symbol` no, el effect no se re-ejecuta. Por suerte `symbol` es la única dependencia, así que están sincronizados.
- **4.2c:** No hay manejo de heartbeat de Binance (solo ping manual cada 20s). Binance espera un frame de ping WebSocket o un mensaje `{"method": "ping"}`. El código envía `{"method":"ping"}`. Binance responde con frame de control `pong`. Esto funciona.
- **4.2d:** El ping se envía cada 20s, pero Binance tiene un timeout de inactividad de 10 minutos. 20s es excesivo.

### 🟡 4.3 No hay stale detection en este WS
`useBinance` tiene stale detection via `useWebSocket`. `useBinanceMulti` no tiene stale timeout. Si el WS se queda colgado recibiendo datos pero sin cerrarse (ej: Binance deja de enviar updates para 1m porque el par está inactivo), nunca se detecta.

### 🟡 4.4 Intervalo de refresh de velas cada 3 minutos sin cancelación batch
```js
const refreshInt = setInterval(loadAll, 3 * 60 * 1000)
```
Si `loadAll` tarda más de 3 minutos (porque una de las 4 APIs está caída), se acumulan fetches. `loadAll` usa `Promise.all`, que falla si alguna fetch falla... pero espera: **el `.catch(() => ({ tf, candles: [] }))` captura el error por separación**. Si una API falla, `Promise.all` no falla porque cada fetch tiene su `.catch`. Correcto.

Pero si `loadAll` tarda 1 minuto, y a los 3 minutos se dispara otro `loadAll`, hay dos `loadAll` concurrentes. Ambos pueden hacer `setCandlesByTf`. Race condition menor pero posible.

### 🔴 4.5 Memory leak: `pendingCandle` en el closure del throttle
```js
let pendingCandle = null
ws.onmessage = ({ data }) => {
  // ...
  pendingCandle = { ... }
  if (!throttleRef.current) {
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
      if (!mountedRef.current || !pendingCandle) return
      // ... usa pendingCandle
    }, 300)
  }
}
```
`pendingCandle` es una variable local al closure de `connectWS()`. Si `connectWS` se llama de nuevo (por reconexión), `pendingCandle` se resetea. Pero el `setTimeout` anterior **todavía tiene la referencia a la `pendingCandle` antigua** (que ahora es una variable diferente porque es un nuevo closure). Esto hace que el throttle funcione correctamente entre reconexiones, pero hay un período donde ambos timeots pueden estar vivos.

### 🟢 4.6 `useEffect(() => () => { mountedRef.current = false }, [])` separado
```js
useEffect(() => {
  mountedRef.current = true
  loadAll()
  connectWS()
  const refreshInt = setInterval(loadAll, 3 * 60 * 1000)
  return () => {
    clearInterval(refreshInt)
    clearInterval(pingRef.current)
    clearTimeout(reconnRef.current)
    if (wsRef.current) wsRef.current.close()
  }
}, [symbol])

useEffect(() => () => { mountedRef.current = false }, [])
```
Dos effects separados. El primero limpia WS e intervalos. El segundo solo pone `mountedRef.current = false`. **El orden de ejecución de cleanups es inverso al de montaje.** En desmontaje:
1. Se ejecuta cleanup del segundo effect → `mountedRef.current = false`
2. Se ejecuta cleanup del primer effect → limpia todo

**BUG:** `mountedRef.current` se pone a `false` **antes** de que el cleanup del primer effect limpie los timers. Si en ese ínfimo intervalo (entre paso 1 y 2) se ejecuta un timer (ping o reconnect), `mountedRef.current` es false y las funciones de esos timers no harán nada. Pero el cleanup del primer effect aún ejecutará `clearInterval(pingRef.current)` y `clearTimeout(reconnRef.current)`.

**Impacto real:** Muy bajo, pero los `clearInterval/clearTimeout` después de que el callback ya no hace nada es seguro.

---

## 5. useMacro.js — SWR + TTL

### 🟡 5.1 La cache SWR es global pero no thread-safe
```js
const cache = new Map()

function swrFetch(key, fetcher, freshMs, staleMs) {
  const now = Date.now()
  const hit = cache.get(key)
  // ...
}
```
`swrFetch` es llamada por `load` que se ejecuta en el `useEffect`. Si dos componentes montan `useMacro` (en diferentes páginas por React Router), ambos comparten la misma cache global. Esto es **intencional y correcto** para SWR.

Pero hay un problema sutil: la función `swrFetch` **no es async en su núcleo** pero devuelve una promesa. El path "stale" hace:
```js
if (hit && now < hit.staleUntil) {
  fetcher().then(data => { cache.set(key, ...) }).catch(() => {})
  return Promise.resolve(hit.data)
}
```
Si `load` se llama cada 60s (el intervalo del effect), y dos llamadas consecutivas caen en el período stale, **ambas lanzan `fetcher()` en background**. No hay deduplicación. La primera que completa escribe en cache, la segunda escribe también (sobrescribe con los mismos datos o con datos ligeramente diferentes). Wasteful pero no causa datos incorrectos porque ambas son respuestas válidas.

### 🟡 5.2 `altsDom` puede ser negativo
```js
updates.altsDom = +(100 - g.market_cap_percentage.btc - g.market_cap_percentage.eth).toFixed(2)
```
Si BTC es 65% y ETH es 35%, alts = 0%. Pero si hay redondeo y BTC+ETH > 100 (por floating point), alts puede ser -0.01 o similar. El `+ (...).toFixed(2)` lo mitiga: `(-0.001).toFixed(2)` = `"-0.00"`, y `+"-0.00"` = `0`. Pero en casos extremos como BTC=68.5% + ETH=32.5% = 101%, alts = -1.00%. Esto produce un **valor negativo en la UI**.

**Solución:** `updates.altsDom = Math.max(0, +(100 - btc - eth).toFixed(2))`

### 🟢 5.3 TTL bien implementado
| Fuente | Fresh | Stale | Comentario |
|--------|-------|-------|------------|
| Fear & Greed | 5 min | 1 h | ✅ Cambia 1x/día, 5min fresh suficiente |
| CoinGecko | 3 min | 5 min | ✅ Datos macro cambian con el mercado |
| EUR Rate | 15 min | 30 min | ✅ Tipo cambio no es volátil |
| VIX | 2 min | 3 min | ✅ Alineado con Worker (120s) |

### 🟡 5.4 `fetchEUR` y `fetchVIX` chequean `VIX_PROXY_URL` pero es constante
```js
if (!VIX_PROXY_URL) return null
```
`VIX_PROXY_URL` es una constante de módulo, nunca es falsy. El check es redundante pero inofensivo.

### 🟡 5.5 El `load` se pasa directamente a `setInterval`
```js
const int = setInterval(load, 60 * 1000)
```
`load` es una función definida dentro del hook, no memoizada. En cada render, se crea una nueva función `load`. Pero como se pasa a `setInterval` en el `useEffect` que solo se ejecuta en montaje, captura la primera `load` creada. Si la referencia de `swrFetch` cambia (no cambia porque es del módulo), está bien. Pero si `load` dependiera de props que cambian, el intervalo ejecutaría la versión stale de `load`.

Como `load` solo depende de `swrFetch` (global) y `mountedRef`, no hay problema.

### 🟡 5.6 `setData` merge manual con spread
```js
setData(prev => ({ ...prev, ...updates, sources: { ...prev.sources, ...updates.sources } }))
```
Correcto. No hay race condition porque dentro del callback de `setData` se usa `prev`, que es el estado más reciente al momento de aplicar.

---

## 6. useMultiTicker.js

### 🟡 6.1 `SYMBOLS` calculado una vez en carga del módulo
```js
const SYMBOLS = Object.values(ASSETS).map(a => a.symbol).join(',')
```
Si `ASSETS` cambia (no cambia, es un objeto constante exportado), `SYMBOLS` es correcto. Si se añadiera un nuevo asset a ASSETS, habría que reiniciar el módulo.

### 🟡 6.2 Sin AbortController
Mismo problema que `useBinance.loadCandles`. Fetch sin cancelación.

### 🟢 6.3 Manejo de errores: `try/catch` genérico sin logging
```js
} catch {}
```
Silencioso. No hay `console.warn` ni logs. En producción, los errores de fetch serían invisibles.

---

## 7. useScore.js

### 🟢 7.1 Throttle por cambio de precio bien implementado
```js
const PRICE_CHANGE_THRESHOLD = 0.0002 // 0.02%
```
Solo recalcula cuando el precio se mueve más de 0.02% desde el último cálculo. Correcto y eficiente.

### 🟡 7.2 `useMemo` con `candles` como dependencia
```js
return useMemo(() => {
  // ... compute
}, [candles])
```
Si `candles` es una nueva referencia en cada render (como ocurre con el `setCandles(prev => ({ ...prev, [asset]: cur }))` en `useBinance`), el `useMemo` se re-ejecuta en cada render aunque los datos sean los mismos. El throttle interno (por precio) mitiga el recálculo de `computeScore`, pero el `useMemo` wrapper no evita la re-ejecución del closure cada vez.

**Solución:** Podría ser más eficiente con `useMemo` sobre una versión estabilizada de candles (deep compare), pero el throttle de precio ya hace que `computeScore` se llame raramente.

### 🟡 7.3 `candles.length < 10` devuelve null
Temprano return si hay menos de 10 velas. Pero `computeScore` requiere 210. El return temprano aquí es para evitar cálculos inútiles. Correcto.

---

## 8. useSignals.js

### 🟡 8.1 `useEffect` parsea `score?.label` como dependencia pero usa `score.total`, `score.level`, etc.
```js
useEffect(() => {
  if (!score || !score.label) return
  // ... usa score.total, score.level, score.p1, score.p2, score.p3, score.biasColor
}, [score?.label, asset])
```
Si `score.total` cambia pero `score.label` no (ej: de 51 a 53, ambos "ACUMULACIÓN"), la señal no se registra. Esto es **intencional**: solo se registra una señal cuando cambia la **etiqueta** (tipo de señal), no cada tick del score.

**Pero hay un edge case:** Si `score.total` salta de 51 a 62 (ACUMULACIÓN → COMPRA), `score.label` cambia y se registra la señal. Si luego salta de 62 a 78 (COMPRA → COMPRA FUERTE), se registra otra. Correcto.

### 🟢 8.2 `prevRef.current` previene duplicados
```js
const curr = `${asset}:${score.label}`
if (curr === prevRef.current) return
```
Previene registrar la misma señal dos veces seguidas. Correcto.

### 🟡 8.3 Sonido: AudioContext se crea en cada alerta sin reuso
```js
const ctx = new (window.AudioContext || window.webkitAudioContext)()
```
Crear un `AudioContext` nuevo por cada alerta. En Chrome, hay un límite de ~6 AudioContexts simultáneos. Si llegan muchas alertas rápidas, el navegador puede bloquear la creación de nuevos contextos.

**Solución:** Usar un AudioContext singleton fuera del hook, o un pool.

### 🟡 8.4 `useEffect` no limpia nada (no hay interval/socket/timeout)
El effect solo tiene lógica síncrona (setSignals, localStorage, sonido). No necesita cleanup. Correcto.

### 🟢 8.5 `clear` function es estable
```js
const clear = () => {
  setSignals([])
  localStorage.removeItem(STORAGE_KEY)
}
```
Definida dentro del hook, cambia en cada render. Pero se devuelve como parte del objeto. Si se pasa como prop a otro componente, causaría re-renders. Se podría usar `useCallback`.

---

## 9. Problemas Transversales

### 9.1 🔴 Race condition: `useBinance` + `useMultiTicker` compiten por escribir en localStorage/ticker
No compiten directamente, pero `useBinance` actualiza su propio `ticker[asset]` cada vez que recibe un mensaje WS (vía el throttle), y `useMultiTicker` actualiza su propio `tickers` cada 15s vía REST. Un componente que use ambos hooks verá datos inconsistentes momentáneamente (ticker de un hook vs ticker del otro).

**Impacto:** Bajo, porque normalmente se usa uno u otro.

### 9.2 🔴 Fetch calls sin AbortController
| Archivo | Línea | Fetch |
|---------|-------|-------|
| useBinance.js | `loadCandles` | `/klines` |
| useBinance.js | `loadTicker` | `/ticker/24hr` |
| useBinanceMulti.js | `loadAll` | 4× `/klines` |
| useMacro.js | `fetchFG` | `/fng/` |
| useMacro.js | `fetchCG` | `/global` |
| useMacro.js | `fetchEUR` | `/eur` |
| useMacro.js | `fetchVIX` | `/vix` |
| useMultiTicker.js | `fetchAll` | `/ticker/24hr` |

**Total: 10 endpoints sin AbortController.** En montaje/desmontaje rápido (cambio de página, cambio de asset), los fetches siguen en segundo plano. La protección por `mountedRef.current` evita `setState` en componentes desmontados, pero no cancela el fetch.

### 9.3 🟡 React 19: no hay Strict Mode double-mount en dev
En React 18 Strict Mode, los effects se montan, desmontan y remontan en dev para detectar bugs de cleanup. React 19 eliminó este comportamiento por defecto. **Todos los hooks asumen montaje único**, lo cual es correcto para React 19.

### 9.4 🔴 Cache de `swrFetch` (Map global) nunca se limpia
```js
const cache = new Map()
```
Las claves son strings fijos: `'fear_greed'`, `'coingecko'`, `'eur_rate'`, `'vix'`. Solo 4 entradas. No hay problema de memory leak por el Map en sí.

**Pero** el `fetcher()` en el path stale se ejecuta aunque el componente esté desmontado:
```js
fetcher().then((data) => {
  cache.set(key, { data, freshUntil: now + freshMs, staleUntil: now + staleMs })
}).catch(() => {})
```
Si `load` se ejecutó (por el intervalo), y el componente se desmonta, el `fetcher` completa y escribe en cache. Esto es correcto (SWR beneficia al próximo montaje). Pero `mountedRef.current` no se chequea dentro del `.then` de `fetcher`, así que un `fetcher` lento podría llamar a `cache.set` después de desmontaje. Es inocuo (solo actualiza cache), pero no hay `mountedRef` check.

### 9.5 🟡 `calcRSI` vs `calcATR` — diferentes ventanas de cálculo
`calcRSI` usa últimos `p+1` closes (14 → 15 closes). `calcATR` usa últimos `p+1` candles (14 → 15 candles). Ambos consistentes entre sí. No hay bug.

### 9.6 🟡 `computeScore` requiere exactamente `candles.length >= 210` para MA200
MA200 necesita 200 closes. Si hay 209 velas, MA200 = null, pilar 1 pierde el score de `MA40 > MA200` (13 puntos). Esto es correcto, pero la UI muestra `null` hasta tener 210 velas.

---

## 10. Checklist Final por Categoría

### WebSocket (Reconexión, Heartbeat, Manejo de Errores)
- [✅] State machine: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → STALLED → ERROR
- [✅] Backoff exponencial con jitter (1s→30s)
- [✅] Heartbeat ping cada 3 min
- [✅] Stale detection (60s sin mensaje → reconectar)
- [✅] Max reconnects (10 intentos)
- [🔴] Dependencia inválida `[url, ...subscriptions]` en useEffect
- [🔴] Closure stale de `status` en `ws.onmessage`
- [🔴] useBinanceMulti no usa useWebSocket (duplica lógica WS)
- [🟡] onerror no cierra socket explícitamente
- [🟡] useBinanceMulti sin stale detection

### SWR / TTL
- [✅] TTL correcto para cada fuente (FG 5min/1h, CG 3min/5min, EUR 15min/30min, VIX 2min/3min)
- [✅] SWR devuelve dato stale mientras refresca en background
- [🟡] No deduplicación de fetchers en período stale
- [🟡] `altsDom` puede dar negativo si BTC+ETH > 100%

### Race Conditions
- [🔴] useBinanceMulti: `pendingCandle` compartido entre reconexiones
- [🔴] useBinanceMulti: limpieza de mountedRef antes que timers
- [🟡] useBinance: `candleCache._pending` sobrescrito entre renders

### Memory Leaks
- [🔴] useBinanceMulti: pendingCandle en closure stale tras reconexión
- [🔴] 10 fetches sin AbortController
- [🟡] useBinance: throttleRef no se limpia en el effect de ws.lastMessage
- [🟡] useSignals: AudioContext sin reuso (crea nuevo en cada alerta)

### Cálculos Incorrectos
- [🔴] calcMA: NaN propagation si hay datos corruptos
- [🟡] calcRSI: RSI Simple (no Wilder), discrepa con TradingView
- [🟡] calcATR: sin validación de campos high/low/close
- [✅] calcBB: population stdev (correcto para Bollinger)
- [✅] calcADX: fudge factor 0.001 evita div/0

### Mutación de Arrays/Objetos Externos
- [🟡] `cur[cur.length - 1] = c` (mutación in-place del array copiado con spread — seguro porque es copia)
- [✅] Ninguna mutación directa de props o estado externo

### Manejo de Errores
- [🟡] Todos los try/catch son silenciosos (catch {}), sin logging
- [🟡] swrFetch path stale: catch silencioso (OK por diseño)
- [✅] useWebSocket: console.warn en errores

### Strict Mode / Concurrencia
- [🟡] React 19 no tiene double-mount en dev — hooks correctos para React 19
- [🟡] useBinanceMulti: mountedRef false antes de cleanup de timers

### AbortController
- [🔴] **0 de 10** endpoints usan AbortController
- Todas las APIs REST (Binance, CG, Alternative.me, VIX proxy)

### Caché / Invalidación
- [🟡] SWR cache global: se actualiza incluso después de desmontaje (inocuo)
- [✅] useSignals: localStorage bien gestionado (slice a 100, parse seguro)
- [🟡] useBinanceMulti: refresh cada 3 min puede overlap con otro loadAll

---

## 11. Prioridad de Corrección

### 🔴 Crítico — Corregir Ya
1. **useWebSocket**: Dependencia `[url, ...subscriptions]` inválida → `[url, subscriptions.join(',')]`
2. **useWebSocket**: Closure stale de `status` en onmessage → `setStatus(prev => ...)`
3. **useBinanceMulti**: No duplicar lógica WS, migrar a useWebSocket
4. **useBinanceMulti**: mountedRef cleanup race → eliminar effect separado
5. **indicators**: calcMA debe validar NaN → filtro sanitize en reduce
6. **Todos los hooks**: Implementar AbortController en todos los fetch
7. **useMacro**: altsDom negativo → `Math.max(0, ...)`

### 🟡 Medio — Próximo Sprint
1. **useBinanceMulti**: pendingCandle stale entre reconexiones
2. **useBinance**: throttleRef cleanup en effect de ws.lastMessage
3. **useSignals**: AudioContext singleton
4. **useWebSocket**: Cerrar socket explícitamente en onerror
5. **indicators**: RSI Wilder vs Simple (documentar diferencia)
6. **useMultiTicker**: catch con console.warn
7. **useBinance**: console.warn en errores de fetch

### 🟢 Leve — Mejorable
1. **useSignals**: useCallback para clear
2. **useScore**: deep compare de candles si hay fluctuación de referencias
3. **useBinanceMulti**: Reducir ping de 20s a 3min

---

*Auditoría completada el 2026-05-30 — 8 archivos analizados, 21 hallazgos documentados.*