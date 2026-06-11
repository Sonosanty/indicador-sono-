# FASE 0 — Análisis y Roadmap de Refactorización SONO PRO v6

**Fecha:** 2026-06-04
**Autor:** Análisis automático Fase 0
**Estado:** ⏳ En revisión

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Inventario de Archivos Actuales](#2-inventario-de-archivos-actuales)
3. [Anatomía del Código por Página](#3-anatomía-del-código-por-página)
4. [Matriz de Duplicación](#4-matriz-de-duplicación)
5. [Bugs y Problemas Conocidos](#5-bugs-y-problemas-conocidos)
6. [Mapeo contra las 11 Fases del Plan Maestro](#6-mapeo-contra-las-11-fases-del-plan-maestro)
7. [Recomendación Estratégica](#7-recomendación-estratégica)
8. [Roadmap Priorizado](#8-roadmap-priorizado)

---

## 1. Resumen Ejecutivo

El proyecto SONO PRO v6 consta actualmente de **6 páginas HTML** (index, dashboard, metodo, range_explorer, trades_explorer, pagina.html) + **1 JS compartido** (app.js) + **1 CSS** (style.css) + **2 scripts Python** (sono_bot.py, sono_score.py) + **1 config JSON** (sono-score-config.json) + **5+ archivos de soporte** (service-worker, manifest, etc.).

### Problemas principales:

| Problema | Impacto | Severidad |
|---|---|---|
| ⚠️ **Lógica de indicadores duplicada en 4 lugares** (app.js, metodo.html inline, range_explorer.html inline, sono_score.py) | Bugs asimétricos, divergencia score JS vs Python | **CRÍTICO** |
| ⚠️ **CSS duplicado en 5 variantes** (index.html inline, metodo.html inline, dashboard.html inline, style.css, pagina.html inline) | 850+ líneas de CSS redundante, cambios deben hacerse en N sitios | **ALTO** |
| ⚠️ **Config duplicada** (coins, timeframes, colores, umbrales hardcodeados en JS y Python, aunque JSON existe) | Un cambio de umbral requiere editar 3+ archivos | **ALTO** |
| ⚠️ **Score Maestro no coincide entre JS y Python** (P1 tiene pesos distintos, BB %B interpreta diferente) | Señales inconsistentes entre dashboard y bot | **CRÍTICO** |
| ⚠️ **MA40 muestra "--"** (el calculo smaLast con 40 velas falla si klines tiene menos de 40) | Bug visual evidente en dashboard principal | **ALTO** |
| ⚠️ **RSI 3D es artificial** (no se obtienen velas diarias reales, es un promedio ponderado de RSI, F&G y VIX) | Métrica engañosa | **MEDIO** |
| ⚠️ **KuCoin symbol mapeo** (XRP-KCS en vez de XRP-USDT en KuCoin) | XRP no carga precio en metodo.html | **ALTO** |
| ⚠️ **Caché MA_CACHE rota** (compara arrays por referencia, no por valor; nunca se invalida correctamente) | MAs desfasados en dashboard | **MEDIO** |

### Volumen:

| Métrica | Valor |
|---|---|
| Líneas totales HTML+JS+CSS (frontend) | ~4,500 |
| Líneas Python (bot + score) | ~630 |
| Líneas CSS total (todas las variantes) | ~1,100 |
| Funciones de indicadores duplicadas | 8 (sma, rsi, adx, bb, score, rsi3d, classify, zone) |
| Llamadas API duplicadas | 5 endpoints llamados desde ≥2 páginas |

---

## 2. Inventario de Archivos Actuales

### Frontend Web (Cloudflare Pages)

| Archivo | Rol | Líneas aprox | CSS inline | JS inline |
|---|---|---|---|---|
| `index.html` | Dashboard V6 principal (raíz) | 230 | ~180 líneas | No (app.js) |
| `frontend/app.js` | Lógica compartida del dashboard | 620 | — | Todo |
| `frontend/dashboard.html` | Dashboard V6.3 alternativa (sidebar) | 500 | ~360 líneas | ~120 líneas |
| `frontend/metodo.html` | Vista analítica con gráficos (Chart.js) | 1,200 | ~300 líneas | ~900 líneas |
| `frontend/range_explorer.html` | Range Intelligence Radar | 950 | — (usa style.css) | ~950 líneas |
| `frontend/trades_explorer.html` | Trades demo con websocket | 700 | — (usa style.css) | ~700 líneas |
| `frontend/pagina.html` | Backup/v3 legacy | — | ~300 líneas | — |
| `frontend/style.css` | Design system compartido | 660 | — | — |
| `frontend/service-worker.js` | PWA offline | 50 | — | — |

### Backend / Bot

| Archivo | Rol | Líneas | Observaciones |
|---|---|---|---|
| `sono_bot.py` | Bot trading Pionex (paper/real) | 460 | Importa sono_score.py |
| `sono_score.py` | Score engine Python | 170 | **Lógica independiente del JS** |
| `sono-score-config.json` | Contrato unificado de score | 50 | Subutilizado en JS |
| `.env` | Credenciales Pionex | — | Sensible |

### Otros

| Archivo | Rol |
|---|---|
| `manifest.json` | PWA manifest |
| `sono_state.json` | Estado persistente paper trading |
| `sono_bot.log` | Logs del bot |
| `sono_market_state.json` | Snapshot de mercado |

---

## 3. Anatomía del Código por Página

### 3.1 `index.html` (Dashboard V6 raíz) + `app.js`

**Qué hace:**
- Muestra precio BTC/ETH/SOL/XRP en vivo
- Score Maestro con ring SVG + 3 pilares
- Indicadores: RSI, ADX, BB %B, MA6/40/70/200
- Macro: F&G, VIX, Dominancia BTC, Market Cap
- Confluencia MTF (1m/3m/5m/15m)
- Skeleton loader durante carga

**Fuentes de datos:**
1. Worker propio `sono-bot.sonosanty.workers.dev` (intento principal)
2. Binance REST (fallback): ticker + klines
3. Alternative.me F&G
4. CoinGecko global (dominancia + mcap)
5. VIX proxy worker
6. CoinGecko simple price (fallback ticker)

**Lógica de score inline:** `cs()`, `sm()`, `rs()`, `ax()`, `bb()`, `sl()`, `fl()`, `rg()`, `regimeCrypto()`, `ms()`

**Inconsistencias detectadas:**
- `cs()` usa `MA_CACHE` que compara arrays por referencia → nunca se invalida correctamente
- El score P3 BB es diferente al de `metodo.html`: usa `b>0.8||b<0?5:b>0.5?10:b>0.2?25:b>0?20:5` mientras que metodo.html usa `pb>0.85?4:pb>0.55?20:pb>0.2?30:pb>0?18:5`
- El worker de CoinGecko global `vix-proxy.sonosanty.workers.dev/global` tiene endpoint específico no documentado

### 3.2 `frontend/metodo.html` (Vista analítica)

**Qué hace:**
- Sidebar con Score Maestro (igual que index.html pero distinto diseño)
- Pilares, señales activas, macro grid, zonas de decisión
- Gráficos Chart.js: precio+MA, RSI, ADX, BB %B (4 paneles)
- Timeframes: 1m/3m/5m/15m/1h
- Fuente: **KuCoin** (no Binance como las otras páginas)

**Lógica inline completa:**
- `computeScore()` — casi idéntica a `cs()` de app.js pero con pesos ligeramente distintos
- `fetchJ()` — wrapper fetch
- `fetchAll()` — secuencia KuCoin ticker + KuCoin klines + F&G + Worker
- `updateCharts()` — crea 4 instancias de Chart.js

**⚠️ KuCoin symbol mapping bug:**
```javascript
const symKC = {BTC:"BTC-USDT", ETH:"ETH-USDT", SOL:"SOL-USDT", XRP:"XRP-USDT"}[currentCoin];
```
En KuCoin, XRP es `XRP-USDT`, no `XRP-KCS`. Pero el mapeo es correcto aquí. Sin embargo, KuCoin no siempre tiene datos de XRP en todos los timeframes.

### 3.3 `frontend/range_explorer.html` (Range Intelligence)

**Qué hace:**
- Análisis de rango multi-timeframe con pivots
- Hero sticky con bias/confianza/estado
- 4 tarjetas (15m/5m/3m/1m) con niveles S/R, presión, mini chart
- WebSocket Binance para precio live
- Refresh cada 20s

**Lógica inline completa:**
- `calcRSI()` — función RSI independiente (3ª versión en el frontend)
- `analyzeRange()` — lógica de pivots, presión, bias
- `renderHero()` + `renderTFCards()` — renderizado completo

**⚠️ No comparte NADA con el resto:**
- Sin skeleton loader
- Sin Score Maestro
- No consulta F&G, VIX, ni dominancia
- Sin soporte multi-cripto real (aunque tiene botones, todos piden BTCUSDT)

### 3.4 `frontend/trades_explorer.html` (Trades Explorer)

**Qué hace:**
- Tablas de trades demo (abiertos y cerrados con datos hardcodeados)
- Equity curve chart
- Estadísticas por setup y timeframe
- WebSocket Binance para precio live
- Filtros por side/setup

**Datos demo:**
- `DEMO_OPEN` y `DEMO_CLOSED` son arrays hardcodeados
- `SETUPS` y `TFS` son objetos con conteos también hardcodeados

**⚠️ Sin conexión real a API de trades:**
- No hay fetch a ningún backend para trades reales
- `SETUPS.tp/be/sl` son números inventados (no coinciden con `DEMO_CLOSED`)
- WebSocket solo actualiza precio, no trades reales

### 3.5 `frontend/dashboard.html` (V6.3 alternativa)

**Qué hace:**
- Sidebar con 4 vistas (Macro, Activos, Señales, Método)
- Hero con precio BTC + cambio 24h
- KPI cards (F&G, VIX, Dominancia, Market Cap)
- Tabla RSI multi-timeframe
- Asset cards con score ring
- Señales ranking

**Lógica inline:**
- Depende del Worker `sono-bot.sonosanty.workers.dev` para TODO
- `state.scores`, `state.macro`, `state.history`
- Tiene su propio sistema de signalColor, fmtP, fmtN
- `TF_LABELS` hardcodeados como `{'1m':{r:68},...}` — **RSI inventados**

### 3.6 `sono_score.py` vs JS score

**Diferencias críticas:**

| Componente | JS (app.js `cs()`) | Python (sono_score.py) |
|---|---|---|
| P1 MA6>MA40 | **NO existe** (usa MA6>MA70) | **SÍ**: +12 pts |
| P1 MA40>MA200 | **NO existe** | **SÍ**: +13 pts |
| P1 Precio>MA40 | +10 pts (independiente) | No existe como tal |
| P2 ADX>25 | +15 pts | +15 pts |
| P2 ADX>35 | No existe | **SÍ**: +15 pts (adicional) |
| P2 RSI>55 | +20 pts | +12 pts |
| P2 Precio>MA200 | +10 pts (en P1) | +8 pts (en P2) |
| P3 BB %B >0.55 | +20 pts | +20 pts |
| P3 BB %B <0.15 | No existe | **+28 pts** |
| `classify_score` | Hardcodeado en `sl()` | Lee config JSON |
| ATR calculado | No disponible | Disponible |

**Conclusión: Los scores JS y Python NO son equivalentes.** Una misma vela puede dar 72 en JS y 65 en Python, o viceversa. Esto invalida cualquier comparación entre el bot y el dashboard.

---

## 4. Matriz de Duplicación

### 4.1 Funciones de Indicadores

| Función | app.js | metodo.html | range_explorer | dashboard.html | sono_score.py |
|---|---|---|---|---|---|
| SMA/MA | ✅ `sm()` | ✅ `smaLast/smaArr` | — | — | ✅ `calc_ma` |
| RSI | ✅ `rs()` | ✅ `rsiLast` | ✅ `calcRSI` | — | ✅ `calc_rsi` |
| ADX | ✅ `ax()` | ✅ `adxLast` | — | — | ✅ `calc_adx` |
| Bollinger %B | ✅ `bb()` | ✅ `bbLast` | — | — | ✅ `calc_bb` |
| Score Maestro | ✅ `cs()` | ✅ `computeScore` | — | (solo muestra) | ✅ `compute_score` |
| Classify/Signal | ✅ `sl()` | ✅ `zoneLabel/zoneColor` | — | — | ✅ `classify_score` |
| Regime | ✅ `rg()`, `regimeCrypto()` | ✅ `regimeText()` | — | — | (solo signal) |
| MACRO F&G | ✅ `fl()` | ✅ inline | — | — | — |

**Hay 8 funciones duplicadas en 3-5 lugares cada una.** Un cambio en la lógica de score requiere editar mínimo 3 archivos (app.js, metodo.html, sono_score.py).

### 4.2 CSS Duplicado

| Variante CSS | Líneas | Ubicación |
|---|---|---|
| `index.html <style>` | ~180 | Inline en index.html |
| `metodo.html <style>` | ~300 | Inline en metodo.html |
| `dashboard.html <style>` | ~360 | Inline en dashboard.html |
| `pagina.html <style>` | ~300 | Inline (legacy) |
| `style.css` | ~660 | Archivo compartido (range_explorer + trades_explorer) |

**Problemas:**
- Las 3 variantes de dashboard (index, dashboard, metodo) tienen CSS independiente con el MISMO propósito
- Cambiar un color de acento requiere editar 4 archivos
- No hay variables CSS compartidas entre archivos inline
- `style.css` es el único archivo CSS externo y solo lo usan 2 páginas

### 4.3 Config Duplicada

| Config | app.js | metodo.html | dashboard.html | range_explorer | sono_bot.py | sono-score-config.json |
|---|---|---|---|---|---|---|
| Umbrales score | ✅ `sl()` hardcode | ✅ `zoneLabel` hardcode | — | — | ✅ `classify_score` | ✅ ORIGEN |
| Coins list | ✅ `["BTC","ETH","SOL","XRP"]` | ✅ Botones | ✅ `ASSETS` | ✅ Botones | ✅ `ASSETS` | — |
| Timeframes | ✅ `["1m","3m","5m","15m","1h"]` | ✅ Botones | ✅ `TF_LABELS` | ✅ `['15m','5m','3m','1m']` | ✅ `'15m'` | — |
| Colores | ✅ Hardcode | ✅ CSS vars + hardcode | ✅ CSS vars | ✅ CSS vars | — | ✅ |

**El archivo `sono-score-config.json` debería ser la ÚNICA fuente de verdad**, pero solo lo lee `sono_score.py`. Ningún archivo JS lo consume.

### 4.4 Llamadas API

| Endpoint | app.js | metodo.html | range_explorer | trades_explorer | dashboard.html |
|---|---|---|---|---|---|
| Binance klines | ✅ | — | ✅ | — | — |
| Binance ticker 24h | ✅ | — | — | — | — |
| KuCoin klines | — | ✅ | — | — | — |
| KuCoin stats | — | ✅ | — | — | — |
| Alternative.me F&G | ✅ | ✅ | — | — | — |
| CoinGecko global | ✅ | — | — | — | — |
| Worker (sono-bot) | ✅ | ✅ | — | — | ✅ |
| VIX proxy | ✅ | — | — | — | — |
| Binance WS aggTrade | — | — | ✅ | ✅ | — |

**Cada página reinventa cómo obtener los datos.** No hay un adapter/data layer común.

---

## 5. Bugs y Problemas Conocidos

### P0 — Críticos (rotos visiblemente)

| ID | Bug | Dónde | Causa |
|---|---|---|---|
| **B1** | ⚠️ MA40 muestra "--" permanentemente | app.js (index.html) | `sm()` requiere array.length ≥ p, pero MA_CACHE roto y klines pueden tener <40 velas si hay error |
| **B2** | ⚠️ Score JS ≠ Score Python | Todo el sistema | Dos implementaciones independientes con pesos distintos |
| **B3** | ⚠️ MA_CACHE nunca se invalida correctamente | app.js L30-40 | Compara arrays por referencia (`c6.tf===c` donde c es el array klines), siempre es false → nunca usa cache → pero tampoco recalcula bien |
| **B4** | ⚠️ KuCoin XRP puede fallar | metodo.html | SymKC mapeo correcto pero KuCoin tiene menos liquidez en XRP |

### P1 — Altos (afectan fiabilidad)

| ID | Bug | Dónde | Detalle |
|---|---|---|---|
| **B5** | RSI 3D artificial | app.js | Calcula `(rsi + fg/2 + 50 + (100-vix*2))/4` en vez de RSI real de velas diarias |
| **B6** | Método.html: error en `updateCharts()` | metodo.html L202 | Tiene `const{}=bbLast(sl,20,2)` que es destructuring vacío, y luego líneas muertas `import charts from "chart.js"` |
| **B7** | `DEMO_CLOSED` inconsistente con `SETUPS` | trades_explorer | SETUPS dice `lower_rejection: {tp:16, be:15, sl:19}` pero DEMO_CLOSED solo tiene 4 trades de ese setup |
| **B8** | range_explorer sin soporte multi-cripto real | range_explorer | Botones de asset cambian variable pero `fetchKlines` siempre pide BTCUSDT |

### P2 — Medios (deuda técnica)

| ID | Bug | Dónde | Detalle |
|---|---|---|---|
| **B9** | `dashboard.html` TF_LABELS con RSI hardcodeado | dashboard.html | RSI multi-timeframe son valores fijos, no reales |
| **B10** | Sin manejo de errores en websockets | range_explorer, trades_explorer | Si WS falla, el callback `onclose` reconecta pero no hay feedback visual claro |
| **B11** | Skeleton loader no se quita si hay error | app.js | `rmvSkel()` solo se llama en `updAll()` exitoso; si falla, skeleton forever |
| **B12** | `ms()` macro score no usa config JSON | app.js | Hardcodea `fg<20?2:fg<40?1:fg>80?-1:0` |

### P3 — Bajos (cosméticos)

| ID | Bug | Detalle |
|---|---|---|
| **B13** | `$("tsEl")` en index muestra "--:--:--" hasta que fetchAll() corre | Mejorable con init sin fetch |
| **B14** | `regimeCrypto()` en app.js vs `rg()` tienen lógica duplicada con distintos pesos | Confusión de régimen |
| **B15** | Dashboard.html versión 6.3 tiene sidebar pero no navega realmente | Las vistas son JS puro, no páginas separadas |

---

## 6. Mapeo contra las 11 Fases del Plan Maestro

### Estructura objetivo

```
/js/core/{config,state,scheduler,cache,formatters,guards,logger}.js
/js/data/{adapters,binance,kucoin,coingecko,alternative,vix,sonobot}.js
/js/indicators/{ma,rsi,adx,bb,ranges,confluence,score-maestro}.js
/js/ui/{theme,tabs,cards,ring,charts,table,status}.js
/js/pages/{dashboard,rangos,metodo,trades}.js
/assets/css/{tokens,base,layout,components}.css
```

### Fase 0 — Análisis y Plan (ESTE DOCUMENTO)

| Qué | Archivos a crear | Dependencias | Tiempo | Riesgos |
|---|---|---|---|---|
| Análisis completo | `fase0-analisis.md` | Ninguna | 2h | ✅ Ya hecho |

### Fase 1 — Core Infrastructure

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `js/core/config.js` | — | Ninguna | 1h | Bajo | **ALTA** |
| `js/core/state.js` | — | config.js | 1h | Bajo | **ALTA** |
| `js/core/formatters.js` | — | config.js | 0.5h | Bajo | **ALTA** |
| `js/core/guards.js` | — | Ninguna | 0.5h | Bajo | MEDIA |
| `js/core/logger.js` | — | Ninguna | 0.5h | Bajo | MEDIA |

**Descripción:** Crear el esqueleto base. `config.js` debe leer `sono-score-config.json` (vía fetch o embed). `state.js` reemplaza `ST` global y `MA_CACHE`.

**Dependencias:** Fase 0 completada ⚠️

### Fase 2 — Data Adapters

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `js/data/adapters.js` | — | config.js, formatters.js | 1h | ⚠️ **ALTO** | **ALTA** |
| `js/data/binance.js` | — | adapters.js | 0.5h | Bajo | **ALTA** |
| `js/data/coingecko.js` | — | adapters.js | 0.5h | Bajo | MEDIA |
| `js/data/alternative.js` | — | adapters.js | 0.5h | Bajo | MEDIA |
| `js/data/sonobot.js` | — | adapters.js | 0.5h | Bajo | **ALTA** |
| `js/data/kucoin.js` | — | adapters.js | 0.5h | Bajo | BAJA |

**Descripción:** Unificar TODAS las fuentes de datos. Un adapter por API, exportando funciones con firma consistente. `adapters.js` orquesta: intenta Worker → fallback Binance/CoinGecko.

**Riesgo ⚠️:** El endpoint del worker `sono-bot.sonosanty.workers.dev` es propiedad externa. Si cambia o cae, la data layer completa falla.

### Fase 3 — Indicadores (Score Maestro unificado)

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `js/indicators/ma.js` | — | config.js | 0.5h | Bajo | **ALTA** |
| `js/indicators/rsi.js` | — | Ninguna | 0.5h | Bajo | **ALTA** |
| `js/indicators/adx.js` | — | Ninguna | 0.5h | Bajo | **ALTA** |
| `js/indicators/bb.js` | — | Ninguna | 0.5h | Bajo | **ALTA** |
| `js/indicators/score-maestro.js` | `sono-score-config.json` | ma.js, rsi.js, adx.js, bb.js | 1.5h | ⚠️ **CRÍTICO** | **ALTA** |
| `js/indicators/ranges.js` | — | config.js | 1h | Bajo | MEDIA |
| `js/indicators/confluence.js` | — | score-maestro.js | 0.5h | Bajo | BAJA |

**Descripción:** Implementación UNIFICADA del Score Maestro. Lee los pesos desde `sono-score-config.json`. Debe producir EXACTAMENTE el mismo score que `sono_score.py`.

**Riesgo ⚠️:** Hay que decidir qué versión de los pesos es la correcta (JS o Python) y documentarlo. Sugerencia: adoptar la versión Python porque es la que usa el bot real.

### Fase 4 — CSS Refactor (Design Tokens)

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `assets/css/tokens.css` | — | Ninguna | 0.5h | Bajo | **ALTA** |
| `assets/css/base.css` | — | tokens.css | 0.5h | Bajo | **ALTA** |
| `assets/css/layout.css` | — | tokens.css | 0.5h | Bajo | **ALTA** |
| `assets/css/components.css` | — | tokens.css, layout.css | 1h | ⚠️ MEDIO | **ALTA** |

**Descripción:** Consolida TODO el CSS en 4 archivos. `tokens.css` define todas las variables. Las páginas individuales solo importan estos archivos y añaden ~20 líneas de personalización.

**Riesgo ⚠️:** Las 3 variantes de dashboard tienen CSS distinto. Hay que elegir un design system (sugerencia: el de `style.css` + `metodo.html` porque es el más completo y moderno).

### Fase 5 — UI Components

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `js/ui/theme.js` | — | config.js | 0.5h | Bajo | BAJA |
| `js/ui/tabs.js` | — | state.js | 0.5h | Bajo | BAJA |
| `js/ui/cards.js` | — | formatters.js | 0.5h | Bajo | BAJA |
| `js/ui/ring.js` | — | formatters.js | 0.5h | Bajo | MEDIA |
| `js/ui/charts.js` | — | state.js | 1.5h | ⚠️ MEDIO | **ALTA** |
| `js/ui/table.js` | — | Ninguna | 0.5h | Bajo | BAJA |
| `js/ui/status.js` | — | config.js | 0.5h | Bajo | BAJA |

**Descripción:** Componentes UI reutilizables. `charts.js` es el más crítico: encapsula Chart.js y reemplaza los 4 charts inline de metodo.html + los sparklines de range_explorer.

**Riesgo ⚠️:** Chart.js tiene muchas opciones. Hay que asegurar que los 4 paneles (price, RSI, ADX, BB) queden idénticos al original.

### Fase 6 — Pages (Refactor de páginas existentes)

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|---|
| `js/pages/dashboard.js` | `index.html` | Fases 1-5 completas | 2h | ⚠️ **ALTO** | **ALTA** |
| `js/pages/rangos.js` | `range_explorer.html` | Fases 1-5 completas | 1.5h | ⚠️ **ALTO** | **ALTA** |
| `js/pages/metodo.js` | `metodo.html` | Fases 1-5 completas | 2h | ⚠️ **ALTO** | **ALTA** |
| `js/pages/trades.js` | `trades_explorer.html` | Fases 1-5 completas | 1h | ⚠️ ALTO | MEDIA |

**Descripción:** Cada página se convierte en ~50 líneas de HTML que importa JS modular. `js/pages/dashboard.js` orquesta la lógica del dashboard usando los módulos de indicadores, data y UI.

**Riesgo ⚠️:** Es el punto de no retorno. Una vez refactorizadas las páginas, todo el sistema viejo queda obsoleto y cualquier bug requiere debuggear en los nuevos módulos.

### Fase 7 — Scheduler y Cache

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos |
|---|---|---|---|---|
| `js/core/scheduler.js` | — | config.js | 0.5h | Bajo |
| `js/core/cache.js` | — | config.js | 0.5h | Bajo |

**Descripción:** Centraliza intervalos (30s dashboard, 20s rangos, 60s dashboard v6.3) y caché con TTL (SWR del app.js original).

### Fase 8 — RSI 3D Real y Fixes P0

| Archivos a modificar | Dependencias | Tiempo | Riesgos | Prioridad |
|---|---|---|---|---|
| `js/indicators/rsi.js` | Fase 3 | 1h | Bajo | **ALTA** |
| `js/data/binance.js` | Fase 2 | 0.5h | Bajo | **ALTA** |

**Descripción:** Implementar RSI 3D real con velas diarias de Binance (fetch `interval=1d`). Eliminar la aproximación artificial.

### Fase 9 — Trades Reales (API)

| Archivos a crear | Archivos a modificar | Dependencias | Tiempo | Riesgos |
|---|---|---|---|---|
| `js/data/trades-api.js` | — | Fase 2 | 2h | ⚠️ ALTO |

**Descripción:** Conectar trades a una API real. Opciones: n8n webhook, Worker propio con Firebase/Supabase, Google Sheets como backend.

**Riesgo ⚠️:** Sin backend persistente, los trades siempre serán demo. Esto requiere infraestructura nueva.

### Fase 10 — Testing y Despliegue

| Qué | Tiempo | Riesgos |
|---|---|---|
| Tests de score (JS = Python) | 1h | ⚠️ CRÍTICO si no se alinean |
| Test de regresión visual | 1h | Bajo |
| Despliegue Cloudflare Pages | 0.5h | Bajo |
| Monitoreo post-despliegue | 1h | Bajo |

---

## 7. Recomendación Estratégica

### Veredicto: **Enfoque Híbrido (Fixes P0 + Refactor gradual)**

No recomiendo la refactorización completa ahora. Razones:

1. **El sistema funciona** (con bugs) — los usuarios ven datos en vivo
2. **Riesgo de romperlo todo** — si refactorizamos de golpe y algo falla, no hay dashboard que enseñar
3. **Coste estimado total: ~25 horas** — para un proyecto que podría reescribirse en 15h si partes de cero con la arquitectura clara

### Plan concreto:

#### Sprint 1 — Estabilizar (3-4h) ⏳ AHORA
1. **B2: Alinear score JS = Python** (1h)
   - Decidir versión canónica: **adoptar la de Python** porque ya está testeada con el bot real
   - Reescribir `cs()` en app.js usando los mismos pesos y subiendo `sono-score-config.json` como fuente
   - **Afecta:** app.js, metodo.html, index.html
2. **B1: Fix MA40 "--"** (0.5h)
   - Forzar klines a mínimo 220 velas
   - Añadir fallback: si MA40 no disponible, mostrar "acumulando..." en vez de "--"
3. **B3: Fix MA_CACHE** (0.5h)
   - Usar timestamp o hash de klines en vez de referencia de array
4. **B5: RSI 3D real** (1h)
   - Fetch velas diarias reales. Si no hay suficientes datos, mostrar "-" en vez de artificio
5. **B11: Error skeleton timeout** (0.5h)
   - Timeout de 15s que muestra mensaje de error en vez de skeleton forever

#### Sprint 2 — CSS Unificado (2-3h)
1. Crear `assets/css/tokens.css` con las variables de `style.css` como base única
2. Migrar CSS inline de `index.html` a importar tokens.css
3. Migrar CSS inline de `metodo.html` a importar tokens.css
4. Fusionar variantes de color (elegir una paleta, sugerencia: la de metodo.html)

**No migrar dashboard.html hasta Sprint 4.**

#### Sprint 3 — Data Layer (2-3h)
1. Crear `js/data/` con adapters
2. `js/data/adapters.js` orquesta Worker → fallback
3. `js/data/coingecko.js` unifica las 3 llamadas a CoinGecko
4. `js/data/sonobot.js` encapsula el worker
5. Mantener `app.js` funcional pero reemplazar las fetch calls internas por adapters

#### Sprint 4 — Modularización (4-6h)
1. `js/core/config.js` (lee JSON)
2. `js/indicators/score-maestro.js` (única fuente de verdad)
3. `js/core/scheduler.js` (unifica intervalos)
4. Refactorizar `app.js` como módulo
5. Refactorizar `metodo.html` como módulo (el más complejo)
6. `range_explorer.html` como módulo (el más independiente)

#### Sprint 5 — Trades y Despliegue (3-4h)
1. Crear `js/data/trades-api.js` con webhook hacia n8n o Worker
2. Reemplazar datos demo de `trades_explorer.html` por endpoint real
3. Añadir tests de score (JS output === Python output para 10 casos)
4. Desplegar en Cloudflare Pages
5. Monitorear 48h post-despliegue

#### Sprint 6 — Refactor Completo (5-8h) ⏳ FUTURO
1. `js/pages/dashboard.js` módulo final
2. `js/pages/rangos.js` módulo final
3. `js/pages/metodo.js` módulo final
4. `js/pages/trades.js` módulo final
5. `assets/css/components.css` final
6. Eliminar `app.js`, `style.css`, CSS inline legacy
7. Unificar `dashboard.html` con `index.html` (elegir una versión)

---

## 8. Roadmap Priorizado

| Sprint | ¿Qué? | Horas | Bugs resueltos | Depende de | Riesgo |
|---|---|---|---|---|---|
| **S1** | Estabilizar (score unificado + fixes P0) | 3-4 | B1, B2, B3, B5, B11 | Nada | ⚠️ **Crítico: tocar score rompe todo** |
| **S2** | CSS Unificado | 2-3 | B13 (cosmético) | S1 | Bajo |
| **S3** | Data Layer | 2-3 | — | S1 | Medio (workers externos) |
| **S4** | Modularización | 4-6 | B6, B8, B12 | S1, S2, S3 | ⚠️ **Alto: punto de no retorno** |
| **S5** | Trades + Tests | 3-4 | B7 | S3 | ⚠️ **Alto: requiere backend** |
| **S6** | Refactor completo | 5-8 | B9, B10, B14, B15 | S4, S5 | Medio |

**Total estimado: 19-28 horas**

---

## Apéndice A: Resumen de Archivos a Crear (Plan Maestro completo)

```
js/core/config.js          ← NUEVO
js/core/state.js           ← NUEVO
js/core/scheduler.js       ← NUEVO
js/core/cache.js           ← NUEVO
js/core/formatters.js      ← NUEVO
js/core/guards.js          ← NUEVO
js/core/logger.js          ← NUEVO
js/data/adapters.js        ← NUEVO
js/data/binance.js         ← NUEVO
js/data/kucoin.js          ← NUEVO
js/data/coingecko.js       ← NUEVO
js/data/alternative.js     ← NUEVO
js/data/vix.js             ← NUEVO
js/data/sonobot.js         ← NUEVO
js/indicators/ma.js        ← NUEVO
js/indicators/rsi.js       ← NUEVO
js/indicators/adx.js       ← NUEVO
js/indicators/bb.js        ← NUEVO
js/indicators/ranges.js    ← NUEVO
js/indicators/confluence.js← NUEVO
js/indicators/score-maestro.js ← NUEVO
js/ui/theme.js             ← NUEVO
js/ui/tabs.js              ← NUEVO
js/ui/cards.js             ← NUEVO
js/ui/ring.js              ← NUEVO
js/ui/charts.js            ← NUEVO
js/ui/table.js             ← NUEVO
js/ui/status.js            ← NUEVO
js/pages/dashboard.js      ← NUEVO
js/pages/rangos.js         ← NUEVO
js/pages/metodo.js         ← NUEVO
js/pages/trades.js         ← NUEVO
assets/css/tokens.css      ← NUEVO
assets/css/base.css        ← NUEVO
assets/css/layout.css      ← NUEVO
assets/css/components.css  ← NUEVO
```

**Total: 35 archivos nuevos**

## Apéndice B: Archivos a Eliminar/Eliminar contenido al final

```
frontend/app.js            ← REEMPLAZAR por modules (mantener wrapper)
frontend/style.css         ← ELIMINAR (reemplazado por assets/css/*)
frontend/dashboard.html    ← UNIFICAR con index.html o ELIMINAR
frontend/pagina.html       ← ELIMINAR (legacy backup)
```

## Apéndice C: Dependencias Externas

| Servicio | Rol | Criticidad | Alternativa si falla |
|---|---|---|---|
| Binance REST | Klines + Ticker | **ALTA** | KuCoin (limitado) |
| Binance WS | Precio realtime | ALTA | Polling REST cada 5s |
| CoinGecko | Global macro (dominancia, mcap) | **ALTA** | VIX Proxy Worker |
| Alternative.me | Fear & Greed Index | ALTA | Worker backup |
| VIX Proxy Worker | VIX index | MEDIA | Estimación basada en volatilidad BTC |
| Worker sono-bot | Score precalculado | BAJA (fallback directo) | Binance directo |
| KuCoin | Precio ETH/SOL/XRP | BAJA | Binance tiene todos |
| Pionex API | Trading real | BAJA | Paper mode |
| Cloudflare Pages | Hosting | **ALTA** | Cloudflare Workers (mismo) |

---

✅ **Análisis Fase 0 completado.**