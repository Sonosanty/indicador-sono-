# Comparativa: Sono Pro vs mifuturapp

> **Fecha:** 27 de mayo de 2026
> **Propósito:** Análisis comparativo completo entre el estado actual de Sono Pro (frontend vanilla JS) y el ecosistema mifuturapp (React + bot Python + scraping + APIs múltiples).

---

## 1. ¿Qué tiene mifuturapp que NO tenga Sono?

### 1.1 Trading real automatizado en Pionex
- **Bot autónomo** (`pionex_trading_automatico.py`) que ejecuta compras/ventas reales en el exchange Pionex cada 15 minutos.
- Sincroniza saldos reales de la cuenta (USD, BTC, ETH, SOL, XRP).
- Gestión de stop-loss dinámico, clean up de órdenes límite colgadas.
- Notificaciones vía Telegram API en cada operación.

### 1.2 Backend de procesamiento de datos (`process_indicador_data.py`)
- **VIX real desde Yahoo Finance** — actualizado cada ejecución.
- **Fear & Greed Index real desde Alternative.me** — vía API en vivo.
- **Google Trends (BTC)** — volumen de búsqueda real vía pytrends, con caché de 3h.
- **Cálculos técnicos multi-timeframe** — RSI, MA20, MA50, MA200 en 15m, 1h, 4h y 1d para cada moneda.
- **Score de confluencia propio** (0-100) basado en RSI + posición respecto a MAs.
- **Scraping de señales** desde `mifuturapp.com/indicador_btc/backtest_scalping.php`.

### 1.3 Arquitectura React con Vite
- **Componentes reutilizables** (`CandlestickChart`, `RadialGauge`, `SignalBadge`, `PilarBar`).
- **Estado reactivo** con hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`).
- **Rendimiento optimizado** con virtual DOM y renderizado condicional.
- **Mejor estructura de código:** JSX modular, estilos en objeto literal, lógica separada.
- **Compilación a producción** con Vite (`OutDir` configurado).

### 1.4 Enriquecimiento de datos offline
- **Base de datos SQLite** consolidando datos persistentes.
- **Caché inteligente** de Google Trends (evita HTTP 429).
- **Datos de backtesting** enriquecidos desde scraping externo.

### 1.5 Alertas Telegram
- Mensajes reales enviados al canal de Telegram del usuario con resumen de operaciones, balances y señales.

### 1.6 Despliegue profesional
- **Wrangler CLI** para Cloudflare Pages desde el backend.
- Archivos JSON de datos procesados servidos estáticamente.
- Pipeline completo: datos → procesador → JSON estático → Cloudflare → usuario.

---

## 2. ¿Qué tiene Sono que mifuturapp no tenga?

### 2.1 WebSocket Binance en tiempo real
- Conexión **directa y persistente** a `wss://stream.binance.com:9443/ws` para cada activo.
- Actualización **vela a vela** (candle real-time streaming), no por polling.
- Reconexión automática con backoff de 4 segundos.
- Indicador de estado en vivo (latencia, stale detection, última actualización).
- Ticker 24h actualizado cada 12s para los 4 activos.

### 2.2 Gráfico de velas SVG nativo
- **Renderizado cliente-side** de candlesticks con SVG puro (sin librerías externas).
- MA6, MA40, MA200 y Bollinger Bands superpuestos directamente en el SVG.
- Escala de precios dinámica, grid responsive, leyenda integrada.
- Actualización en cada vela WebSocket.

### 2.3 Score Maestro Sono (algoritmo propio más sofisticado)
- **3 pilares** con ponderaciones: Cruces MA (0-35), Momentum/ADX/RSI (0-35), Bollinger %B (0-30).
- **7 fases de mercado:** CAPITULACIÓN → VENTA FUERTE → VENTA → NEUTRAL → ACUMULAR → COMPRA → COMPRA FUERTE.
- Señal híbrida con zona de sentimiento (Pánico → Euforia).
- Gauge radial SVG interactivo.
- Desglose granular de cada pilar con subcomponentes (ADX, RSI, %B).

### 2.4 Calculadora de riesgo interactiva
- Cálculo de cantidad, tamaño de posición, apalancamiento y pérdida máxima.
- Autocompletado del precio actual en vivo.
- Indicador visual de apalancamiento seguro (>5x warning, >10x peligro).

