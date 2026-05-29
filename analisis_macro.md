# Análisis completo de https://mifuturapp.com/indicador_btc/index.php

> Fecha del análisis: 2026-05-27
> Herramienta: "Indicador Cripto Macro" de MiFuturApp

---

## 1. Datos macro que muestra

### Precio BTC en directo (WebSocket)
| Dato | Ejemplo (captura) |
|---|---|
| BTC/USD | $75.873,38 |
| BTC/EUR | €65.105,01 |
| Variación 24h | -1,74% |
| Fuente | Binance BTCUSDT + EURUSDT |

### Estado macro general (score sintético)
- **Estado**: NEUTRAL
- **Score**: 2/6
- **Descripción**: "Score 2 · contexto de acumulación, riesgo y liquidez."
- Clases CSS dinámicas según estado: `macro-neutral`, `macro-long`, `macro-short`, `macro-long-excelente`, `macro-short-excelente`

### Régimen Crypto
- **Régimen**: ACUMULACIÓN
- **Sesgo**: LONG SWING
- **Riesgo**: MEDIO
- **Detalle**: "Contexto típico de acumulación macro progresiva."

### Fear & Greed Index
- **Valor**: 25
- **Etiqueta**: Extreme Fear
- **Fuente**: alternative.me

### VIX
- **Valor**: 16,84
- **Interpretación**: Volatilidad mercado tradicional
- **Fuente**: Yahoo Finance (^VIX)

### RSI Macro 3D
- **Valor**: 49,02
- **Interpretación**: Neutral
- **Fuente**: Binance BTCUSDT + cálculo interno 3D

### Dominancias de mercado
| Indicador | Valor | Interpretación |
|---|---|---|
| Dominancia BTC | 57,96% | BTC liderando el mercado |
| Dominancia ETH | 9,58% | Termómetro de apetito altcoin |
| Dominancia Alts | 32,46% | Mercado ex-BTC-ex-ETH |

### Market Cap Global
- **Total**: 2,62T
- **Volumen 24h**: 93,23B

### Timeframes multi-escala

Datos por timeframe (1m, 3m, 5m, 15m, 1h, 4h, 1d, 3d):
- Precio actual
- RSI
- MA20, MA50, MA200
- Cambio porcentual

### Histórico por indicador

Cada card muestra min/max y delta del histórico cargado (últimos 100 snapshots). Ejemplos:
- "Histórico cargado · min 75.500,00$ · max 76.200,00$ · Δ +200,00$"
- Lo mismo para Fear & Greed, VIX, RSI, cada dominancia y Market Cap

### Gráfico histórico (Chart.js)

Gráfico de líneas (últimos 50 puntos) con 4 series:
1. Score macro
2. Fear & Greed
3. RSI BTC
4. Dominancia BTC

---

## 2. Estructura de la información (layout y jerarquía)

### Layout general

```
┌────────────────────────────────────────────┐
│  TOPBAR                                    │
│  Indicador BTC Macro      [Trades] [Rangos]│
│  Contexto macro · BTC live · señales       │
├────────────────────────────────────────────┤
│  MACRO-TOP-GRID (2 columnas)               │
│  ┌─────────────┐ ┌───────────────────────┐ │
│  │ BTC Spot     │ │ Estado Macro         │ │
│  │ $75.873      │ │ NEUTRAL · Score 2/6  │ │
│  │ €65.105      │ │                       │ │
│  │ -1,74% 24h   │ │                       │ │
│  └─────────────┘ └───────────────────────┘ │
├────────────────────────────────────────────┤
│  GRID (5 columnas → responsive)            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐ │
│  │Régimen│ │Fear& │ │ VIX  │ │ RSI  │ │...│ │
│  │Crypto │ │Greed │ │      │ │Macro │ │   │ │
│  │span 2 │ │      │ │      │ │3D    │ │   │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐ │
│  │Dom.  │ │Dom.  │ │Dom.  │ │Market│ │   │ │
│  │BTC   │ │ETH   │ │Alts  │ │Cap   │ │   │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──┘ │
├────────────────────────────────────────────┤
│  FOOTER                                     │
│  Último snapshot: 2026-05-27 13:38:03      │
└────────────────────────────────────────────┘
```

