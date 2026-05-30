# Auditoría Frontend — Indicador Sono PRO

**Fecha:** 2026-05-30  
**Auditor:** Subagente de auditoría (profundidad 1)  
**Objetivo:** Detectar código duplicado, imports rotos, dependencias no usadas, dead code, errores lógicos y duplicación de funciones.

---

## Resumen Ejecutivo

| Categoría | Hallazgos | Severidad |
|---|---|---|
| ✅ **Función duplicada (CRÍTICO)** | `computeScore` existe en DOS archivos con firmas diferentes | 🔴 ALTA |
| ✅ **Función duplicada (ALTA)** | `calcMA`, `calcRSI`, `calcBB`, `calcATR`, `calcADX` duplicadas en `indicators.js` y `scoreEngine.js` | 🔴 ALTA |
| ✅ **Archivos .bak huérfanos** | 3 archivos `.bak` en producción nunca se cargan | 🟡 MEDIA |
| ✅ **Componente no usado** | `MetricCard.jsx` y `CandleChart.jsx` importados en 0 archivos | 🟡 MEDIA |
| ✅ **Recharts no usado** | Dependencia en `package.json` pero ningún import en el código | 🟡 MEDIA |
| ✅ **Servicios vacío** | `src/services/` existe pero está vacío | 🟢 BAJA |
| ✅ **Servicio no usado** | `src/services/` es directorio muerto | 🟢 BAJA |
| ✅ **CSS duplicado de scrollbar** | `::-webkit-scrollbar` definido tanto en `theme.css` como en `pages.css` | 🟢 BAJA |
| ✅ **`_routes.json` y `metodo.html` referenciados** | Existen en build script pero no en repo | 🟢 BAJA |
| ✅ **App.jsx vs AppRouter.jsx** | Router duplicado — App.jsx es dead code (no se usa, main.jsx carga AppRouter) | 🔴 ALTA |
| ✅ **Errores lógicos potenciales** | Varios issues en páginas y hooks | 🟡 MEDIA |
| ✅ **VIX en MacroPage** | Muestra "No disponible" siempre (no hay fetch de VIX) | 🟢 BAJA |

---

## 🔴 1. Router Duplicado: App.jsx es Dead Code

**Archivos:** `App.jsx` y `AppRouter.jsx`

**Problema:** Ambos archivos definen el mismo HashRouter con las mismas rutas.  
**Evidencia:** `main.jsx` importa `AppRouter`, no `App`. `App.jsx` jamás se carga en runtime.

**Impacto:** 60 líneas de código muerto. Si alguien modifica rutas en App.jsx pensando que está vivo, no funcionarán.

**Acción:** Eliminar `App.jsx` o renombrarlo a `App.jsx.DEAD`.

---

## 🔴 2. computeScore DUPLICADO en engine/

**Archivos:** `engine/indicators.js` (línea 138) y `engine/scoreEngine.js` (línea 82)

**Problema:** `computeScore` existe en ambos archivos con la misma lógica de cálculo PERO con FIRMAS DIFERENTES:

- **`scoreEngine.js`** — usa `sono-score-config.json` para thresholds, devuelve claves como `labelKey: 'strong_long'`
- **`indicators.js`** — **NO** usa el JSON, tiene valores hardcodeados, devuelve claves como `label: 'COMPRA FUERTE'`

**Archivos que importan desde `indicators.js`:**
- `pages/RangesPage.jsx` — importa `computeScore` desde `indicators.js`
- `pages/TradesPage.jsx` — importa `computeScore` desde `indicators.js`
- `hooks/useScore.js` — importa `computeScore` desde `indicators.js`

**Archivos que importan desde `scoreEngine.js`:**
- **Ninguno.** ❌ `scoreEngine.js` no es importado por ningún archivo del frontend.

**Impacto:** El frontend nunca usa el score configurable vía JSON. Usa la versión hardcodeada de `indicators.js`. Hay dos implementaciones de `computeScore` que pueden divergir.

