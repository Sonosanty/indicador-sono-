# Análisis en profundidad: Range Intelligence (mifuturapp.com)

**URL analizada:** https://mifuturapp.com/indicador_btc/range_explorer.php  
**Fecha:** 27 de mayo de 2026

---

## 1. ¿Qué es el "Range Intelligence"? ¿Cómo funciona?

**Range Intelligence** es un radar automático de mercado para BTC/USDT que analiza la estructura de rango en múltiples timeframes simultáneamente. No es un indicador direccional simple, sino un **sistema de análisis contextual** que evalúa dónde se encuentra el precio dentro de su rango reciente y qué tipo de dinámica de mercado está ocurriendo.

### Flujo de funcionamiento:

1. **Backend PHP** (`api/range_context.php`) recopila velas de 4 tablas MySQL: `candles_1m`, `candles_3m`, `candles_5m`, `candles_15m`.
2. Para cada timeframe, calcula:
   - **Rango**: high/low del periodo de lookback (120 velas para 1m/3m/5m, 96 velas para 15m).
   - **Zonas de soporte/resistencia**: clusters de precios con alta densidad de toques.
   - **Barridos (sweeps)**: detección de si el precio ha superado un extremo y ha revertido.
   - **Presión**: relación entre presión compradora y vendedora.
3. El frontend JavaScript (vanilla JS, sin framework) renderiza los datos en cards con gráficos Canvas (Chart.js) y actualiza cada **20 segundos** automáticamente.

### Fuentes de datos para el análisis:

> *"Lectura automática basada en rangos recientes, posición porcentual, clusters de soporte/resistencia, POC, mechas, volumen relativo y presión de compra/venta."*

Variables clave:
- **Rangos recientes** → high/low del periodo de lookback.
- **Posición porcentual** → dónde está el precio dentro del rango (0-100%).
- **Clusters S/R** → densidad de toques en cada nivel de precio.
- **POC** (Point of Control) → nivel con mayor volumen/actividad.
- **Mechas (wicks)** → extensiones del precio fuera del cuerpo de la vela.
- **Volumen relativo** → comparativa de volumen actual vs histórico.
- **Presión compra/venta** → ratio de actividad direccional.

---

## 2. ¿Qué timeframes analiza?

Analiza **4 timeframes** en paralelo:

| Timeframe | Lookback (velas) | Rango de vista dinámica (USD) | Notas |
|-----------|-----------------|-------------------------------|-------|
| **1m** | 120 velas (~2h) | 80-180 USD | Máxima granularidad |
| **3m** | 120 velas (~6h) | 120-260 USD | Microestructura |
| **5m** | 120 velas (~10h) | 180-380 USD | Corto plazo |
| **15m** | 96 velas (~24h) | 260-650 USD | **DOMINANTE** (marcado con pill azul) |

### Jerarquía:
- **15m** es el timeframe dominante (se muestra con un badge "DOMINANTE").
- El sesgo global (bullish/bearish/neutral) se determina evaluando la **confluencia entre timeframes** (sistema MTF - Multi-TimeFrame).

---

## 3. ¿Cómo calcula la "Confianza"?

La **Confianza** (confidence) es un score global de 0 a 100 que se muestra en el hero de la página. Se calcula en el backend PHP (`api/range_context.php`) y se basa en:

### Factores que la componen (extraídos del análisis):

1. **Cohesión entre timeframes** (confluencia MTF): cuántos timeframes apuntan en la misma dirección.
2. **Posición en el rango**: si el precio está en extremos (cerca del 85%+ o 15%-) tiene más sesgo que si está en zona media.
3. **Presencia de barridos (sweeps)**: si hay sweeps en uno o varios timeframes, aumenta la confianza direccional.
4. **Score de presión direccional**: combinación de `top_pressure` y `bottom_pressure` (0-100 cada uno).
5. **Densidad de clusters S/R:** cuántos y qué tan fuertes son los niveles de soporte/resistencia.

En la ejecución capturada, la confianza global era **45/100** con bias `neutral` y mensaje *"Precio en zona media o sin confluencia clara"*, coherente con que 4 de 4 timeframes estaban en zona media (`middle_count: 4`).

### Rangos de interpretación del score de confianza:
- **0-25**: Baja confianza, señal débil o contradictoria.
- **26-50**: Confianza moderada, posible sesgo pero sin confluencia fuerte.
- **51-75**: Confianza alta, confluencia entre timeframes.
- **76-100**: Confianza muy alta, señal direccional consistente en múltiples TFs.

---

## 4. ¿Qué indicadores visuales usa?

La página emplea un rico conjunto de indicadores visuales, cuidadosamente diseñados:

### A. Hero Section (cabecera global)
- **Precio en vivo** (grande, bold).
- **Bias global**: NEAR SUPPORT, NEAR RESISTANCE, POSSIBLE REJECTION TOP, POSSIBLE REVERSAL BOTTOM, NEUTRAL.
- **Confianza**: número /100 con score contextual.
- **Indicador de vida**: punto verde parpadeante con glow.
- **Color dinámico**: el borde del hero cambia a rojo (bearish) o verde (bullish).

