# 🔧 Fix: Memory Leaks + Seguridad en Frontend Sono PRO

**Fecha:** 2026-05-30  
**Auditoría base:** `audit_hooks_engine.md`  
**Archivos corregidos:** 6 hooks + 1 página  
**Total cambios:** 14 bloques editados  

---

## Resumen de Correcciones

| # | Archivo | Fix | Razon |
|---|---------|-----|-------|
| 1 | `useBinance.js` | ✅ AbortController en `loadCandles` y `loadTicker` | Race condition: fetch sin cancelar en desmontaje |
| 2 | `useBinance.js` | ✅ throttleRef cleanup movido al effect de `ws.lastMessage` | Memory leak: throttleRef no se limpiaba al re-ejecutarse el effect |
| 3 | `useBinanceMulti.js` | ✅ AbortController en `loadAll` con `abortRef` persistente | 4 fetchs paralelos sin cancelación, se acumulaban si desmontaba |
| 4 | `useBinanceMulti.js` | ✅ `pendingCandle` movido a `throttleRef._pending` (ref persistente) | Stale closure: `pendingCandle` variable local capturada por timeout entre reconexiones |
| 5 | `useBinanceMulti.js` | ✅ `throttleRef` inicializado como objeto `{ _timer, _pending }` | Soportar almacenamiento de pending candle en ref |
| 6 | `useMacro.js` | ✅ AbortController en el effect principal, `signal` propagado a todos los fetchers vía `swrFetch` | 4 endpoints externos sin cancelación |
| 7 | `useMacro.js` | ✅ `fetchFG/CG/EUR/VIX` aceptan parámetro `signal` | Cada fetch usa `{ signal }` en options |
| 8 | `useMultiTicker.js` | ✅ AbortController en effect + signal en fetch | Ticker REST periódico sin cancelación |
| 9 | `AgentsPage.jsx` | ✅ AbortController en `useBotLog` fetch + cleanup | Fetch REST de bot log sin cancelación |
| 10 | `useSignals.js` | ✅ AudioContext singleton fuera del hook (`const audioCtx = new AudioContext()`) | Chrome limita ~6 AudioContexts simultáneos; creaba uno nuevo por cada alerta |
| 11 | `TradesPage.jsx` | ✅ `RHistogram`: destroy Chart ANTES de new Chart + comentario | Chart.js memory leak: instancia anterior no se destruía al re-ejecutar effect |
| 12 | `TradesPage.jsx` | ✅ `EquityCurveChart`: destroy Chart ANTES de new Chart + comentario | Ídem |

---

## Detalle de Cambios

### 1. useBinance.js — AbortController + throttleRef cleanup

**loadCandles:**
```js
const abortController = new AbortController()
fetch(url, { signal: abortController.signal })
```

**loadTicker:**
```js
const abortController = new AbortController()
fetch(url, { signal: abortController.signal })
```

**throttleRef cleanup (crítico):**
- Antes: effect separado `useEffect(() => () => { clearTimeout(throttleRef.current) }, [])`
- Ahora: `return () => clearTimeout(throttleRef.current)` dentro del effect de `[ws.lastMessage, activeAsset]`
- Esto asegura que al re-ejecutarse el effect por cambio de `ws.lastMessage`, el throttle anterior se limpia y no hay fugas entre renders.

### 2. useBinanceMulti.js — AbortController + pendingCandle leak fix

**AbortController en loadAll:**
- Se crea `abortRef` persistente via `useRef(null)`
- Cada llamada a `loadAll` aborta el fetch anterior antes de empezar
- En el cleanup del effect principal: `if (abortRef.current) abortRef.current.abort()`

**pendingCandle leak fix:**
- Antes: `let pendingCandle = null` (variable local en closure de `connectWS`)
  - En reconexión se creaba un nuevo closure, el antiguo `setTimeout` aún referenciaba la variable vieja
- Ahora: `throttleRef.current = { _timer: null, _pending: null }`
  - `_pending` y `_timer` viven en el ref, no en el closure
  - Reconexión simplemente sobrescribe `_pending` — el timer siempre lee la ref actual

### 3. useMacro.js — AbortController + signal propagation

- `swrFetch` acepta parámetro `signal` y lo pasa a `fetcher(signal)`
- Cada fetcher (`fetchFG`, `fetchCG`, `fetchEUR`, `fetchVIX`) acepta `signal` y lo pasa a `fetch(url, { signal })`
- El effect principal crea 1 `AbortController`, lo pasa a `load()` y a cada llamada del intervalo
- Cleanup: `abortController.abort()` cancela cualquier fetch en curso al desmontar

### 4. useMultiTicker.js — AbortController

- Creación de `AbortController` al inicio del effect
- `signal` pasado a `fetch`
- Cleanup llama `abortController.abort()`

### 5. AgentsPage.jsx — AbortController

`useBotLog`:
- AbortController creado en el effect
- Signal pasado a `fetch('/api/bot-log', { signal })`
- Cleanup: `clearInterval(iv); abortController.abort()`

### 6. useSignals.js — AudioContext singleton

```js
// Antes (dentro de playAlert, se creaba en cada alerta):
const ctx = new (window.AudioContext || window.webkitAudioContext)()

// Ahora (fuera del hook, singleton):
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
const playAlert = (type) => {
  try {
    const ctx = audioCtx  // reutiliza el singleton
    ...
```

Esto evita el límite de ~6 AudioContexts de Chrome. Las alertas ahora reutilizan el mismo contexto.

### 7. TradesPage.jsx — Chart.js destroy before recreate

En ambos componentes (`RHistogram` y `EquityCurveChart`):
```js
useEffect(() => {
    if (!canvasRef.current) return
    // Destruir instancia anterior ANTES de crear nueva
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    ...
    chartRef.current = new Chart(canvasRef.current, { ... })
    return () => { if (chartRef.current) chartRef.current.destroy() }
}, [trades])
```

Antes: el `destroy()` existía solo A VECES en la primera línea, y en el return cleanup. Con el `useEffect` dependiendo de `[trades]`, al cambiar `trades` se recreaba el chart sin destruir el anterior, causando memory leak.

---

## Verificación

- ✅ Todos los archivos mantienen sintaxis válida (braces balanceados)
- ✅ useBinance.js: 2 fetchs, 2 AbortController
- ✅ useBinanceMulti.js: 1 fetch batch con AbortController + abortRef
- ✅ useMacro.js: 4 fetchs, todos con `{ signal }`, singleton AbortController
- ✅ useMultiTicker.js: 1 fetch con AbortController
- ✅ AgentsPage.jsx: 1 fetch con AbortController
- ✅ useSignals.js: 1 AudioContext singleton (no por alerta)
- ✅ TradesPage.jsx: 2 Chart.js con destroy antes de recreate
- ✅ useBinance.js: throttleRef cleanup integrado en el effect correcto

**Endpoints REST protegidos: 9/9** ✅
**Race conditions mitigadas:** mountedRef + AbortController
**Memory leaks corregidos:** throttleRef, pendingCandle, Chart.js instances, AudioContext