**Acción:** Unificar en `scoreEngine.js` como fuente única, y que todos los imports apunten allí. O eliminar `scoreEngine.js` si el bot Python es el único consumidor.

---

## 🔴 3. Funciones de indicadores duplicadas en ambos engines

**Archivos:** `engine/indicators.js` y `engine/scoreEngine.js`

**Ambos contienen funciones IDÉNTICAS:**
- `calcMA` — exactamente la misma implementación
- `calcRSI` — exactamente la misma implementación
- `calcBB` — exactamente la misma implementación
- `calcATR` — exactamente la misma implementación
- `calcADX` — exactamente la misma implementación

**Problema:** Si se corrige un bug en uno, el otro queda desactualizado. Doble mantenimiento.

**Acción:** Mover todas las funciones puras a un archivo común (ej: `engine/indicators.js`) y que `scoreEngine.js` las importe de allí.

---

## 🟡 4. Archivos .bak en producción

**Archivos:**
- `hooks/useBinance.js.bak`
- `pages/MetodoPage.jsx.bak`
- `pages/TradesPage.jsx.bak`

**Problema:** Backups versionados que deberían estar en `.gitignore` o eliminarse. Pueden confundir a la hora de debuggear cuál archivo se está ejecutando realmente.

**Acción:** Eliminar o añadir `*.bak` al `.gitignore`.

---

## 🟡 5. Componentes No Usados

### MetricCard.jsx — NO importado por ningún archivo
**Archivo:** `components/MetricCard.jsx`  
**CSS asociado:** `components/MetricCard.css`

Ninguna página lo importa. Las páginas construyen sus cards inline con estilos en línea o clases de `pages.css`.

### CandleChart.jsx — NO importado por ningún archivo
**Archivo:** `components/CandleChart.jsx`

Ninguna página lo importa. El gráfico de velas en `MetodoPage.jsx` usa directamente Chart.js + canvas en línea.

---

## 🟡 6. Recharts en package.json — NO usado

**Dependencia:** `"recharts": "^3.8.1"` en `package.json`

**Búsqueda:** `grep -r "recharts" src/` → **cero resultados**

Todo el charting se hace con `chart.js` (que sí se usa). `recharts` es peso muerto en el bundle.

---

## 🟡 7. Posibles Errores Lógicos

### 7a. AgentsPage.jsx — `parseScores()` con bug potencial
```js
const pm = line.match(/Position:\s*(\w+)/)
if (pm) scores[pm[1]] = scores[pm[1]] || {}
```
Si un asset (ej: BTC) ya fue seteado con un score numérico, este código lo **sobrescribe con un objeto vacío**. Se pierde el score numérico si primero aparece un score y luego un Position para el mismo asset.

### 7b. RangesPage.jsx — `useBinanceMulti` sin dependencia de activeAsset
```js
useEffect(() => {
  // ... setup ...
  return cleanup
}, [symbol])
```
`symbol` cambia correctamente, pero el cleanup `return () => { mountedRef.current = false }` en un `useEffect` separado sin dependencias significa que el flag se limpia AL DESMONTARSE, pero no hay un segundo efecto que restaure `mountedRef.current = true` si el símbolo cambia sin desmontar el componente. Afortunadamente el primer `useEffect` sí tiene `mountedRef.current = true`, así que funciona en re-montajes pero en re-renders con nuevo símbolo sin desmontar hay race condition potencial.

### 7c. AgentsPage.jsx — `lastActions.reverse()` muta el array original
`.reverse()` es mutante. Se llama en render y modifica el array `lastActions`. React no se quejará porque no es estado, pero es mala práctica.

### 7d. MetodoPage.jsx — `handleSelectCoin` duplica state
```js
const [selectedAsset, setSelectedAsset] = useState('BTC')
```
Y recibe `activeAsset` de props. Ambas fuentes de verdad no están sincronizadas si el padre cambia `activeAsset` sin llamar a `handleSelectCoin`.