### Cards individuales
Cada card tiene:
1. **Label** (título, ej: "Fear & Greed")
2. **Value** (número grande, ej: "25")
3. **Sub** (interpretación textual, ej: "Extreme Fear")
4. **Data source** (enlaces a las fuentes originales + API interna)
5. **Mini-history** (min/max/delta del histórico cargado)
6. Animación `is-updating` (pulso verde) al actualizar datos

### Jerarquía visual
- **Tamaño**: Price card y Estado macro son los más grandes (grid-column: span 2)
- **Régimen crypto**: también span 2 dentro del grid de 5 columnas
- **Colores**: fondo oscuro (#020617), cards en #1e293b, tonos teal/azul/verde/rojo según estado
- **Responsive**: 5 cols → 2 cols → 1 col según viewport

---

## 3. APIs / WebSockets que usa

### WebSocket (tiempo real BTC)

```
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/eurusdt@ticker
```

- Stream combinado de Binance
- Proporciona precio BTC/USD y EUR/USDT en tiempo real
- Convierte BTC a EUR usando el ratio
- Actualiza la UI inmediatamente con custom event `btc-live-price`
- Reconexión automática cada 5 segundos en caso de cierre

### API interna (backend propio)

```
GET api/historico_macro.php?limit=N
```

- Endpoint PHP propio en el mismo servidor
- Devuelve JSON array con snapshots históricos
- Parámetro `limit`: hasta 100 registros
- La app lo consulta cada 60 segundos (`setInterval` en app.js)

**Estructura del JSON devuelto:**

```json
{
  "fecha": "2026-05-27 13:38:03",
  "timeframes": {
    "1m": { "price": 75909.11, "change_percent": 0.06, "rsi": 47.58, "ma20": 75936.31, "ma50": 75945.82, "ma200": 75917.75 },
    "3m": { ... },
    "5m": { ... },
    "15m": { ... },
    "1h": { ... },
    "4h": { ... },
    "1d": { ... },
    "3d": { ... }
  },
  "btc_price": { "usd": 75893.34, "eur": 65122.14, "change_24h": -1.71 },
  "fear_greed": { "value": 25, "label": "Extreme Fear" },
  "rsi_macro_3d": 49.1,
  "rsi_btc": 49.1,
  "rsi_estado": "Neutral",
  "btc_dominance": 57.93,
  "crypto_global": {
    "btc_dominance": 57.93,
    "eth_dominance": 9.57,
    "alts_dominance": 32.5,
    "total_marketcap_trillions": 2.62,
    "total_volume_billions": 93.24
  },
  "crypto_regime": {
    "label": "ACUMULACIÓN",
    "bias": "LONG SWING",
    "risk": "MEDIO",
    "detail": "Contexto típico de acumulación macro progresiva."
  },
  "vix": 16.85,
  "macro_score": 2,
  "macro_state": "NEUTRAL",
  "score": 2,
  "estado": "NEUTRAL"
}
```

### APIs externas referenciadas (backend-side)

| Fuente | Endpoint |
|---|---|
| Alternative.me (Fear & Greed) | `https://api.alternative.me/fng/` |
| CoinGecko Global | `https://api.coingecko.com/api/v3/global` |
| Yahoo Finance (VIX) | `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX` |
| Binance | `wss://stream.binance.com:9443/ws` (WebSocket) |

### Librerías CDN

- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js` — para el gráfico histórico de líneas

---

## 4. Funcionalidades que NO tenemos en Sono Pro

A continuación, funcionalidades detectadas en la web de MiFuturApp que no están presentes en Sono Pro o que están en estado diferente:

### 4.1 Sistema de scoring multi-timeframe con sesgo operativo

La app tiene un **sistema de puntuación cuantitativo** basado en 3 factores por cada timeframe:
- **Tendencia** (precio vs MA20 vs MA50): puntúa -2, 0, +2
- **Momentum RSI**: puntúa -2, -1, 0, +1 (según nivel de sobrecompra/venta)
- **Cambio %**: puntúa -2, -1, 0, +1, +2 (según magnitud)

El cálculo produce un **score total / max** y se clasifica como:
- LONG (ratio ≥ 0.55)
- LONG DÉBIL (ratio ≥ 0.25)
- NEUTRAL
- SHORT DÉBIL (ratio ≤ -0.25)
- SHORT (ratio ≤ -0.55)

### 4.2 Modos operativos configurables (4 estrategias)

```javascript
const modos = {
    scalp:     { label: "Scalping",     principal: "1m",  contexto: ["1m","3m","5m"] },
    intradia:  { label: "Intradía",     principal: "5m",  contexto: ["3m","5m","15m"] },
    swing:     { label: "Swing Trading",principal: "15m", contexto: ["15m","1h","4h"] },
    diario:    { label: "Diario",       principal: "1d",  contexto: ["4h","1d","3d"] }
};
```

Cada modo analiza su conjunto de timeframes y produce un **sesgo consolidado** (LONG/SHORT/NEUTRAL) específico para ese estilo de trading.

### 4.3 Resumen por factor (RSI / Tendencia / Cambio)

La función `resumenFactor()` desglosa la contribución de cada factor:
- **RSI**: puntuación e interpretación por timeframe
- **Tendencia**: alcista/bajista/lateral + puntos
- **Cambio %**: magnitud de movimiento + puntos

### 4.4 Tabla detallada de timeframes con lecturas interpretativas

Para cada timeframe del modo activo, se genera una fila con:
- Timeframe
- Tendencia (icono + texto: 🟢 Alcista, 🔴 Bajista, 🟡 Lateral)
- Puntos de tendencia (X/2)
- RSI numérico
- Puntos de RSI (X/2)
- Cambio % con signo
- Puntos de cambio (X/2)
- Score total (X/6)
- **Lectura interpretativa** (texto compuesto):
  - "Bajista, pero con riesgo de rebote" (Bajista + Sobreventa)
  - "Presión bajista" (Bajista + Débil)
  - "Alcista, pero con riesgo de agotamiento" (Alcista + Sobrecompra)
  - "Impulso alcista" (Alcista + Fuerte)
  - "Retroceso dentro de estructura alcista" (Alcista + Débil)
  - "Mercado lateral" (por defecto)

### 4.5 Trades Explorer (página separada)

Sistema completo de tracking de trades en tiempo real con:
- **Live feed** de Binance aggTrade WebSocket
- **Trades abiertos**: ID, Estado, TF, Side, Setup, Entry, SL, TP1/2/3, Max TP, MFE, MAE, Duración, R actual
- **Trades cerrados**: ID, Resultado, TF, Side, Setup, Entry, Cierre, TP1/2/3, Max TP, SL, MFE, MAE, Duración, R gest., PnL cierre, Touch time
- **Métricas agregadas**: Winrate, R total gestionado, R medio, Profit Factor, Expectancy, Max DD, Mejor/Peor R
- **Agrupación por Setup y Timeframe** con TP/SL/BE, Winrate, R total, R medio, Profit Factor

### 4.6 Range Explorer (página separada)

Análisis de estructura de mercado basado en rangos:
- **Market Structure Radar** con bias (alcista/bajista/lateral)
- **Confianza** (score contextual)
- **Estado** con confluencia MTF
- **Refresh** automático cada 20s
- Grid de rangos por timeframe (4 columnas) con:
  - Precio alto/bajo del rango
  - Barra de posición porcentual (color según tercio: top=rojo, bottom=verde, middle=gris)
  - Bias dentro del rango
  - Sweep (barrido de liquidez)
  - Zonas de soporte/resistencia con niveles de precio
- Lectura automática basada en: rangos recientes, posición porcentual, clusters de S/R, POC, mechas, volumen relativo, presión de compra/venta

### 4.7 Animaciones de actualización visual

- Efecto `macroPulse` (destello verde) al actualizar datos en cualquier card
- Transiciones suaves en hover (translateY -3px, sombra aumentada)
- Gradientes radiales de fondo según estado (verde para long, rojo para short, azul para neutral)

### 4.8 Indicación de fuente en cada card

Cada card incluye enlaces directos a la fuente de datos original y a la API interna, lo que permite verificar y depurar fácilmente.

---

## Resumen de lo más valioso para Sono Pro

| Funcionalidad | Prioridad | Descripción |
|---|---|---|
| Scoring multi-timeframe | 🔴 Alta | Sistema cuantitativo LONG/SHORT/NEUTRAL por modo |
| Modos operativos | 🔴 Alta | Scalping, Intradía, Swing, Diario |
| Resumen por factor | 🟡 Media | Desglose RSI / Tendencia / Cambio |
| Tabla interpretativa | 🟡 Media | Lecturas textuales por timeframe |
| Trades Explorer | 🟢 Baja | (quizá ya existe en Sono) |
| Range Explorer | 🟢 Baja | (quizá ya existe en Sono) |
| Animaciones de update | 🔵 Extra | Pulso verde en cards al refrescar datos |
