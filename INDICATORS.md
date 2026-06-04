# Indicadores — Sono PRO

Referencia técnica de cada indicador utilizado en el Score Maestro y en las páginas del dashboard.

---

## SMA — Simple Moving Average

**Archivo:** `js/indicators/ma.js`

### Fórmula

```
SMA(period) = sum(closes[-period:]) / period
```

### Periodos usados

| MA | Periodo | Propósito |
|----|---------|-----------|
| MA6 | 6 velas | Tendencia inmediata |
| MA40 | 40 velas | Tendencia de medio plazo |
| MA70 | 70 velas | Tendencia semanal |
| MA200 | 200 velas | Tendencia estructural (alcista/bajista) |

### Cache

El módulo MA implementa un cache por hash basado en el timestamp de la última vela. Cuando cambian los datos, el hash cambia y el cache se invalida automáticamente.

```js
hash = klines.length + '_' + lastKline[0]  // timestamp
```

### P1 — Tendencia (Score Maestro)

| Condición | Puntos |
|-----------|--------|
| MA6 > MA40 | +12 |
| MA6 > MA70 | +10 |
| MA40 > MA200 | +13 |
| **Máximo** | **35** |

---

## RSI — Relative Strength Index (Cutler's RSI)

**Archivo:** `js/indicators/rsi.js`

### Fórmula

Cutler's RSI (sin Wilder Smoothing):

```
RSI = 100 - 100 / (1 + RS)
RS = (ganancias_promedio / pérdidas_promedio)
```

Donde las ganancias y pérdidas se calculan como promedio simple sobre el periodo (no exponencial como Wilder).

### Parámetros

| Parámetro | Valor |
|-----------|-------|
| Periodo | 14 |
| Sobrecompra | ≥ 70 |
| Sobreventa | ≤ 30 |

### Clasificación

```js
val >= 70 → { label: 'Sobrecompra', color: '#ef4444' }
val >= 60 → { label: 'Alto', color: '#f59e0b' }
val >= 45 → { label: 'Neutral', color: '#3b82f6' }
val >= 30 → { label: 'Bajo', color: '#3b82f6' }
val < 30  → { label: 'Sobreventa', color: '#22c55e' }
```

### P2 — Momentum (Score Maestro)

| Condición RSI | Puntos |
|---------------|--------|
| RSI ≥ 50 y < 70 | +12 |
| RSI ≥ 35 | +7 |
| RSI < 35 | +2 |

---

## ADX — Average Directional Index

**Archivo:** `js/indicators/adx.js`

### Fórmula

```
+DI = 100 × EMA(+DM) / ATR
-DI = 100 × EMA(-DM) / ATR
ADX = 100 × |+DI - -DI| / (+DI + -DI)
```

Donde:
- `+DM = high[i] - high[i-1]` (si > -DM y > 0)
- `-DM = low[i-1] - low[i]` (si > +DM y > 0)
- `TR = max(high-low, |high-close[i-1]|, |low-close[i-1]|)`

### Parámetros

| Parámetro | Valor |
|-----------|-------|
| Periodo | 14 |

### Clasificación

```js
val >= 35 → { label: 'Tendencia fuerte', color: '#22c55e' }
val >= 25 → { label: 'Tendencia moderada', color: '#f59e0b' }
val < 25  → { label: 'Rango / Lateral', color: '#64748b' }
```

### P2 — Momentum (Score Maestro)

| Condición ADX | Puntos |
|---------------|--------|
| ADX > 35 | +15 |
| ADX > 25 | +10 |
| ADX ≤ 25 | +3 |

---

## BB — Bollinger Bands (%B)

**Archivo:** `js/indicators/bb.js`

### Fórmula

```
Middle = SMA(close, 20)
Upper = Middle + 2 × σ(close, 20)
Lower = Middle - 2 × σ(close, 20)
%B = (close - Lower) / (Upper - Lower)
```

Donde σ es la desviación estándar poblacional.

### Parámetros

| Parámetro | Valor |
|-----------|-------|
| Periodo | 20 |
| Desviaciones | 2 |

### Clasificación

```js
pb < 0.15 → { label: 'Oversold extremo', color: '#22c55e', zone: 'oversold_extreme' }
pb < 0.35 → { label: 'Oversold', color: '#22c55e', zone: 'oversold' }
pb < 0.65 → { label: 'Neutral', color: '#3b82f6', zone: 'neutral' }
pb < 0.85 → { label: 'Overbought', color: '#f59e0b', zone: 'overbought' }
pb ≥ 0.85 → { label: 'Overbought extremo', color: '#ef4444', zone: 'overbought_extreme' }
```

### P3 — Bollinger (Score Maestro)

| Condición %B | Puntos |
|-------------|--------|
| < 0.15 | +28 |
| < 0.35 | +20 |
| < 0.65 | +14 |
| < 0.85 | +7 |
| ≥ 0.85 | +2 |

---

## Rangos (Soportes y Resistencias)

**Archivo:** `js/indicators/ranges.js`

### Fórmula

Basado en puntos pivote clásicos:

```
Pivot = (High + Low + Close) / 3
R1 = 2 × Pivot - Low
R2 = Pivot + (High - Low)
S1 = 2 × Pivot - High
S2 = Pivot - (High - Low)
```

Los niveles se redondean al múltiplo de `roundTo` (por defecto 100 para BTC).

---

## Confluencia MTF

**Archivo:** `js/indicators/confluence.js`

Calcula el Score Maestro para cada timeframe y genera:

- **avgScore:** promedio de scores de todos los TFs
- **pressure:** 0-100 (0 = venta fuerte, 50 = neutral, 100 = compra fuerte)
- **signals:** score + label + RSI + ADX por TF
- **mtfSummary:** conteo de señales alcistas/bajistas/neutrales y bias general

### Timeframes analizados

1m, 3m, 5m, 15m, 1h (excluye 3d por ser datos diarios)

---

## RSI 3D

**No es un indicador independiente.** Se calcula con `js/indicators/rsi.js` sobre velas diarias (intervalo `1d` de Binance). Cache TTL de 2 minutos.

---

## Alineación Python ↔ JavaScript

Todos los indicadores están alineados entre:

- **Python** (`sono_score.py`) — fuente canónica
- **JavaScript** (`js/indicators/score-maestro.js`) — módulo ES
- **JavaScript legacy** (`frontend/app.js`, `frontend/metodo.html`) — inline (redirigido al módulo cuando app.module.js carga)

La configuración de umbrales y pesos se centraliza en `sono-score-config.json`.
