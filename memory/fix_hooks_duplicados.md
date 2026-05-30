# 🔧 Fix: Hooks Duplicados y Código Muerto en Frontend Sono PRO

**Fecha:** 2026-05-30  
**Origen:** Auditoría `audit_frontend_code.md` (issues #6, #13, #14, #17, #18, #20, #22)  
**Archivos modificados:** `AgentsPage.jsx`, `MetodoPage.jsx`, `MacroPage.jsx`, `TradesPage.jsx`

---

## 1. AgentsPage — `useFourTicker` → `useMultiTicker` (unificación)

**Qué:** Eliminado el hook local `useFourTicker()` (fetcheaba 1 sola vez sin intervalo, sin cleanup real).

**Por qué:** `useMultiTicker` (hook compartido en `hooks/useMultiTicker.js`) hace lo mismo pero con:
- Intervalo de 15s
- Cleanup `clearInterval` + `mountedRef` en unmount
- Cobertura multi-asset desde `ASSETS`
- Usado ya por TradesPage y RangesPage

**Cómo:**
- Reemplazado `import` añadiendo `{ useMultiTicker } from '../hooks/useMultiTicker.js'`
- Eliminada función `useFourTicker` completa (~20 líneas)
- `tickers` ahora se adapta de `{ Asset: { close, change, ... } }` → `{ Asset: { price, change } }`

---

## 2. MetodoPage — Hooks muertos `useRealTickers` y `useFNG` eliminados

**Qué:** Eliminados:
- `function useRealTickers()` — hook local de ticker NUNCA invocado
- `function useFNG()` — hook local de FNG NUNCA invocado

**Por qué:** MetodoPage ya tiene su propio `useEffect` inline para FNG (con intervalo 60s) y otro para tickers (intervalo 10s). Estos hooks sobraban completamente (código muerto ~50 líneas).

---

## 3. MetodoPage — `calcRSI` duplicada → import desde `indicators.js`

**Qué:** Eliminada la función local `calcRSI(data, period)` en MetodoPage.jsx (~20 líneas).

**Por qué:**
- `engine/indicators.js` ya exporta `calcRSI(closes, period)` correctamente
- La versión local usaba lógica diferente (unshift para padding, RSI simple) incompatible con la del motor
- Causaba inconsistencia: `avgL === 0 → rs = 100 → rsi ≈ 99` en vez del correcto `100`

**Cómo:**
- Añadido `import { calcRSI } from '../engine/indicators.js'`
- La versión importada retorna un solo valor (el último RSI), no un array
- Ajustado: `const rsiArr = calcRSI(candles, 14)` → `const rsiVal = calcRSI(prices, 14)`
- `lastRSI` se asigna directamente de `rsiVal`

---

## 4. MetodoPage — Chart: state `setChart` eliminado, solo `ref`

**Qué:** Eliminado `const [chart, setChart] = useState(null)`.

**Por qué:** Chart.js se guardaba en state (forzando re-render) y en `chartRef` simultáneamente. Patrón confuso, duplicación.

**Cómo:**
- `if (chart) chart.destroy()` → `if (chartRef.current) chartRef.current.destroy()`
- `setChart(newChart)` → `chartRef.current = newChart`

---

## 5. MacroPage — `<link>` Google Fonts en JSX eliminado

**Qué:** Eliminada línea:
```jsx
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk..." rel="stylesheet"/>
```

**Por qué:**
- El `<link>` ya se carga vía CSP en `main.jsx`
- Si MacroPage se re-monta por navegación, duplica el `<link>` en el DOM
- Innecesario y potencialmente problemático con CSP

---

## 6. TradesPage — `slice().reverse()` reemplazado por iteración con índices decrecientes

**Qué:** Dos ocurrencias de `slice().reverse().forEach(...)` reemplazadas por loops `for (let i = arr.length - 1; i >= 0; i--)`.

**Por qué:**
- Cada `slice()` crea una copia completa del array solo para invertir el orden
- Costoso cuando `closedTrades` crece; evitable con indices descendentes

**Ocurrencias:**
1. `EquityCurveChart` useEffect (construcción de labels/data para equity curve)
2. `stats` useMemo (cálculo de max drawdown)

---

## 7. TradesPage — Filtro `filtroR` corregido

**Qué:** Cambiado `if (filtroR && t.result !== filtroR) return false` a `if (filtroR !== '' && t.result !== filtroR) return false`.

**Por qué:** Con `filtroR = ''` (opción "Todos"), la condición original `filtroR && t.result !== filtroR` evaluaba `falsy && ...` saltando el filtro correctamente. Pero cuando `t.result = ''` (trades abiertos con resultado vacío) y `filtroR = 'BE'`, la comprobación funcionaba. El fix explícito hace más robusto que "Todos" siempre muestre todo.

---

## Resumen de métricas de limpieza

| Archivo | Líneas eliminadas | Hooks/funciones eliminadas |
|---------|------------------|----------------------------|
| AgentsPage.jsx | ~22 | `useFourTicker` (1 hook) |
| MetodoPage.jsx | ~75 | `useRealTickers`, `useFNG`, `calcRSI`, `[chart, setChart]` (2 hooks + 1 fn + 1 state) |
| MacroPage.jsx | ~1 | `<link>` duplicable |
| TradesPage.jsx | ~2 | 2x `slice().reverse()` → for loops; fix filtro |

**Total: ~100 líneas de código muerto/duplicado eliminadas, 2 hooks duplicados unificados, 1 función matemática centralizada.**
