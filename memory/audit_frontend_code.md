# 🕵️ Auditoría Profunda — Frontend Sono PRO

> Fecha: 2026-05-30  
> Analista: OpenClaw Subagent  
> Archivos auditados: 10 (5 páginas, 1 router, 1 entrypoint, 2 componentes, 1 CSS global)  
> Hooks/engine: 6 adicionales (useBinance, useBinanceMulti, useMultiTicker, useMacro, useSignals, useWebSocket, indicators)

---

## 🔴 CRÍTICOS (bugs seguros, memory leaks, race conditions)

### 1. MetodoPage — Chart.js: stale closure en `calcRSI` dentro de `useEffect`

**Archivo:** `MetodoPage.jsx`, función `calcRSI` (líneas ~143-163)

```js
function calcRSI(data, period) {
  const gains = [], losses = []
  for (let i = 1; i < data.length; i++) {
    const d = data[i].c - data[i - 1].c
    gains.push(Math.max(0, d))
    losses.push(Math.max(0, -d))
  }
  const rsi = [null]
  for (let i = period; i <= gains.length; i++) {
    const avgG = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    const avgL = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    const rs = avgL === 0 ? 100 : avgG / avgL
    rsi.push(+Math.round(100 - 100 / (1 + rs)))
  }
  while (rsi.length < data.length) rsi.unshift(null)
  return rsi
}
```

**Problema:** Cuando `avgL === 0`, la función retorna `rs = 100`, pero entonces `rsi.push(+Math.round(100 - 100 / (1 + 100)))` = ~99. No 100. Además, el RSI se empuja en orden inverso mediante `unshift(null)`, generando un array siempre del tamaño de `data` pero con nulos hasta `period` y valores después. El algoritmo duplica la función del engine (`calcRSI` en indicators.js) — código duplicado con implementación distinta.

**Impacto:** Cálculos de RSI incorrectos tanto en el chart como en las señales.

### 2. TradesPage — `useMemo` con `filter` repetidos sin caché → re-render masivo

**Archivo:** `TradesPage.jsx`

```js
const closedTrades = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades])
const openTrades = useMemo(() => trades.filter(t => t.status === 'OPEN'), [trades])
```

Cada vez que `trades` cambia (cada 300ms por WS throttle), se ejecutan **dos filtros** sobre arrays completos. Además, todos los `useMemo` que dependen de `closedTrades` (stats, bySetup, filteredClosed, etc.) se re-ejecutan. Con 100 señales en localStorage, cada tick del WS provoca ~8-10 re-render/recálculos.

**Impacto:** Barrera de rendimiento en sesiones largas. Recomendable memoizar con `useRef` para delta updates.

### 3. MetodoPage — Manipulación directa del DOM desde `useEffect`

**Archivo:** `MetodoPage.jsx`, líneas ~257-260

```js
const stopEl = document.getElementById('sig-stop')
const targetEl = document.getElementById('sig-target')
if (stopEl) stopEl.textContent = ...
if (targetEl) targetEl.textContent = ...
```

Estos elementos **no existen en el JSX renderizado**. `document.getElementById` siempre devolverá `null`.

**Impacto:** Código muerto que nunca ejecuta su propósito. Los stops/targets visualizados desde la página de trades o método están rotos.

### 4. RangesPage — `useMemo` con dependencia no estable

**Archivo:** `RangesPage.jsx`

```js
const mainContext = useMemo(() => {
  if (!livePrice || !aggregateConfidence) return null
  const tf15Score = (candlesByTf['15m'] && candlesByTf['15m'].length) ? computeScore(candlesByTf['15m']) : null
  // ...
}, [livePrice, aggregateConfidence, candlesByTf])
```

Dependencias: `livePrice` cambia cada ~300ms por WS, `candlesByTf` es un objeto nuevo en cada actualización (mutación `{ ...prev, '1m': cur }`). **Cada actualización del WS recalcula `mainContext`, `aggregateConfidence` y las `TimeframeCard`**.