### 7e. MacroPage.jsx — VIX placeholder falsa
```js
VIX: { label: 'VIX', value: '--', sublabel: 'No disponible' }
```
Siempre muestra "No disponible". El hook `useMacro.js` sí obtiene VIX, pero `MacroPage` nunca lo usa — tiene su propio fetch inline que no incluye VIX.

### 7f. TradesPage.jsx — demoMode usa `useMemo` que nunca se recalcula
```js
const demoTrades = useMemo(() => {
  if (!demoMode) return []
  // ...
}, [demoMode])
```
Esto está bien **si** `demoMode` cambia. Pero las fechas `Date.now() - i * 3600000` se calculan una vez y nunca se actualizan. Es esperado (demostración), pero podría confundir.

---

## 🟢 8. Directorio services/ vacío

**Ruta:** `src/services/`

El directorio existe pero está vacío. Probablemente planificado para un service layer (API calls centralizadas) que nunca se implementó.

**Acción:** Eliminar o dejar con un `.gitkeep` si se planea usar.

---

## 🟢 9. CSS Scrollbar duplicado

**theme.css:**
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }
```

**pages.css:**
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.15); border-radius: 999px; }
```

Dos definiciones diferentes. Gana la que tenga mayor especificidad/orden de carga. El resultado es impredecible.

**Acción:** Unificar en `theme.css`.

---

## 🟢 10. build script referencia _routes.json y metodo.html

**vite.config.js:**
```js
const srcM = path.resolve('metodo.html')
// ...
const routesSrc = path.resolve('_routes.json')
```

Estos archivos no existen en el workspace actual. El `closeBundle` fallará silenciosamente. Si no se necesitan, eliminar del build script.

---

## 🟢 11. MacroPage usa estilo inline con tipografía Space Grotesk no cargada

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk..." rel="stylesheet"/>
```

Añade un `<link>` dinámico en el render del componente. Esto es válido pero poco idiomático en React. Además, la fuente Space Grotesk no es la misma que Inter (usada en el theme.css). MacroPage se ve diferente al resto.

---

## 🟢 12. MacroPage ignora completamente la infraestructura existente

- No usa `TopBar` — construye su propia nav inline
- No importa `pages.css` — todo el CSS es inline
- No usa `theme.css` variables — colores hardcodeados (`#060d1a`, `#e8f0fe`)
- Ignora hooks como `useMacro`, `useMultiTicker`
- Tiene su propio fetch inline para BTC, F&G y CoinGecko

Esto fue probablemente intencional (migración gradual) pero duplica lógica de fetching.

---

## 📊 Tabla de Importaciones Activas

### Páginas
| Archivo | Hooks importados | Engine importado |
|---|---|---|
| `AgentsPage.jsx` | Ninguno | Ninguno |
| `MacroPage.jsx` | Ninguno | Ninguno |
| `MetodoPage.jsx` | Ninguno | `calcMA`, `calcRSI` (inline) + `calcScoreFromIndicators` (inline) |
| `RangesPage.jsx` | `useBinanceMulti`, `useMultiTicker` | `computeScore`, `calcBB`, `calcATR` desde `indicators.js` |
| `TradesPage.jsx` | `useBinance`, `useSignals`, `useMultiTicker` | `computeScore` desde `indicators.js` |

### Hooks
| Archivo | Engine importado |
|---|---|
| `useScore.js` | `computeScore` desde `indicators.js` |
| `useSignals.js` | Ninguno |

### Componentes
| Archivo | Engine importado |
|---|---|
| `RangeChart.jsx` | `calcBB`, `calcATR` desde `indicators.js` |
| `CandleChart.jsx` | `calcMA`, `calcBB` desde `indicators.js` |

### 🚨 Conclusión de imports
- **`scoreEngine.js`** no es importado por NADIE en el frontend.
- **`indicators.js`** es el motor realmente usado en runtime.

---

## ✅ Dependencias package.json — Verificación

