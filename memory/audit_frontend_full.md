# AUDITORÍA COMPLETA — FRONTEND SONO PRO

**Fecha:** 2026-05-30  
**Hash base:** commit actual del workspace  
**Alcance:** 18 archivos analizados (páginas, hooks, engine, componentes, router, entry)

---

## 🔴 CRÍTICOS (pueden romper producción)

### CRIT-1: AppRouter.jsx pasa props `activeAsset` / `onSetAsset` a MacroPage, pero MacroPage NO las acepta

**Archivo:** `frontend/src/AppRouter.jsx` línea 34  
**Archivo:** `frontend/src/pages/MacroPage.jsx` línea 3  

```jsx
// AppRouter.jsx (línea 34):
<Route path="/" element={<MacroPage activeAsset={activeAsset} onSetAsset={onSetAsset} />} />

// MacroPage.jsx (línea 3):
export default function MacroPage() {  // ← no recibe props
```

**Problema:** `MacroPage` se define como `export default function MacroPage()` sin parámetros. Todas las props que se le pasan se pierden. React no lanza error por esto, pero `activeAsset` y `onSetAsset` se pasan sin efecto.

**Severidad:** ALTA (no crash, pero no afecta porque MacroPage usa su propio estado interno; es código muerto en llamada)

### CRIT-2: RangesPage.jsx — `mainContext` usa `bb` de `computeScore`, pero `computeScore` ya no devuelve campo `bb`

**Archivo:** `frontend/src/pages/RangesPage.jsx` líneas 106-114  

```jsx
const mainContext = useMemo(() => {
  if (!livePrice || !aggregateConfidence) return null
  const tf15Score = (candlesByTf['15m'] && candlesByTf['15m'].length) ? computeScore(candlesByTf['15m']) : null
  const bb = tf15Score?.bb  // ← bb no existe en el return de computeScore
  if (!bb) return null
  const pctB = (livePrice - bb.lower) / (bb.upper - bb.lower)
  ...
}, [livePrice, aggregateConfidence, candlesByTf])
```

**Problema:** `computeScore()` en `indicators.js` devuelve `{ total, level, label, action, biasColor, p1, p2, p3, p1d, p2d, p3d, ma6, ma40, ma70, ma200, adx, rsi, atr, price }`. No incluye `bb`. Por tanto `tf15Score?.bb` siempre es `undefined`, y `if (!bb) return null` cortocircuita — **`mainContext` siempre es `null`**. El banner siempre muestra "NEUTRAL / Cargando contexto…"

**Severidad:** ALTA — funcionalidad rota permanentemente

### CRIT-3: RangesPage.jsx — `TimeframeCard` llama `calcBB(candles.map(c => c.close), 20)` pero el engine espera `candles` con `{ time, open, high, low, close, volume }` en `calcBB`. De hecho `calcBB` recibe array de closes y funciona, pero el comentario es engañoso. **Revisar**: `calcBB` en indicators.js recibe `closes` (array de números), y en RangesPage le pasa `candles.map(c => c.close)` -> OK. FALSO POSITIVO retirado.

### CRIT-4: usar `ASSETS` de `useBinance.js` en archivos que cargan lazy puede causar race condition

**Archivo:** `frontend/src/pages/RangesPage.jsx` línea 3  
**Archivo:** `frontend/src/pages/TradesPage.jsx` línea 3  

Ambos importan `ASSETS` desde `useBinance.js`:
```jsx
import { ASSETS } from '../hooks/useBinance.js'
```

Esto es correcto, `ASSETS` es una constante exportada, no un hook. No hay race condition real.

✅ **VERIFICADO:** No hay riesgo.

### CRIT-5: MetodoPage.jsx — chartRef.current se usa como ref del canvas PERO luego se reasigna al Chart instance

**Archivo:** `frontend/src/pages/MetodoPage.jsx` línea 92  
**Archivo:** `frontend/src/pages/MetodoPage.jsx` líneas 153-155  

```jsx
// Línea 92:
const chartRef = useRef(null)

// Líneas 153-155:
if (chartRef.current) chartRef.current.destroy()  // ← intenta .destroy() en el canvas element
chartRef.current = new window.Chart(ctx, { ... })   // ← reasigna a Chart instance
```

