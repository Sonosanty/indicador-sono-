# MEMORIA PROYECTO — Sono Pro Terminal de Trading

## Identidad
- **Nombre**: Sono Pro (también "Método Sono" / "Fino Edition")
- **URL producción**: https://indicador-sono.pages.dev/
- **Landing**: https://indicador-sono.pages.dev/ (redirección actual)
- **Dashboard**: https://indicador-sono.pages.dev/dashboard_sono/
- **Trades**: https://indicador-sono.pages.dev/trades/
- **Propietario**: Santy (sparreno)
- **Timezone**: Europe/Madrid
- **Idioma**: Español

## Stack técnico actual
- **Hosting**: Cloudflare Pages (proyecto `indicador-sono`)
- **CI/CD**: `wrangler pages deploy .` desde local
- **Frontend**: HTML + CSS + JS inline (sin frameworks, sin dependencias)
- **Backend**: Cero backend — 100% client-side. Datos desde Binance REST API
- **Persistencia**: localStorage (trades, señales)
- **Bot trading**: Proceso Python local (`sono_bot.py`, PID activo en el PC de Santy)
- **Datos**: Binance API v3 (ticker/24hr, klines), sin WebSocket aún

## Arquitectura actual (3 páginas)
### Landing `/` — HTML puro
- Título "SONO PRO"
- Enlaces a Dashboard y Trades
- Sin JS, sin datos

### Dashboard `/dashboard_sono/`
- **Tickers**: BTC ($75k), ETH ($2k), SOL ($84), XRP ($1.33) con cambio 24h
- **Score Maestro**: 0-100 basado en 3 pilares:
  - P1 (Tendencia, 45pts): Cruce de MA6/MA40/MA70
  - P2 (M. Interno, 30pts): ADX (>25 trend) + RSI (sobrecompra/venta)
  - P3 (Precio, 35pts): Bollinger %B (posición en el rango)
- **Indicadores**: RSI (14), ADX (14), MA6/MA40/MA70 con barras
- **Range Intelligence**: Análisis de zonas (HIGH/MID/LOW) en 4 timeframes simultáneos (1m/3m/5m/15m) con detección de sweeps de liquidez y presión de mercado
- **Timeline**: Últimas 50 señales con persistencia en localStorage
- **Actualización**: Escaneo cada 30s

### Trades `/trades/`
- Tickers en vivo
- Tabs Abiertos/Cerrados
- Tablas con ID, Side, Entry, SL, TP, MFE, MAE, Duración, R, PnL
- KPIs: Abiertos, Cerrados, Winrate, R Total
- Demo trades automáticos a los 5s (para testing)
- Persistencia en localStorage

## Historia del proyecto
### Crisis del 27 Mayo 2026
- Dashboard dejó de cargar (pantalla blanca con "CONECTANDO A BINANCE...")
- **Causa raíz**: PowerShell corrompió los `<script>` tags al editar HTML. Sin etiqueta de apertura, el JS inline nunca se ejecutaba.
- **Red herring**: VPN bloqueaba Binance → sin VPN funciona perfectamente
- **Solución**: Reescribir los 3 HTMLs desde cero con Python, verificar JS con Node.js, backup antes de deploy
- **Script creado**: `_build_all.py` para generar y verificar automáticamente

### Lecciones aprendidas
1. **Backup antes de cada deploy** con timestamp
2. **Verificar JS con Node** (`new Function(code)`) antes de subir
3. **NO editar HTML con PowerShell** (rompe etiquetas). Usar Python o Node.
4. **No mezclar app.js externo con JS inline** (conflicto de `const`)
5. **Deployar directo a producción**, evitar previews de Cloudflare

## Referencia: mifuturapp.com (competidor a igualar)
Mifuturapp es una suite de 3 páginas PHP que Sono Pro debe emular:
1. **index.php** → "Indicador BTC Macro" — contexto macro global (9 cards: BTC Spot, Estado Macro 2/6, Fear&Greed, VIX, RSI, Dominancias, Market Cap)
2. **trades_explorer.php** → "Trades Realtime" — auditoría algorítmica con equity curve (61 trades cerrados), KPIs (Max DD -4.50R, Profit Factor 1.26, Expectancy 0.09R, Winrate 48.4%, R total 8.63, R medio 0.09), rendimiento por Setup (bearish/bullish impulse, sell absorption, lower rejection...) y por Timeframe (1m/3m/5m/15m)
3. **range_explorer.php** → "Range Intelligence" — radar multi-TF con grid 2×2, gauges de presión, confianza 0-100, detección de barridos de liquidez