### 5. useBinanceMulti — Dependency array `[symbol, timeframes.join(',')]` en `useCallback`

**Archivo:** `useBinanceMulti.js`

```js
}, [symbol, timeframes.join(',')])
```

`timeframes.join(',')` produce un nuevo string *cada render* porque `useBinanceMulti` recibe `['15m','5m','3m','1m']` como literal en cada render de `RangesPage`. La función `loadAll` se recrea en cada render → el `useEffect` que depende de `symbol` se ejecuta en cada render, no solo cuando cambia `symbol`.

**Impacto:** Refetch innecesario de velas REST en cada render de RangesPage. Solución: wrap en `useRef(timeframes)` y derivar dependencia estable.

---

## 🟠 ALTOS (bugs probables, errores lógicos, falta de manejo)

### 6. Código duplicado: 3 hooks que hacen EXACTAMENTE lo mismo

| Hook / Función | Fetch URL | Intervalo |
|---|---|---|
| `useFourTicker` (AgentsPage) | `symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT"]` | Una vez (sin intervalo) |
| `useRealTickers` (MetodoPage, no usado) | Ídem | 10s |
| `useMultiTicker` (hook compartido TradesPage, RangesPage) | Ídem | 15s |
| `useFNG` (MetodoPage, no usado) | `alternative.me/fng` | 60s |
| `useFG` inline (MetodoPage) | Ídem | 60s |
| `useEffect` FG (MacroPage) | Ídem | 30s |

**AgentsPage** usa `useFourTicker` que solo fetchea **una vez** y no tiene `cleanup` ni intervalo:
```js
fetchAll()
return () => {}  // ← no sirve de nada
```

**MetodoPage** define `useRealTickers` y `useFNG` como hooks locales, pero también tiene los mismos fetches inline.

### 7. MacroPage — Google Fonts inyectado en JSX (sin cleanup + CSP violación)

```jsx
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk..." rel="stylesheet"/>
```

Inyectar un `<link>` en el JSX de un componente que se renderiza frecuentemente provoca:
- Duplicaciín de `<link>` tags en el DOM si el componente se re-monta
- La fuente está declarada en `main.jsx` via CSP pero se añade runtime redundante

### 8. MacroPage — Falta de key en arrays de botones

```jsx
{['dashboard','rangos','trades'].map(t => (
  <button key={t} ...>
))}
```

Aunque el key es string único, no hay key en los maps de indicadores, dominancias, etc. No hay riesgo de reorden pero es mala práctica.

### 9. AgentsPage — Props incorrectas pasadas a TopBar

```jsx
<TopBar
  onSetAgent={onSetAsset}  // ← TopBar espera `onSetAsset`, no `onSetAgent`
  ...
/>
```

`TopBar` nunca recibe ni usa `onSetAgent`. La prop se ignora silenciosamente.

### 10. TradesPage — Memory leak: Chart.js instances solo cleanup en montaje siguiente

En `RHistogram` y `EquityCurveChart`:
```js
useEffect(() => {
  // ...
  chartRef.current = new Chart(...)
  return () => { if (chartRef.current) chartRef.current.destroy() }
}, [trades])
```

Si `trades` cambia mientras el cleanup del efecto anterior no ha corrido aún → fuga de instancia Chart.js. React 18 StrictMode lo empeora (doble mount → doble Chart sin destroy). Solución: destruir antes de crear nueva instancia dentro del efecto, no solo en cleanup.

### 11. useSignals — `useEffect` con dependencia `score?.label` que ignora `asset`

```js
useEffect(() => {
  const curr = `${asset}:${score.label}`
  if (curr === prevRef.current) return
  // ...
  newSig = { id: Date.now(), ... }
}, [score?.label, asset])
```

