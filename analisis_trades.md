# Análisis de `trades_explorer.php` — Mifuturapp

## 📄 Descripción general

Página web de auditoría en tiempo real para señales de trading de BTC/USDT.
Conecta por **WebSocket a Binance aggTrade** para precio en vivo y consulta un endpoint REST cada 5s para refrescar los trades abiertos y cerrados.

- **URL**: https://mifuturapp.com/indicador_btc/trades_explorer.php
- **API datos**: https://mifuturapp.com/indicador_btc/api/trades_history.php?limit=100
- **JS lógica**: ./assets/js/trade_explorer.js
- **CSS**: assets/css/style.css?v2
- **WebSocket**: wss://stream.binance.com:9443/ws/btcusdt@aggTrade
- **Actualización**: cada 5000 ms (5 segundos)

---

## 1. Columnas de las tablas

### Tabla de Trades Abiertos (OPEN)

| # | Columna | Descripción |
|---|---------|-------------|
| 1 | **ID** | Identificador numérico del trade |
| 2 | **Estado** | OPEN / TP / SL / BE (badge coloreado) |
| 3 | **TF** | Timeframe (ej: `candles_3m`, `candles_5m`, `candles_15m`) |
| 4 | **Side** | LONG / SHORT (badge verde/rojo) |
| 5 | **Setup** | Nombre del setup detectado (ej: `upper_rejection`, `lower_rejection`, `sell_absorption`) |
| 6 | **Entry** | Precio de entrada |
| 7 | **SL** | Precio del stop loss |
| 8 | **TP1** | Precio del primer take profit + checkmark (✓) si fue hit |
| 9 | **TP2** | Precio del segundo take profit + checkmark |
| 10 | **TP3** | Precio del tercer take profit + checkmark |
| 11 | **Max TP** | Nivel máximo alcanzado: `TP1`, `TP2`, `TP3` o `—` |
| 12 | **MFE** * | Maximum Favorable Excursion (en puntos de precio) |
| 13 | **MAE** * | Maximum Adverse Excursion (en puntos de precio) |
| 14 | **Duración** | Tiempo transcurrido desde `opened_at` hasta ahora |
| 15 | **R actual** | Múltiplo R actual = MFE / riesgo |
| 16 | **Abierto** | Fecha/hora de apertura del trade (formato localizado es-ES) |

> \* MFE y MAE vienen directamente del backend como valores calculados. La lógica JS referencia `trade.mfe` y `trade.mae`.

### Tabla de Trades Cerrados (CLOSED)

| # | Columna | Descripción |
|---|---------|-------------|
| 1 | **ID** | Identificador numérico del trade |
| 2 | **Resultado** | TP / SL / BE (badge coloreado). Se aplica `effectiveResult()` que puede corregir SL→BE si el R gestionado >= 0 |
| 3 | **TF** | Timeframe |
| 4 | **Side** | LONG / SHORT |
| 5 | **Setup** | Nombre del setup |
| 6 | **Entry** | Precio de entrada |
| 7 | **Cierre** | Precio de cierre del trade |
| 8 | **TP1** | TP1 + checkmark |
| 9 | **TP2** | TP2 + checkmark |
| 10 | **TP3** | TP3 + checkmark |
| 11 | **Max TP** | Nivel máximo alcanzado |
| 12 | **SL** | Precio del stop loss |
| 13 | **MFE** | Maximum Favorable Excursion |
| 14 | **MAE** | Maximum Adverse Excursion |
| 15 | **Duración** | Desde `open_time` hasta `first_touch_time` (o `closed_at` si no hay first_touch) |
| 16 | **R gest.** | Múltiplo R gestionado final (calculado con `calcResultR()`) |
| 17 | **PnL cierre** | PnL en USD del cierre (verde si >= 0, rojo si < 0) |
| 18 | **Touch time** | Fecha/hora del primer toque confirmado (`first_touch_time`) |

---

## 2. KPIs generales

### Hero / cabecera superior (a tiempo real)