### Diferencias clave con Sono Pro (a corregir)
- Mifuturapp tiene **3 niveles jerárquicos**: Macro → Auditoría → Táctico. Sono mezcla todo en 1 dashboard.
- Mifuturapp muestra **"Fuente: ..." en cada card**. Sono no muestra fuentes.
- Mifuturapp tiene **min/max/Δ por card**. Sono no tiene histórico por card.
- Mifuturapp tiene **equity curve real con 61 trades**. Sono no tiene backend para persistir historial.
- Mifuturapp tiene **diseño SaaS**: border-radius 14px, borders translúcidos, padding 22px, tipografía Inter+JetBrains Mono. Sono tenía border-radius 4px, Courier monospace, verde neón.

### Paleta objetivo (desde mifuturapp)
- `--bg: #0a1428` (navy profundo)
- `--surface: rgba(20, 35, 60, 0.5)` (translúcido)
- `--green: #16a34a` (verde corporativo, no neón)
- `--red: #dc2626` (rojo desaturado)
- `--border: rgba(120, 160, 220, 0.08)` (casi invisible)
- `--radius: 14px` (SaaS moderno)
- Fuente: Inter (texto) + JetBrains Mono (números)

### Sistema de card "Number-First" (de mifuturapp)
Cada card debe tener 5 slots:
1. Label pequeño gris uppercase (ej: "BTC Spot")
2. NÚMERO ENORME blanco bold (ej: "$75,783")
3. Sublabel gris medio (ej: "€64,989")
4. Fuente + Última actualización (ej: "Fuente: Binance BTCUSDT · 09:09:03")
5. min · max · Δ (ej: "min 75,620 · max 75,899 · Δ +167")

## Pendientes priorizados
### 🔥 Semana 1 — Facelift visual
- [ ] border-radius 14px en todas las cards
- [ ] borders translúcidos 0.5px
- [ ] Inter + JetBrains Mono
- [ ] Padding 22-26px
- [ ] Verde solo para datos positivos
- [ ] "Fuente:" + "Última actualización:" + min/max/Δ en cada card
- [ ] Score Maestro → etiqueta + contador (ej: "COMPRA · 3/6")

### 🟠 Semana 2 — Conectar datos
- [ ] Fear & Greed API (alternative.me)
- [ ] Dominancia BTC/ETH (CoinGecko)
- [ ] VIX (Yahoo Finance o proxy)
- [ ] WebSocket Binance para tiempo real

### 🟢 Semana 3-4 — División en 3 páginas
- [ ] `/macro` → cards macro estilo mifuturapp index.php
- [ ] `/range` → grid 2×2 multi-TF con mini-gráficos
- [ ] `/trades` → equity curve con Cloudflare Worker + D1
- [ ] Header común con pills de navegación

### 🚀 Mes 2 — Game changers
- [ ] Cloudflare Worker + D1 persistencia
- [ ] Equity curve real con 30+ días
- [ ] Rendimiento por setup
- [ ] Confianza agregada multi-TF

## Archivos importantes
- `C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\` → producción (deployado)
- `C:\Users\sparreno\.openclaw\workspace\sono_v3_react\` → scripts Python auxiliares
- `C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\` → backup original con app.js de 55KB
- `C:\Users\sparreno\.openclaw\workspace\backup_20260527_2125\` → backup antes del último deploy
- `C:\Users\sparreno\.openclaw\workspace\sono_bot.py` → bot trading Python
- `C:\Users\sparreno\.openclaw\workspace\sono_v3_react\_build_all.py` → script generador de 3 páginas

## URLs de producción verificadas (21:30)
- https://indicador-sono.pages.dev/ — Landing ✅
- https://indicador-sono.pages.dev/dashboard_sono/ — Dashboard con Score+Range+Timeline ✅
- https://indicador-sono.pages.dev/trades/ — Trades con tablas SL/TP/MFE/MAE ✅

## Skills y agentes configurados
### Skills instaladas
1. **sono-pro** (`skills/sono-pro/`) — Skill personalizada de deploy. Triggers: "despliega sono", "deploy sono pro", "actualiza sono", "estado sono", "monitorea sono"
2. **Perplexity Search** — Búsqueda de información actualizada de mercado

### Tareas automáticas (cron)
- **7:00 AM** — Revisión matutina: mercado nocturno, bot, dashboard
- **20:00 PM** — Revisión nocturna: resumen del día, trades, plan para mañana

### Agentes
- **main** (deepseek/deepseek-v4-flash) — agente principal
- Sub-agentes vía `sessions_spawn` para tareas aisladas