### 2.5 Alertas sonoras nativas
- Oscilador Web Audio API con tonos diferenciados (compra fuerte = 660→880Hz, venta = 520→330Hz).
- Toggle de activación/desactivación. Sin depender de Telegram ni backend.

### 2.6 Timeline de señales persistente
- Últimas 50 señales guardadas en `localStorage`.
- Filtros por resultado (compra/venta/neutral), activo (BTC/ETH/SOL/XRP), búsqueda textual.
- Sobrevive a recargas del navegador.

### 2.7 Curva de equity cliente-side
- Canvas con curva de R acumulado basada en el histórico de señales.
- KPIs: winrate, profit factor, expectancy, max DD, mejor/peor R.
- Tablas de rendimiento por setup y timeframe.

### 2.8 Trades simulados en vivo (real trade engine)
- Creación de trades LONG/SHORT basados en señales del score.
- SL/TP dinámicos basados en ATR (1.5x ATR para SL, 2.5x para TP).
- Tracking de MFE, MAE, R actual, duración en tiempo real.
- Cierre automático al alcanzar SL o TP.
- Vista de abiertos/cerrados con filtros.

### 2.9 Landing page con SEO optimizado
- Meta tags OG, description, keywords, robots, canonical.
- Skip link de accesibilidad.
- PWA ready con favicon y theme-color.
- Régimen macro live desde localStorage compartido.
- Diseño responsive con 4 breakpoints (420px, 768px, 1024px, 1366px).

### 2.10 Sin dependencias de backend
- 100% funcionando desde `file://` o Cloudflare Pages.
- No necesita servidor Python, ni SQLite, ni cron jobs.
- No depende de librerías externas (0 npm packages).

---

## 3. ¿Qué datos reales tiene mifuturapp que Sono debería tener?

| Dato | mifuturapp | Sono Pro | Prioridad |
|------|-----------|----------|-----------|
| **VIX** | ✅ Real desde Yahoo Finance | ❌ No tiene | 🔴 ALTA |
| **Fear & Greed Index** | ✅ Real desde Alternative.me | ❌ No tiene (simulado) | 🔴 ALTA |
| **Google Trends BTC** | ✅ Real desde pytrends | ❌ No tiene | 🟡 MEDIA |
| **Saldo real Pionex** | ✅ API en vivo ($85.64 USD) | ❌ No tiene | 🟡 MEDIA |
| **Velas multi-timeframe** | ✅ 15m, 1h, 4h, 1d | ❌ Solo 3m | 🟢 BAJA |
| **RSI multi-timeframe** | ✅ 15m, 1h, 4h, 1d | ⚠️ Solo 3m | 🟢 BAJA |
| **Señales backtest histórico** | ✅ Scraping desde PHP | ❌ No tiene | 🟡 MEDIA |
| **Precio Binance 24h** | ✅ Sí | ✅ Sí | ✅ OK |
| **Velas Binance 3m** | ❌ No | ✅ Sí (350 velas) | ✅ OK |
| **WebSocket tiempo real** | ❌ No (solo REST polling) | ✅ Sí | ✅ OK |

### 3.1 Explicación de brechas clave

**VIX (Alta prioridad):** El índice de volatilidad del mercado (VIX) es un indicador macro crítico para el régimen general del mercado. mifuturapp lo obtiene via `yfinance`. Sono Pro debería incorporarlo para enriquecer la señal macro.

**Fear & Greed (Alta prioridad):** mifuturapp llama a la API pública de Alternative.me (`https://api.alternative.me/fng/`) para obtener el sentimiento real del mercado cripto. Sono Pro actualmente simula una barra de sentimiento basada exclusivamente en el Score (no es el dato real).

**Saldo Pionex (Media):** mifuturapp conecta directamente con la API REST de Pionex para mostrar el saldo real en vivo. Sono Pro no tiene integración con ningún exchange.

**Señales de backtest (Media):** mifuturapp scrapea (`BeautifulSoup`) señales históricas desde `mifuturapp.com/indicador_btc/backtest_scalping.php` para mostrar contexto histórico. Sono Pro solo acumula señales en tiempo real desde que se abre la página.

---

## 4. Top 5 mejoras más impactantes para Sono Pro