**Problema:** En la primera ejecución, `chartRef.current` es el `<canvas>` DOM node (asignado por React via `ref={chartRef}`). Se invoca `chartRef.current.destroy()` sobre un DOMElement, lo que **no existe en HTMLCanvasElement**. Esto lanza un error en runtime la primera vez que se renderiza el chart. En la segunda ejecución, `chartRef.current` ya es la instancia Chart, y `destroy()` funciona. Pero el primer intento falla.

**Código exacto:**
```jsx
if (chartRef.current) chartRef.current.destroy()
```

La primera iteración `chartRef.current` es el `<canvas>`, no el Chart. Debería usar una ref separada para la instancia Chart.

**Severidad:** ALTA — error en consola en cada montaje inicial del chart

### CRIT-6: MetodoPage.jsx — `handleSelectCoin` recibe `sym` pero llama `onSetAsset(sym)` a pesar de que en TopBar se pasa `onSetAsset={handleSelectCoin}`. Además TopBar espera `onSetAsset` como prop.

Revisando TopBar.jsx:
```jsx
export default function TopBar({ title, subtitle, status, lastUpdate, activeAsset }) {
```

**TopBar NO acepta props `tickers`, `onSetAsset` ni `lastUpdate`.** Pero en MetodoPage.jsx se le pasan:

```jsx
<TopBar
  title={`Método Sono ${asset}`}
  subtitle="Chart.js · Score real · Señales en vivo"
  status={{ type: 'live', label: 'SONO PRO · v3' }}
  activeAsset={asset}
  onSetAsset={handleSelectCoin}
  tickers={tickerData}
  lastUpdate={null}
/>
```

Y en AgentsPage.jsx:
```jsx
<TopBar
  title="Agentes Sono"
  subtitle="Swing trading autónomo · 24/7"
  status={{ type: 'live', label: 'AGENTES · v3' }}
  activeAsset={activeAsset}
  onSetAsset={onSetAsset}
  tickers={tickers}
  lastUpdate={null}
/>
```

**Problema:** `TopBar` ignora `tickers`, `onSetAsset` y `lastUpdate` porque no están desestructuradas. Los valores se pasan pero no tienen efecto. El asset selector embebido en MetodoPage funciona porque tiene su propio `handleSelectCoin` independiente.

**Severidad:** ALTA — confusión de props, pero no crash porque React ignora props extra

### CRIT-7: TradesPage.jsx — `RHistogram` y `EquityCurveChart` importan Chart.js DIRECTAMENTE (`import { Chart, registerables } from 'chart.js'`) pero NUNCA lo usan — usan `new Chart(canvasRef.current, ...)` donde `Chart` es global

**Archivo:** `frontend/src/pages/TradesPage.jsx` líneas 4-7  

```jsx
import { Chart, registerables } from 'chart.js'
// ...
Chart.register(...registerables)
```

Dentro de `RHistogram` y `EquityCurveChart`, los useEffect usan `new Chart(canvasRef.current, ...)` correctamente. **Este no es un bug — el import es necesario para la referencia `Chart`.**

✅ **VERIFICADO:** Correcto.

### CRIT-8: useWebSocket.js — dependencia inestable en useEffect: `[url, subscriptions.join(',')]`

**Archivo:** `frontend/src/hooks/useWebSocket.js` línea 200  

```jsx
useEffect(() => {
  ...
}, [url, subscriptions.join(',')])
```

**Problema:** `subscriptions.join(',')` recrea un nuevo string en cada render si `subscriptions` es un array literal. En `useBinance.js`:
```jsx
const subscriptions = useMemo(() => 
  sym ? [`${sym}@kline_${interval}`] : []
, [sym, interval])
```

Esto está correctamente memorizado, pero si otro consumidor de `useWebSocket` pasa un array no memorizado, se creará un loop infinito de reconnect. El `eslint-disable` en la línea 200 es un indicador de que esto ya se identificó como riesgoso.

**Severidad:** potencial ALTA dependiendo de consumidores (actualmente OK porque useBinance lo memoriza)

---

## 🟡 ALTOS (bugs importantes, no letales)

### ALT-1: MetodoPage.jsx — `calcRSI` se llama con `prices`, pero RSI espera `closes` como array plano. Correcto porque `prices = candles.map(c => c.c)`.

✅ **VERIFICADO:** Correcto.

### ALT-2: useSignals.js — dependencia incompleta en useEffect