Si el score no cambia pero el asset sí, el efecto no se dispara porque `score?.label` no cambió. `asset` está en la dependency array pero el prevRef compara `${asset}:${score.label}` → el cambio de asset sí se detecta. Sin embargo, la dependencia `score?.label` es una **expresión**, no una propiedad estable — si `score` es `null` y pasa a `{ label: '...' }`, `score?.label` cambia de `undefined` a `'...'`, funciona.

**Problema real:** `alertsOn` siendo `false` (pasado desde TradesPage) no evita el almacenamiento en localStorage: las señales **siempre** se persisten aunque las alertas estén desactivadas. Correcto por diseño, pero no obvio.

### 12. TradesPage — Cálculo inconsistente de R (multiples R)

En el mapeo `realTrades`:
```js
const move = isLong ? exitPrice - entry : entry - exitPrice
r = move / risk
```

Donde `risk = Math.abs(entry - sl)`. Pero `sl = entry * (isLong ? 1 - slPct : 1 + slPct)` con `slPct = 0.003` (0.3%). 

**Problema:** el stop está al 0.3% del entry, no al 2% como dice el método Sono. R se calcula contra un stop minúsculo, inflando artificialmente los R-values.

---

## 🟡 MEDIOS (problemas de diseño, código muerto, estética)

### 13. MetodoPage — Hook `useRealTickers` declarado pero NO usado

La función `useRealTickers` está definida en el módulo pero **nunca se invoca** dentro del componente. Código muerto.

### 14. MetodoPage — Hook `useFNG` declarado pero NO usado

Ídem. El componente tiene su propio `useEffect` para FNG.

### 15. RangeChart — SVG `preserveAspectRatio="none"` distorsiona

```jsx
<svg viewBox="0 0 600 200" preserveAspectRatio="none" ...>
```

El gráfico se estira/encoge deformando la relación de aspecto. En viewports no cuadrados, el chart se ve comprimido o alargado. Mejor `xMidYMid meet`.

### 16. useMacro — Componente nunca usa el hook

`MacroPage.jsx` define `const macro = useMacro()` pero **nunca lo utiliza**. Todo el fetching de datos macro está hecho inline dentro de `MacroPage` con sus propias llamadas a Binance, Alternative.me y CoinGecko.

**Código muerto:** El hook `useMacro.js` con su sistema SWR está completamente desconectado.

### 17. MetodoPage — `chart` en state + ref, patrón confuso

```js
const [chart, setChart] = useState(null)
const chartRef = useRef(null)
```

Chart.js se guarda tanto en state como en ref. Guardar en state fuerza re-render cuando el chart se crea. Debería ser solo ref.

### 18. TradesPage — `slice().reverse()` en cada render en EquityCurveChart

```js
closed.slice().reverse().forEach((t, i) => { ... })
```

Crea una copia y la invierte en cada render para iterar. Costoso si `closedTrades` crece. Mejor iterar en orden natural con índices decrecientes.

### 19. AgentsPage — Parsing de log con regex frágil

```js
const m = line.match(/(\w+): Score=(\d+)/)
```

Si el formato del log cambia (espacios extra, otros delimitadores), este parsing falla silenciosamente. Sin fallback, sin logging de errores de parseo.

### 20. TradesPage — Filtros en select con texto "Todos" como valor vacío

```jsx
<option value="">Todos</option>
<option value="TP">TP</option>
```

`filtroR` se setea como `''` para "Todos", y el filtro compara `t.result !== filtroR`. Con `filtroR = ''` y `t.result = ''`, la comparación falla. El filtro debería omitir su condición cuando está vacío.

---

## 🟢 BAJOS (estilo, organización, DX)

### 21. MacroPage — Inline styles masivos sin CSS

300+ líneas de inline styles. Cero reutilización. Cambiar un color global requiere buscar/reemplazar en 15 sitios.

### 22. MacroPage — `<link>` duplicable en cada render del tab

Aunque React no re-monta el componente completo, el `<link>` está en el JSX del componente que se renderiza. Si `MacroPage` se desmonta/monta por navegación, se añade otro `<link>`.