| Dependencia | Usada en código? | Notas |
|---|---|---|
| `chart.js` ^4.5.1 | ✅ Sí — TradesPage, MetodoPage | |
| `lucide-react` ^1.17.0 | ✅ Sí — TopBar.jsx | |
| `react` ^19.2.6 | ✅ Sí | |
| `react-dom` ^19.2.6 | ✅ Sí | |
| `react-router-dom` ^7.16.0 | ✅ Sí — AppRouter.jsx, TopBar.jsx | |
| `recharts` ^3.8.1 | ❌ **NO** — Cero imports | Eliminar |
| `terser` ^5.48.0 | Dev — usada por Vite build | ✅ Opcional |

---

## 📋 Checklist de Acciones Recomendadas

### Prioridad Alta (bugs/rotura)
- [ ] Eliminar `App.jsx` (router muerto)  
- [ ] Unificar `computeScore` en `scoreEngine.js`, que todos los imports apunten allí  
- [ ] Eliminar funciones duplicadas de `indicators.js` y que importe desde `scoreEngine.js` (o viceversa)

### Prioridad Media (mantenibilidad)
- [ ] Eliminar archivos `.bak`  
- [ ] Eliminar `MetricCard.jsx` / `CandleChart.jsx` si no se van a usar  
- [ ] Eliminar `recharts` de package.json  
- [ ] Corregir `lastActions.reverse()` mutante en AgentsPage  
- [ ] Revisar sincronización `selectedAsset` vs `activeAsset` en MetodoPage

### Prioridad Baja (limpieza)
- [ ] Eliminar directorio `services/` vacío  
- [ ] Unificar scrollbar CSS en un solo archivo  
- [ ] Revisar `_routes.json` y `metodo.html` en build script  
- [ ] Homogeneizar MacroPage con el sistema de diseño del resto

---

## Archivos Auditados (18 JSX + 8 JS + 4 CSS + 2 HTML + 2 JSON)

```
frontend/
├── src/
│   ├── App.jsx                    ← DEAD CODE (router duplicado)
│   ├── AppRouter.jsx              ← Router VIVO
│   ├── main.jsx                   ← Entry point
│   ├── sono-score-config.json     ← No usado por frontend
│   ├── engine/
│   │   ├── indicators.js          ← VIVO (importado por 5 archivos)
│   │   └── scoreEngine.js         ← MUERTO (0 imports en frontend)
│   ├── hooks/
│   │   ├── useBinance.js          ← VIVO (importado por TradesPage)
│   │   ├── useBinance.js.bak      ← BASURA
│   │   ├── useBinanceMulti.js     ← VIVO (RangesPage)
│   │   ├── useMacro.js            ← VIVO (no importado por MacroPage)
│   │   ├── useMultiTicker.js      ← VIVO (RangesPage, TradesPage)
│   │   ├── useScore.js            ← VIVO (no importado por nadie)
│   │   ├── useSignals.js          ← VIVO (TradesPage)
│   │   └── useWebSocket.js        ← VIVO (useBinance)
│   ├── pages/
│   │   ├── AgentsPage.jsx
│   │   ├── MacroPage.jsx          ← Estilo incoherente (todo inline)
│   │   ├── MetodoPage.jsx
│   │   ├── MetodoPage.jsx.bak     ← BASURA
│   │   ├── RangesPage.jsx
│   │   ├── TradesPage.jsx
│   │   ├── TradesPage.jsx.bak     ← BASURA
│   │   └── pages.css
│   ├── components/
│   │   ├── CandleChart.jsx        ← NO USADO
│   │   ├── MetricCard.jsx         ← NO USADO
│   │   ├── MetricCard.css         ← NO USADO
│   │   ├── RangeChart.jsx         ← VIVO (RangesPage)
│   │   └── TopBar.jsx/TopBar.css  ← VIVO
│   ├── styles/
│   │   └── theme.css
│   └── services/                  ← VACÍO
├── package.json                   ← recharts no usado
└── vite.config.js
```