**Archivo:** `frontend/src/hooks/useSignals.js` línea 79  

```jsx
useEffect(() => {
  if (!score || !score.label) return
  const curr = `${asset}:${score.label}`
  if (curr === prevRef.current) return
  prevRef.current = curr
  // ... crea señal, playAlert, sendNotification
}, [score?.label, asset])  // ← solo depende de score.label, NO de score.total, alertsOn, price
```

**Problema:** Cuando `alertsOn` cambia, no se ejecuta el efecto (no está en deps). Cuando `price` cambia, la señal se crea con el price viejo. Cuando `score.total` cambia, no se recrea señal si `score.label` no cambia.

Además, `score` está en `score?.label` como dependencia con optional chaining, lo cual es técnicamente una expresión (no un nombre de variable). Eslint linter se quejaría. Más importante: el `alertsOn` se lee dentro del efecto pero no está en deps.

### ALT-3: useSignals.js — AudioContext singleton potencialmente bloqueado por navegador

**Archivo:** `frontend/src/hooks/useSignals.js` línea 10  

```jsx
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
```

**Problema:** Los navegadores modernos bloquean AudioContext creados antes de una interacción del usuario. Esto es una práctica común pero causará un warning/silencio en consola hasta que el usuario interactúe. No es crítico pero debe documentarse.

### ALT-4: MetodoPage.jsx — la función `load` del último useEffect NO está en dependencias. Usa `currentTF`, `asset`, `fg` pero el array de deps es `[asset, currentTF, fg]` (esto es correcto porque load está definida inline).

✅ **VERIFICADO:** Correcto — `load` se define dentro del efecto.

### ALT-5: MetodoPage.jsx — `syncFmt` o `fmt` para MA podría devolver null

Revisando `fmt`:
```jsx
const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : n.toLocaleString('en-US', { ... })
```

**Problema:** Si `n` es `Infinity` o un número muy grande, `toLocaleString` podría fallar y lanzar `RangeError`. Aunque improbable con datos de Binance, es una vulnerabilidad de NaN-propagation.

### ALT-6: agentsPage.jsx — `parseScores` puede devolver valores mezclados

**Archivo:** `frontend/src/pages/AgentsPage.jsx` líneas 35-42  

```jsx
const parseScores = () => {
  if (!log.length) return null
  const scores = {}
  for (const line of log) {
    const m = line.match(/(\w+): Score=(\d+)/)
    if (m) scores[m[1]] = parseInt(m[2])
    const pm = line.match(/Position:\s*(\w+)/)
    if (pm) scores[pm[1]] = scores[pm[1]] || {}  // ← Sobrescribe número con objeto
  }
  return scores
}
```

**Problema:** Si una línea tiene `Position: BTC` y otra tiene `BTC: Score=85`, la propiedad `scores['BTC']` primero se asigna como `85` (número) y luego se sobrescribe con `{}` (objeto). Depende del orden del log.

### ALT-7: Multiples `key={i}` sin IDs estables en listas

- `MetodoPage.jsx` línea 320: `METHOD_CARDS.map(card => (<div key={card.key} ...))` ✅ Tiene key estable.
- `MetodoPage.jsx` línea 288: `[{n:'MA6×MA70', ...}].map((s, i) => <div key={i} ...)` ❌ key=i, pero es array estático — seguro.
- `RangesPage.jsx` línea 194: `lastActions.slice().reverse().map((l, i) => ... key={i}` ⚠️ key=i pero slice().reverse() — el orden cambia en cada render.
- `TradesPage.jsx` tabla de abiertos y cerrados: `{openTrades.map(t => <tr key={t.id} ...)}` ✅ key estable.
- `TradesPage.jsx` tabla de cerrados: `{pageClosed.map(t => <tr key={t.id} ...)}` ✅ key estable.

✅ **VERIFICADO:** Solo casos seguros o semi-seguros.

### ALT-8: RangesPage.jsx — `xLabels` son números estáticos [-80, -60, ..., 80] usados como índices de posición en SVG. No corresponden a time labels reales — son offsets de velas hacia atrás.

**Archivo:** `frontend/src/pages/RangesPage.jsx` no — es en `RangeChart.jsx` línea 143:  
```jsx
const xLabels = [-80, -60, -40, -20, 0, 20, 40, 60, 80]
```