### 23. AppRouter — `useState` y `onSetAsset` definidos pero solo páginas Macro y Metodo lo reciben

```jsx
<Route path="/trades"  element={<TradesPage />} />
<Route path="/rangos"  element={<RangesPage />} />
```

TradesPage y RangesPage tienen sus propios `useState('BTC')` internos. El `activeAsset` global del router solo llega a Macro y Metodo. Estado fragmentado entre páginas.

### 24. Multiple calls to `useMultiTicker` simultáneos

En RangesPage se llama `useMultiTicker()` y también se llama internamente en TradesPage cuando es el tab activo. Si ambas están montadas, Duplican fetch cada 15s.

### 25. Falta de `timeout` en fetch calls

Ningún `fetch()` usa `AbortController` o `signal`. Una API lenta puede dejar conexiones colgadas que nunca se limpian.

### 26. CSP injectado en main.jsx tiene `'unsafe-inline'` para scripts

El CSP permite `script-src 'unsafe-inline'` (necesario para React), pero abre la puerta a XSS si hay algún `dangerouslySetInnerHTML` o inyección. `MetodoPage` usa `dangerouslySetInnerHTML` en el `Modal`:

```jsx
<div className="drawer-body" dangerouslySetInnerHTML={{ __html: card.body }} />
```

Si `DRAWER_DATA` alguna vez viene de una fuente externa, es XSS directo. Actualmente es hardcoded, pero es un riesgo futuro.

---

## 📊 RESUMEN POR GRAVEDAD

| Gravedad | Cantidad | Principales |
|----------|----------|-------------|
| 🔴 Crítico | 5 | Stale closures en RSI, DOM inexistente, re-renders masivos, dependency array inestable |
| 🟠 Alto | 7 | Código duplicado (3 ticker hooks), props incorrectas, Chart.js leaks, inflado de R |
| 🟡 Medio | 8 | Hooks sin usar, preserveAspectRatio, chart en state+ref, CSP con unsafe-inline |
| 🟢 Bajo | 6 | Inline styles, CSP potencial XSS, fetch sin timeout, estado fragmentado |

## 🔧 RECOMENDACIONES INMEDIATAS

1. **Eliminar código duplicado**: Unificar `useFourTicker`, `useRealTickers` y `useMultiTicker` en un solo hook compartido
2. **Conectar `useMacro`**: MacroPage importa el hook pero no lo usa — migrar todos los fetches inline al hook SWR
3. **Arreglar manipulación DOM directa**: Reemplazar `getElementById('sig-stop')` con `useRef` en el JSX
4. **Eliminar `preserveAspectRatio="none"`** en RangeChart
5. **Memorizar arrays** en TradesPage con `useRef` para delta updates en lugar de `useMemo` con filtros completos
6. **Agregar AbortController** a todas las llamadas fetch
7. **Limpiar Chart.js en RHistogram/EquityCurveChart** dentro del efecto mismo (destruir antes de crear)
8. **Estabilizar dependencia** `timeframes` en useBinanceMulti
9. **Verificar que `calcRSI` duplicada** use la versión del engine (`indicators.js`)
10. **Ajustar stopLoss del 0.3% al 2%** en TradesPage si es intencional o corregir comentarios

## 📁 ARCHIVOS CON MÁS PROBLEMAS

| Archivo | Issues |
|---------|--------|
| `MetodoPage.jsx` | 10+ (calcRSI duplicado, DOM inexistente, hooks no usados, chart mal gestionado, código muerto) |
| `TradesPage.jsx` | 8+ (re-renders, Chart.js leaks, R inflado, filtros rotos, dependency arrays) |
| `RangesPage.jsx` | 4+ (useMemo costoso, dependency inestable, preserveAspectRatio) |
| `AgentsPage.jsx` | 3 (props incorrectas, ticker sin intervalo, parseo frágil) |
| `MacroPage.jsx` | 5 (hook no usado, inline styles, CSP, fetch sin errores) |