### B. Cards por timeframe (4 cards, grid 2×2)
Cada card contiene:

| Elemento | Descripción |
|----------|-------------|
| **Nombre del TF** | 1m, 3m, 5m, 15m (15m con badge "DOMINANTE") |
| **Estado operacional** | RIESGO RECHAZO (rojo), POSIBLE REACCIÓN (verde), RANGO / ESPERA (neutro) |
| **Presión del mercado** | COMPRADORA / VENDEDORA / COMPRESIÓN + intensidad (FUERTE / MEDIA / NEUTRA) |
| **Meter de presión** | Barra deslizante con gradiente rojo-gris-verde y punto indicador |
| **Gráfico Canvas** | Scatter chart con trazado relativo del precio pasado (90 puntos) y punto actual brillante. Muestra líneas discontinuas de soporte (verde) y resistencia (roja) |
| **Contexto** | Zona alta/baja/media del rango |
| **Liquidez** | Liquidez vendedora/compradora o sin ventaja clara |
| **Sweep** | Top sweep / Bottom sweep / Sin barrido claro |
| **Reacción esperada** | Posible rechazo / rebote / riesgo de rechazo / esperar confirmación |
| **Mensaje de bias** | Texto descriptivo de la lectura |
| **Niveles de S/R** | 4 niveles de soporte (verdes) y 4 de resistencia (rojos) con deltas de precio, valor y fuerza (WEAK / MEDIUM / STRONG / EXTREME) |
| **Barras de fuerza** | Barras de progreso para cada nivel (25%, 50%, 75%, 100%) |

### C. Elementos dinámicos
- **Auto-refresh** cada 20 segundos (se pausa cuando la pestaña no está visible, se reanuda al volver).
- **Actualización reactiva** al recibir nuevos precios vía WebSocket (`btc-live-price` event).
- **Responsive**: se adapta a móviles (≤480px cambia a 1 columna, reduce padding).

### D. Gráfico (Chart.js con plugin custom)
- Plugin `spatialLiquidityPlugin` que dibuja:
  - Ejes centrales con glow.
  - Líneas discontinuas de soporte (verde translúcido) y resistencia (rojo translúcido).
  - Etiquetas con delta de precio, valor absoluto y fuerza.
  - Punto central con doble halo brillante.
- Escala Y dinámica según el TF (más zoom en TFs menores).

---

## 5. ¿Qué relación tiene con las otras 2 páginas?

El sistema completo consta de **3 páginas** bajo `mifuturapp.com/indicador_btc/`:

### Página 1: `index.php` — "Indicador Cripto Macro" (Dashboard principal)
- Visión **macro** del mercado: precio BTC en USD/EUR, régimen crypto (ACUMULACIÓN, DISTRIBUCIÓN), sesgo (LONG SWING), riesgo (MEDIO/ALTO/BAJO).
- Indicadores macro: **Fear & Greed Index** (25 - Extreme Fear), **VIX** (16.84), **RSI Macro 3D** (49.02 - Neutral), **Dominancia BTC** (57.96%), **Dominancia ETH** (9.58%), **Market Cap Crypto** ($2.62T).
- Es el panel de **contexto general**, orientado a decidir la dirección estratégica.

### Página 2: `range_explorer.php` — "Range Intelligence" (objeto de este análisis)
- Análisis **táctico** de la estructura de rango en múltiples timeframes.
- Se enfoca en **dónde está el precio dentro del rango**, **presión compra/venta**, **sweeps** y **niveles S/R**.
- Sirve para afinar entry/exit dentro del marco macro definido en index.php.

### Página 3: `trades_explorer.php` — "Trades Realtime"
- Panel de **ejecución y seguimiento de trades**.
- Muestra:
  - Trades **abiertos**: ID, estado, TF, side, setup, entry, SL, TP1/2/3, MFE, MAE, duración, R actual.
  - Trades **cerrados**: resultado, R gestionado, PnL de cierre, touch time.
  - Estadísticas agregadas: winrate, R total, R medio, profit factor, expectancy, max DD, mejor/peor R.
  - Estadísticas por **setup** y por **timeframe**.

### Relación entre las 3 páginas (flujo de trabajo):

```
index.php (MACRO)
    ↓ Define el régimen y sesgo estratégico
    ↓ Ej: "ACUMULACIÓN → LONG SWING"
    
range_explorer.php (TÁCTICO)
    ↓ Afina la lectura de rango en múltiples TFs
    ↓ Detecta sweeps, zonas de liquidez, presión
    ↓ Sugiere zonas de entrada/salida
    
trades_explorer.php (EJECUCIÓN)
    ↓ Trades reales basados en el análisis anterior
    ↓ Tracking de performance, winrate, R
```

En conjunto forman un **sistema completo de trading**:
1. **Macro** → saber si comprar o vender (régimen + dominancia + fear/greed).
2. **Rango** → saber dónde y cuándo (estructura de rango + presión + sweeps).
3. **Trades** → ejecutar y medir resultados (tracking en tiempo real + estadísticas).

La navegación entre páginas se hace mediante la barra superior: `Dashboard` (index.php) → `Range Intelligence` (range_explorer.php) → `Trades` (trades_explorer.php).