### 🥇 1. Fear & Greed Index real + VIX en la landing
**Impacto:** 🌟🌟🌟🌟🌟 (máximo)
- Añadir fetch a `https://api.alternative.me/fng/` y `yfinance` (VIX) desde el frontend.
- Mostrar en la landing (regime indicator) y en el dashboard (sentiment card) con datos reales.
- **Esfuerzo:** ~2h. Sin backend, solo JavaScript.
- **Diferencia clave:** La barra de sentimiento pasaría de ser simulada a ser datos reales de mercado.

### 🥈 2. Backend JSON enriquecido con macros
**Impacto:** 🌟🌟🌟🌟🌟
- Crear/mejorar un JSON estático servido desde Cloudflare (como hace mifuturapp con `process_indicador_data.py`).
- Incluir: VIX, Fear & Greed, Google Trends, precio actualizado, balance Pionex.
- **Esfuerzo:** ~4h. Python script simple que genera JSON + CI que lo despliega.
- **Diferencia clave:** Sono Pro tendría datos macro reales sin necesidad de backend persistente.

### 🥉 3. Calculadora de riesgo con balance real Pionex
**Impacto:** 🌟🌟🌟🌟
- Añadir endpoint/jSON con el saldo real de Pionex para autocompletar el "CAPITAL" en la calculadora.
- **Esfuerzo:** ~3h (configuración API + script de extracción).
- **Diferencia clave:** Pasar de "introduce tu capital manualmente" a "tu capital real en el exchange".

### 4. Historial de señales con backtesting real
**Impacto:** 🌟🌟🌟🌟
- Persistir señales del score en un archivo JSON en el servidor (no solo localStorage).
- Mostrar estadísticas históricas: winrate real, profit factor, Sharpe aproximado.
- **Esfuerzo:** ~3h (backend simple + endpoint REST + frontend).
- **Diferencia clave:** mifuturapp scrapea datos históricos; Sono solo tiene señales desde que abres la página.

### 5. Alertas Telegram desde el frontend
**Impacto:** 🌟🌟🌟
- Usar Telegram Bot API desde el frontend para enviar señales FUERTES al usuario.
- Complementar las alertas sonoras locales (que ya existen).
- **Esfuerzo:** ~2h (configurar bot + fetch POST desde JS).
- **Diferencia clave:** Las alertas sonoras solo funcionan si el navegador está abierto; Telegram es persistente y multi-dispositivo.

---

## Resumen ejecutivo

| Dimensión | Sono Pro | mifuturapp |
|-----------|----------|------------|
| **Arquitectura** | Vanilla JS (sin framework) | React + Vite |
| **Gráficos** | SVG nativo + Canvas | SVG nativo |
| **Datos en vivo** | ✅ WebSocket Binance (vela a vela) | ❌ REST polling |
| **Datos macro** | ❌ Simulados | ✅ VIX, Fear&Greed, Google Trends reales |
| **Bot trading** | ❌ Solo señales | ✅ Automatizado en Pionex |
| **Backend** | ❌ Cero (100% cliente) | ✅ Python + SQLite + scraping |
| **Alertas** | 🔔 Sonido nativo (solo browser) | 📱 Telegram + sonido |
| **Persistencia** | localStorage | SQLite + JSON servido |
| **Score señales** | Score Maestro 3 pilares (más sofisticado) | Score confluencia simple (RSI + MAs) |
| **Historial** | Solo desde apertura | Datos históricos con scraping |
| **Calculadora riesgo** | ✅ Sí | ❌ No |
| **Trades en vivo** | ✅ Simulados con tracking MFE/MAE | ✅ Reales en Pionex |
| **SEO** | ✅ Landing optimizada | ❌ No tiene landing |
| **Responsive** | ✅ 4 breakpoints | ⚠️ Parcial |
| **Deuda técnica** | ⚠️ HTML+JS embebido (duplicado en trades/) | ✅ Modular y compilable |

### Veredicto

**Sono Pro gana en:** tiempo real (WebSocket), sofisticación del score, gráficos cliente-side, calculadora de riesgo, trades simulados con MFE/MAE, SEO y experiencia visual.

**mifuturapp gana en:** datos reales (VIX, Fear&Greed, Trends), trading automatizado, persistencia de datos, arquitectura React moderna y notificaciones Telegram.

**La sinergia ideal:** incorporar los datos macro reales de mifuturapp en la terminal en tiempo real de Sono Pro.