Se renderizan con:
```jsx
{xLabels.map((x, i) => {
  const xPos = PL + (i / (xLabels.length-1)) * (W - PL - PR)
  ...
})}
```

**Problema:** `xLabels.length-1` = 8. La posición se calcula linealmente (0-1-2-...-8), no basada en valores de xLabels. Los valores [-80,-60,...] no se usan — solo se muestran como texto. Es confuso pero no bug → **cosmético/mejorable**.

### ALT-9: MacroPage.jsx — `cwRef` se declara pero nunca se usa

**Archivo:** `frontend/src/pages/MacroPage.jsx` línea 10  

```jsx
const cwRef = useRef(null)  // ← nunca usado
```

**Problema:** Dead code. `cwRef` no se referencia en ningún lugar del componente.

### ALT-10: TradesPage.jsx — `handleSelectCoin` no existe en TopBar pero se pasa fuera

Revisando: TradesPage NO pasa `onSetAsset` al TopBar — correcto.

### ALT-11: MetodoPage.jsx importa `useEffect` de React pero también de `useRef` — correcto.

### ALT-12: useBinance.js — throttle cleanup en useEffect

**Archivo:** `frontend/src/hooks/useBinance.js` línea 106  

```jsx
useEffect(() => {
  if (!ws.lastMessage) return
  ...
  return () => clearTimeout(throttleRef.current)
}, [ws.lastMessage, activeAsset])
```

**Problema:** El cleanup `clearTimeout(throttleRef.current)` se ejecuta en cada mensaje de WS. Pero el timeout ya se creó y está pendiente — limpiarlo sin resetear el flag `throttleRef.current = null` es inefectivo porque el próximo mensaje verá `throttleRef.current !== null` y no creará un nuevo timeout. Esto puede causar pérdida de mensajes. **Mejorable: usar `throttleRef.current = null` en el cleanup.**

### ALT-13: useBinanceMulti.js — `throttleRef` con estructura anidada

```jsx
const throttleRef = useRef({ _timer: null, _pending: null })
```

En el cleanup del WS:
```jsx
if (!throttleRef.current._timer) {
  throttleRef.current._timer = setTimeout(() => {
    throttleRef.current._timer = null
    ...
  }, 300)
}
```

**Problema:** Similar al anterior — si el componente se desmonta mientras el timeout está activo, no hay cleanup explícito del timeout. El cleanup del useEffect principal `return () => { clearInterval(refreshInt); ... }` no limpia `throttleRef.current._timer`. Memoria potencial retenida.

---

## 🟢 LEVES (limpieza, estilo, mejores prácticas)

### LEVE-1: index.html title genérico "frontend"

**Archivo:** `frontend/index.html` línea 6  

```html
<title>frontend</title>
```

Debería ser "Indicador Sono PRO" o similar. Nota: el build plugin de vite.config.js reescribe el title en producción. Este title solo se ve en dev.

### LEVE-2: MacroPage.jsx — `Historico:` tiene cadenas vacías concatenadas

**Archivo:** `frontend/src/pages/MacroPage.jsx` línea 35  

```jsx
<div style={{fontSize:10,color:'#3d5875',marginTop:4,fontFamily:'JetBrains Mono'}}>Historico:  ·  · </div>
```

Probablemente pensado para valores dinámicos, actualmente muestra `Historico:  ·  · ` (espacios vacíos entre puntos).

### LEVE-3: Multiples archivos con `console.log` en producción

- `useWebSocket.js` líneas 118, 151, 168: `console.log`, `console.warn`
- `vite.config.js` líneas 16, 21: `console.log`

Es aceptable para dev, pero idealmente envueltos en checks de entorno.

### LEVE-4: `_routes.json` excluye `/metodo` del service worker