| KPI | ID HTML | Descripción |
|-----|---------|-------------|
| **BTC Live** | `#livePrice` | Precio actual BTC/USDT desde Binance WebSocket |
| **Abiertos** | `#summaryOpen` | Número de trades abiertos (tras filtros) |
| **Cerrados** | `#summaryClosed` | Número de trades cerrados (tras filtros) |
| **Realtime** | `#wsStatus` | Estado WebSocket: ONLINE / OFFLINE / ERROR |

### Resumen de trades cerrados (Trade Summary)

| KPI | ID HTML | Fórmula |
|-----|---------|---------|
| **TP / SL / BE** | `#summaryTpSl` | Conteo: `TP / SL / BE` usando `effectiveResult()` |
| **Winrate** | `#summaryWinrate` | `(TP / (TP + SL + BE)) × 100` en % |
| **R gestionado total** | `#summaryRTotal` | Suma de todos los `calcResultR()` |
| **R gestionado medio** | `#summaryRAvg` | `R total / count(R válidos)` |
| **PnL cierre total** | `#summaryPnlTotal` | Suma de `calcPnlUsd()` en $ |
| **PnL cierre medio** | `#summaryPnlAvg` | `PnL total / count(PnL válidos)` en $ |

### Equity Curve KPIs

| KPI | ID HTML | Fórmula |
|-----|---------|---------|
| **Max DD** | `#equityMaxDd` | Máximo drawdown acumulado en R |
| **Profit Factor** | `#equityProfitFactor` | `Gross Win R / |Gross Loss R|` (∞ si grossLoss = 0) |
| **Expectancy** | `#equityExpectancy` | Media aritmética de todos los R valores |
| **Mejor R** | `#equityBestR` | `Math.max(...rValues)` |
| **Peor R** | `#equityWorstR` | `Math.min(...rValues)` |

### Tablas de rendimiento agrupado (Setup y Timeframe)

Ambas tablas tienen las mismas columnas:

| Columna | Descripción |
|---------|-------------|
| **Setup / Timeframe** | Nombre del grupo |
| **Trades** | Número total de trades en el grupo |
| **TP / SL / BE** | Conteo desglosado |
| **Winrate** | `TP / (TP + SL + BE) × 100` en % |
| **R total** | Suma de R del grupo (verde si >= 0, rojo si < 0) |
| **R medio** | R total / trades con R válido |
| **Profit Factor** | Gross Win / |Gross Loss| (∞ si grossLoss = 0) |

---

## 3. Cálculo de R, MFE y MAE

### Parámetros de simulación (constantes en JS)

```js
const SIM_POSITION_BTC = 0.01;   // Tamaño de posición simulado: 0.01 BTC
const TP1_WEIGHT = 0.35;         // Peso del 35% en TP1
const TP2_WEIGHT = 0.40;         // Peso del 40% en TP2
const TP3_WEIGHT = 0.25;         // Peso del 25% en TP3
```

### Cálculo del riesgo (`calcRisk`)

```
Si LONG:  riesgo = entry_price - stop_price
Si SHORT: riesgo = stop_price - entry_price

Se descartan riesgos <= 0 o < 5 (probablemente en ticks/puntos mínimos)
```

### Cálculo de R (`calcLevelR`)

Para un nivel de precio dado:

```
Si LONG:  R = (level - entry) / risk
Si SHORT: R = (entry - level) / risk
```

### Cálculo de R actual en abiertos (`calcCurrentR`)

```
R actual = MFE / risk
```

### Cálculo de R gestionado final (`calcResultR`)

Este es el más complejo. Sigue esta lógica:

1. **Validar modelo TP**: `validTpModel()` comprueba que los 3 TPs existen, que los R de cada nivel no superan |10|, y que son secuenciales (LONG: entry < TP1 < TP2 < TP3; SHORT: entry > TP1 > TP2 > TP3).
2. **Si NO hay modelo TP válido** → usa `calcLegacyResultR()`: R simple = (close - entry) / risk (con capping a |R| <= 10).
3. **Si hay modelo TP válido**, aplica la lógica de pesos según qué niveles se tocaron:

| Caso | Cálculo |
|------|---------|
| **TP3 hit** o resultado="TP" | `0.35×R_TP1 + 0.40×R_TP2 + 0.25×R_TP3` |
| **TP2 hit** (sin TP3) | Si BE: `0.35×R_TP1 + 0.40×R_TP2 + 0.25×0` → Si no BE: `0.35×R_TP1 + 0.40×R_TP2 + 0.25×(-1)` |
| **TP1 hit** (sin TP2) | Si BE: `0.35×R_TP1 + 0.65×0` → Si no BE: `0.35×R_TP1 + 0.65×(-1)` |
| **Resultado = BE** | R = 0 |
| **Resultado = SL** | R = -1 |
| **Otro** | Fallback a `calcLegacyResultR()` |

### Efective Result (`effectiveResult`)

SL se convierte a BE si el `calcResultR()` del trade devuelve R >= 0 (caso en que se tocó TP parcial y luego se cerró en SL, pero la gestión parcial dejó ganancia).

### MFE y MAE

MFE y MAE **no se calculan en el frontend**. Llegan directamente del backend como campos numéricos en el JSON de cada trade (`trade.mfe`, `trade.mae`). El frontend solo los formatea con `fmt()`.

- **MFE** (Maximum Favorable Excursion): máxima distancia favorable del precio desde la entrada (en puntos de precio).
- **MAE** (Maximum Adverse Excursion): máxima distancia adversa del precio desde la entrada (en puntos de precio).

### Cálculo de PnL en USD (`calcPnlUsd`)

Aplica la misma lógica de pesos que `calcResultR` pero usando diferencias de precio en USD:

```
Si LONG:  PnL = (level - entry) × 0.01 BTC
Si SHORT: PnL = (entry - level) × 0.01 BTC
```

Con la misma lógica de pesos TP1/TP2/TP3 y fallback `calcLegacyPnlUsd`.

---

## 4. Tipos de trades soportados

### Side (dirección)

- **LONG**: badge verde (`#14532d` bg, `#bbf7d0` text)
- **SHORT**: badge rojo (`#7f1d1d` bg, `#fecaca` text)

### Take profits

- **TP1**, **TP2**, **TP3**: tres niveles de take profit secuenciales
- Cada nivel tiene precio (`tp1_price`, `tp2_price`, `tp3_price`) y flag de hit (`tp1_hit`, `tp2_hit`, `tp3_hit`)
- Columna **Max TP**: muestra qué nivel máximo se alcanzó (1, 2, 3) o `—`
- Los pesos de lote son fijos: 35% en TP1, 40% en TP2, 25% en TP3

### Setups detectados (vistos en API)

- `upper_rejection` — Rechazo superior (bajista)
- `lower_rejection` — Rechazo inferior (alcista)
- `sell_absorption` — Absorción de compras (bajista)
- `neutral` — Sin estructura dominante

*(Pueden existir más; los vistos en la snapshot de datos son estos)*

### Timeframes

Los trades se ejecutan sobre velas de distintos timeframes, nombrados como:
- `candles_3m`
- `candles_5m`
- `candles_15m`

### Estado / Resultado

- **OPEN** — Trade activo, aún no cerrado
- **TP** — Take profit completo (o TP3 alcanzado)
- **SL** — Stop loss alcanzado (puede recalificarse a BE si hubo gestión parcial)
- **BE** — Break even (cerrado sin pérdida/ganancia, o SL mitigado por parciales)

### Break-even automático

El backend reporta si el break-even está armado (`break_even_armed: 0|1`) y el timestamp (`break_even_time`).

---

## 5. Sistema de filtrado

### Controles de filtro (en el HTML)

| Control | Tipo | ID | Descripción |
|---------|------|----|-------------|
| **Estado** | `<select>` | `#filterStatus` | Valores: ALL, OPEN, CLOSED, TP, SL, BE |
| **Side** | `<select>` | `#filterSide` | Valores: ALL, LONG, SHORT |
| **Setup** | `<input type="text">` | `#filterSetup` | Búsqueda por texto parcial (case-insensitive) |
| **Timeframe** | `<input type="text">` | `#filterTf` | Búsqueda por texto parcial (case-insensitive) |

