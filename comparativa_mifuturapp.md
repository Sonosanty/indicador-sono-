# Comparativa Mifuturapp vs Sono Pro — 27 Mayo 2026

## Range Intelligence (mifuturapp)
### Estructura general
- Título: "Range Intelligence | BTC"
- Subtítulo: "Radar automático de extremos, rangos, zonas y barridos BTC"
- Navegación: Dashboard | Trades | Rangos
- Precio BTC: $75,165.59
- Estado: NEUTRAL
- CONFIANZA: 45/100
- Texto: "Precio en zona media o sin confluencia clara"
- Refresh: 20s automático

### Timeframes (4 TFs con PRESIÓN):
1. **15m** → DOMINANTE | RANGO/ESPERA | Presión: COMPRADORA (MEDIA)
   - Contexto: Zona baja del rango
   - Liquidez: Sin ventaja clara
   - Sweep: Sin barrido claro
   - Reacción: Esperar confirmación
2. **5m** → RANGO/ESPERA | Presión: COMPRESIÓN (NEUTRA)
   - Contexto: Zona media
3. **3m** → RANGO/ESPERA | Presión: COMPRESIÓN (NEUTRA)
4. **1m** → RANGO/ESPERA | Presión: COMPRESIÓN (NEUTRA)

### Barra de presión
Indicador visual con 3 segmentos: Vendedora | Neutra | Compradora
Marca donde está la presión actual.

### Dashboard Macro (mifuturapp)
- BTC Spot: $75,168.01 (-1.77% 24h) + EUR: €64,566
- Estado macro: NEUTRAL (Score 2/6)
- Cards: Régimen crypto (ACUMULACIÓN), Fear & Greed (25 EXTREME FEAR), VIX (16.67), RSI Macro 3D (47.78), Dominancias, Market Cap, Vol 24h
- Sesgo: LONG SWING | Riesgo: MEDIO
- Cada card tiene: fuente, enlace, histórico (min/max/Δ)

### Trades Explorer (mifuturapp)
- BTC Live: $75,168.00 (Binance aggTrade)
- Abiertos: 0 | Cerrados: 84 | ONLINE
- KPIs: TP 38 / SL 32 / BE 14 | Winrate 45.2% | R total: 2.39R
- PnL total: -$4.95
- Equity curve + Max DD (-5.72R), Profit Factor (1.08), Expectancy (0.03R)
- Tabla de trades con filtros (OPEN/CLOSED/TP/SL/BE, LONG/SHORT, setup, TF)
- Rendimiento por Setup
- Fuente: Binance WebSocket + snapshots

## Diferencias clave (lo que mifuturapp tiene y Sono Pro no)

### Range Intelligence
- ✅ Sono Pro ya lo tiene: 4 TFs con scatter, clusters S/R, sweeps, presión, CONFIANZA
- ❌ Sono Pro NO tiene: DOMINANTE (marcar qué TF manda), texto "RANGO/ESPERA" descriptivo
- ❌ Sono Pro NO tiene: barra de presión visual (Vendedora | Neutra | Compradora) con indicador de fuerza
- ❌ Sono Pro NO tiene: Refresh automático 20s (Sono Pro usa WebSocket en tiempo real, no necesita refresh manual)

### Dashboard Macro
- ✅ Sono Pro: BTC price, Fear & Greed, CoinGecko dominancias, Market Cap, RSI Macro 3D
- ✅ Sono Pro: Same 2/6 score scale (mifuturapp vs 0-6 Sono)
- ❌ Sono Pro NO tiene: VIX real (proxy por fecha), EUR/USD conversion
- ❌ Sono Pro NO tiene: Enlaces clickeables a fuentes en las cards
- ❌ Sono Pro NO tiene: Texto contextual tipo "Contexto típico de acumulación macro progresiva"
- ❌ Sono Pro NO tiene: Snapshots históricos persistentes por card

### Trades
- ❌ Sono Pro NO tiene: Tabla individual de trades con SL/TP/MFE/MAE/R actual
- ❌ Sono Pro NO tiene: KPIs detallados (TP/TOTAL, BE/TOTAL, SL/TOTAL)
- ❌ Sono Pro NO tiene: Max DD, Profit Factor, Expectancy, Mejor/Peor R
- ❌ Sono Pro tiene: Equity curve, Winrate, Setup breakdown (comparable)
- ❌ Sono Pro NO tiene: Filtros por estado (TP/SL/BE) - solo OPEN/CLOSED
- ❌ Sono Pro NO tiene: Seguimiento MFE/MAE por trade abierto