**Archivo:** `frontend/_routes.json`

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/metodo", "/metodo/*"]
}
```

Esto fuerza a Cloudflare a ir al origin para `/metodo`. Si `metodo.html` es un build estático separado, está bien. Pero si se espera que React Router maneje `/metodo`, esto rompe el SPA routing.

**Corroboración:** AppRouter.jsx tiene ruta `<Route path="/metodo" element={<MetodoPage ... />} />`. Y vite.config.js genera `metodo/index.html` aparte. **Esta exclusión en _routes.json hace que Cloudflare sirva el HTML estático, no el SPA.** Esto puede ser intencional (cada build es standalone), pero es confuso.

### LEVE-5: MetodoPage.jsx — cálculo de `score` usa `fg?.value` que puede ser null → `calcScoreFromIndicators` lo maneja correctamente

✅ **VERIFICADO:** El parámetro `fg` es `null` o undefined-safe en `calcScoreFromIndicators`.

### LEVE-6: MacroPage.jsx — `dom.btc` se usa como divisor para dominancia de alts

```jsx
{dom.btc&&dom.eth?(100-dom.btc-dom.eth).toFixed(2):'--'}
```

Si `dom.btc = 0` y `dom.eth = 0`, el `&&` es falsy → muestra '--'. Pero si uno es 0 y otro no, funciona. **No es bug, es safe.**

### LEVE-7: AssetsPage.jsx — `const { log, error } = useBotLog()` — `error` se usa solo en el AgentCard como fallback

Correcto, no es dead code.

### LEVE-8: `calcMA` en `indicators.js` tiene una versión de array de closes. `calcMA` en `MetodoPage.jsx` es otra función local que opera sobre candles con `.c`. **DUPLICACIÓN: misma función, distinta implementación.**

**Archivo:** `frontend/src/engine/indicators.js` línea 5 (export const calcMA)  
**Archivo:** `frontend/src/pages/MetodoPage.jsx` línea 66 (function calcMA local)

**Problema:** La función local `calcMA` en MetodoPage.jsx usa `b.c` (close) pero podría importar `calcMA` de indicators.js y pasarle `.map(c => c.c)`. Código duplicado.

### LEVE-9: `useWebSocket.js` — constante `WS_STATES.ERROR` se asigna dos veces (duplicado conceptual)

### LEVE-10: AgentsPage.jsx — `nf` (number format) declarada pero usada solo en `fmt` interno — dead code potencial

```jsx
const nf = (n) => n == null || isNaN(n) ? '—' : Number(n).toFixed(2)
```

Esta función nunca se usa en el componente.

### LEVE-11: Multiple imports de `useEffect` sin usar `useCallback` en RangesPage.jsx

RangesPage usa `useMemo` y `useEffect`, correcto.

### LEVE-12: `favicon.svg` y `icons.svg` existen en public/ pero el title de dev es "frontend"

### LEVE-13: MacroPage.jsx — `up` se usa para color coding inline en el hero

```jsx
const up = ch >= 0
```

Se define pero no en un hook, es cálculo en render → correcto.

### LEVE-14: AppRouter.jsx — ruta duplicada: `/macro` y `/` apuntan a MacroPage. `/dashboard` y `/dashboard_sono` hacen redirect a `/`.

Sin problema funcional, pero `/macro` es redundante con `/`.

---

## ✅ VERIFICADOS (archivos/patrones correctos)

### ✅ V-1: `useBinance.js` — AbortController en fetch

```jsx
const abortController = new AbortController()
const res = await fetch(..., { signal: abortController.signal })
```

✅ Usa `abortController.abort()` en cleanup.

### ✅ V-2: `useMacro.js` — SWR cache + AbortController

```jsx
const abortController = new AbortController()
load(abortController.signal)
// ...
return () => {
  mountedRef.current = false
  clearInterval(int)
  abortController.abort()
}
```

✅ Patrón correcto.

### ✅ V-3: `useMultiTicker.js` — abortController + interval cleanup

✅ Correcto.

### ✅ V-4: `useBinanceMulti.js` — AbortController + cleanup completo

✅ Aunque throttle no se limpia explícitamente, el cleanup principal cancela fetches y WS.

### ✅ V-5: `TradesPage.jsx` — Chart.js destroy en cleanup de useEffect

```jsx
return () => { if (chartRef.current) chartRef.current.destroy() }
```

✅ Correcto en ambos `RHistogram` y `EquityCurveChart`.

### ✅ V-6: `MetodoPage.jsx` — `setPag(0)` en cambio de filtros

```jsx
useEffect(() => { setPag(0) }, [filtroR, filtroSide, filtroBuscar])
```

✅ Correcto (TradesPage).

### ✅ V-7: Archivos `.eliminado` NO importados en vivo

- `App.jsx.eliminado` — no importado
- `scoreEngine.js.eliminado` — no importado  
- ✅ Limpieza correcta.

### ✅ V-8: `EquityCurveChart.jsx` y `ScoreGauge.jsx` no existen en disco — no se importan desde ningún archivo vivo

Revisados todos los imports. Ningún archivo vivo importa estos componentes.

### ✅ V-9: `useTicker.js`, `useFourTicker.jsx`, `useRealTickers.js` no existen en disco — no se importan desde ningún archivo vivo

✅ Limpio.

### ✅ V-10: Router usa `HashRouter` — funciona en Cloudflare Pages sin configuración especial de SPA fallback

### ✅ V-11: `main.jsx` inyecta CSP dinámico — compatible con Cloudflare Pages

### ✅ V-12: TopBar recibe `status` como objeto `{ type, label }` — todas las páginas lo pasan correctamente

### ✅ V-13: No hay mutación directa de estado (`.reverse()`, `.sort()` sin copia) en ningún archivo

Revisado:
- `AgentsPage.jsx` hace `lastActions.slice().reverse()` → ✅ copia segura
- `MetodoPage.jsx` y otros no mutan arrays de estado

### ✅ V-14: `useScore.js` usa `useRef` para cache + `useMemo` — performance correcta

### ✅ V-15: No hay `getElementById` o `querySelector` con ids que no existen en el DOM

Las únicas referencias a ids son:
- `document.getElementById('root')` en main.jsx ✅ existe en index.html
- `<span id="ts">` en MetodoPage.jsx — solo renderiza texto, sin acceso JS ✅ seguro
- `localStorage.getItem(STORAGE_KEY)` — depende de entorno, pero con try/catch ✅

---

## 📊 RESUMEN POR ARCHIVO

| Archivo | CRIT | ALT | LEVE | Estado |
|---|---|---|---|---|
| MacroPage.jsx | 0 | 0 | 2 | ✅ Bueno |
| MetodoPage.jsx | 3 | 1 | 1 | ⚠️ Crítico chartRef + TopBar props |
| TradesPage.jsx | 0 | 0 | 0 | ✅ Muy bueno |
| RangesPage.jsx | 2 | 1 | 0 | ⚠️ `mainContext` siempre null |
| AgentsPage.jsx | 0 | 1 | 1 | ⚠️ parseScores bug |
| useWebSocket.js | 1 | 0 | 0 | ⚠️ Dep inestable |
| useBinance.js | 0 | 1 | 0 | ⚠️ Throttle cleanup |
| useBinanceMulti.js | 0 | 1 | 0 | ⚠️ Throttle sin cleanup |
| useMacro.js | 0 | 0 | 0 | ✅ Excelente |
| useScore.js | 0 | 0 | 0 | ✅ Excelente |
| useSignals.js | 0 | 1 | 0 | ⚠️ Deps incompletas |
| useMultiTicker.js | 0 | 0 | 0 | ✅ Excelente |
| indicators.js | 0 | 0 | 0 | ✅ Excelente |
| RangeChart.jsx | 0 | 0 | 0 | ✅ Bueno |
| TopBar.jsx | 1 | 0 | 0 | ⚠️ Props extra ignoradas |
| AppRouter.jsx | 0 | 0 | 1 | ⚠️ MacroPage props |
| main.jsx | 0 | 0 | 0 | ✅ Bueno |
| vite.config.js | 0 | 0 | 1 | ⚠️ console.log |
| index.html | 0 | 0 | 1 | ⚠️ title "frontend" |

---

## 🏆 PRIORIDAD DE ACCIÓN

1. **🔴 CRIT-2** — `mainContext` roto en RangesPage (siempre null). Arreglo: añadir `bb` al return de `computeScore` o usar `calcBB` directamente.
2. **🔴 CRIT-5** — `chartRef.current.destroy()` sobre DOMElement en MetodoPage. Arreglo: usar segunda ref para instancia Chart.
3. **🔴 CRIT-6** — TopBar ignora props `tickers`, `onSetAsset`, `lastUpdate`. MetodoPage y AgentsPage las pasan sin efecto.
4. **🟡 ALT-6** — `parseScores` objeto vs número en AgentsPage.
5. **🟡 ALT-2** — Dependencias incompletas en `useSignals`.
6. **🟡 ALT-12/ALT-13** — Cleanup de throttle en hooks WS.
7. **🟢 LEVES** — Limpieza general.

---

*Fin del reporte de auditoría — 30 mayo 2026*