### Lógica de filtrado (`applyFilters`)

La función `applyFilters(trades)` recibe el array completo de trades y devuelve solo los que cumplen TODOS los filtros activos:

1. **Filtro por status**:
   - `ALL` → no filtra
   - `OPEN` → `trade.status === "OPEN"`
   - `CLOSED` → `trade.status === "CLOSED"`
   - `TP`/`SL`/`BE` → usa `effectiveResult(trade)` para determinar el resultado efectivo

2. **Filtro por side**: comparación exacta (`trade.side === side`)

3. **Filtro por setup**: `String(trade.setup).toLowerCase().includes(setupText)`

4. **Filtro por timeframe**: `String(trade.timeframe).toLowerCase().includes(tfText)`

**Todos los filtros se combinan con AND.** Si un filtro está en "ALL" o vacío, no afecta.

### Reactividad

Cada cambio en cualquier `<select>` o `<input>` dispara `refrescar()` (via evento `input`), que vuelve a cargar datos de la API y re-pinta todo.

### Tabs visuales

Botones OPEN / CLOSED que alternan visibilidad de las secciones `#tab-open` y `#tab-closed` mediante clases CSS `.active`.

---

## 6. Datos del backend (API)

Endpoint: `https://mifuturapp.com/indicador_btc/api/trades_history.php?limit=100`

Respuesta JSON:

```json
{
  "ok": true,
  "open": [ ... ],
  "closed": [ ... ]
}
```

### Campos de cada trade

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID único |
| `status` | string | "OPEN" o "CLOSED" |
| `source` | string | Siempre `"signals_engine"` |
| `symbol` | string | `"BTCUSDT"` |
| `timeframe` | string | Ej: `"candles_3m"` |
| `side` | string | `"LONG"` o `"SHORT"` |
| `setup` | string | Nombre del setup |
| `open_time` | string (ISO) | Tiempo de apertura de la vela señal |
| `entry_price` | float | Precio de entrada |
| `stop_price` | float | Precio del stop loss |
| `tp_price` | float | Precio del TP principal (probablemente TP3) |
| `opened_at` | string | Timestamp de apertura real del trade |
| `closed_at` | string/null | Timestamp de cierre |
| `close_price` | float/null | Precio de cierre |
| `result` | string/null | `"TP"`, `"SL"`, `"BE"` o null |
| `first_touch` | float/null | Precio del primer toque |
| `first_touch_time` | string/null | Timestamp del primer toque |
| `mfe` | float/null | Maximum Favorable Excursion |
| `mae` | float/null | Maximum Adverse Excursion |
| `score` | int | Confianza de la señal (0-100) |
| `structure_type` | string | Tipo de estructura |
| `structure_score` | int | Score de estructura (-2 a +2) |
| `tp1_price` | float | Precio TP1 |
| `tp2_price` | float | Precio TP2 |
| `tp3_price` | float | Precio TP3 |
| `tp1_hit` | 0/1 | Si TP1 fue tocado |
| `tp2_hit` | 0/1 | Si TP2 fue tocado |
| `tp3_hit` | 0/1 | Si TP3 fue tocado |
| `tp1_time` | string/null | Timestamp toque TP1 |
| `tp2_time` | string/null | Timestamp toque TP2 |
| `tp3_time` | string/null | Timestamp toque TP3 |
| `max_tp_reached` | int | Nivel máximo: 0, 1, 2 o 3 |
| `break_even_armed` | 0/1 | Si el BE está activado |
| `break_even_time` | string/null | Timestamp de activación BE |

---

## 7. Resumen visual

- **Tema**: Dark mode, azul oscuro (`#020617` bg), verde para LONG/TP, rojo para SHORT/SL, gris para BE.
- **Gráfico**: Equity Curve con Chart.js (línea azul con relleno semitransparente), acumulando R trades cerrados.
- **WebSocket**: Conecta a Binance para precio en vivo y muestra latencia.
- **Actualización**: Polling cada 5 segundos a la API.
