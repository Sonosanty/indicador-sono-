# INFORME COMPLETO — SONO PRO
## Estado actual · 30 Mayo 2026 · 20:23 CET

---

## 📋 RESUMEN EJECUTIVO

```
Proyecto:    Sono PRO Terminal
URL:         https://indicador-sono.pages.dev/
Stack:       HTML plano + CSS vanilla + JS vanilla (sin frameworks)
APIs:        Binance REST + WS · CoinGecko · Alternative.me
Bot:         Python paper trading (Pionex)
Automatiz.:  OpenClaw Gateway (PID 17320)
Git:         github.com/Sonosanty/indicador-sono- (main)
Último commit: f194fa0 · "fix: asset selector funcional"
```

---

## 🌐 PRODUCCIÓN — 3 PÁGINAS EN VIVO

| Ruta | Contenido | Tamaño | Estado |
|---|---|---|---|
| **`/`** | Dashboard macro + Score Maestro + Asset selector | 25 KB | ✅ Score 49/100 — ACUMULAR |
| **`/range_explorer.html`** | Range Intelligence (4 timeframes) | 15 KB | ✅ Chart.js + pivotes reales |
| **`/trades_explorer.html`** | Trades Realtime + Equity Curve | 16 KB | ✅ WS ONLINE + Chart.js |
| **`/metodo/`** | Método Sono (Score Maestro v1) | 23 KB | ✅ |
| **`/v2/`** | Dashboard legacy (React SPA) | — | ✅ Redirige |
| **`/style.css`** | Sistema de diseño completo | 31 KB | ✅ HTTP 200 |

### 📊 Datos en vivo — Dashboard principal

| Métrica | Valor | Fuente |
|---|---|---|
| **BTC Spot** | $74,066.61 | ✅ Binance REST |
| **Fear & Greed** | 23/100 — Extreme Fear | ✅ Alternative.me |
| **Dominancia BTC** | 57.37% | ✅ CoinGecko |
| **Market Cap** | $2.58T | ✅ CoinGecko |
| **Score Maestro** | 49/100 — ACUMULAR | ✅ Cálculo propio (3 pilares) |
| **RSI 3D** | 58.03 — Alcista neutral | ✅ Binance klines |
| **Estado Macro** | NEUTRAL — Score 2/6 | ✅ Cálculo propio |

### 🎯 Score Maestro — Fórmula pública (3 pilares)

```
PILAR 1 — Cruces MA (máx 35 pts)
  MA6 > MA40 → +12
  MA6 > MA70 → +10
  MA40 > MA200 → +13

PILAR 2 — Momentum + ADX (máx 35 pts)
  RSI 50-70 → +12 | RSI 35-50 → +7 | RSI <35 o >70 → +2
  ADX >35 → +15 | ADX >25 → +10 | ADX ≤25 → +3

PILAR 3 — Bollinger %B (máx 30 pts)
  %B < 0.15 → 28 | < 0.35 → 20 | < 0.65 → 14 | < 0.85 → 7 | ≥ 0.85 → 2

SEÑALES:
  ≥ 78 COMPRA FUERTE   |   62-77 COMPRA
  52-61 ACUMULAR       |   42-51 NEUTRAL
  30-41 VENTA          |   18-29 VENTA FUERTE
  < 18 CAPITULACIÓN
```

---

## 🤖 BOT PYTHON — PAPER TRADING

| Componente | Estado |
|---|---|
| **PID** | 7948 · 13624 · 15116 (3 procesos) |
| **Modo** | PAPER — sin riesgo real |
| **Estrategia** | Score Maestro cada 60s |
| **Conexión** | Binance REST + Pionex API |
| **Telegram** | ⚠️ Deshabilitado (TELEGRAM_DISABLED=1) |

### Módulos activos
- `sono_bot.py` (26 KB) — Bot principal
- `sono_score.py` (6 KB) — Motor de scoring (versión bot)
- `telegram_alerts.py` (2 KB) — Alertas (deshabilitadas)
- `main.py` (17 KB) — FastAPI server (no desplegado)
- `indicators.py` (2 KB) — Indicadores Python (stub funcional)
- `scoring.py` (2 KB) — Score avanzado (stub funcional)
- `db_utils.py` (1.5 KB) — Persistencia JSON

### Scripts legacy (no usados)
- 30+ scripts `.py` en workspace (tests, experimentos, versiones antiguas)
- `sono_bot_real.py` · `sono_bot_v2.py` · `sono_bot_paper.py` — versiones previas
- `pionex_buy.py` · `pionex_trading_automatico.py` — scripts antiguos

---

## 🔧 STACK TÉCNICO COMPLETO

### Frontend (HTML plano)
| Archivo | Rol |
|---|---|
| `pagina.html` | Dashboard principal con Score Maestro |
| `range_explorer.html` | Radar multi-timeframe con Chart.js CDN |
| `trades_explorer.html` | Trades + Equity Curve con Chart.js CDN |
| `style.css` | Sistema de diseño (31 KB, responsive) |
| `sono-boot.js` | Código de arranque (pendiente de limpiar) |
| `metodo.html` | Página Método Sono |
| `vite.config.js` | Build system (post-build copia assets) |
| `_routes.json` | Configuración de rutas Cloudflare |

### Backend (Python)
| Archivo | Rol |
|---|---|
| `sono_bot.py` | Bot paper trading main loop |
| `sono_score.py` | Motor de scoring (cálculo score) |
| `telegram_alerts.py` | Alertas Telegram (deshabilitado) |
| `main.py` | FastAPI server con WebSocket (no desplegado) |
| `indicators.py` | Indicadores técnicos (RSI, MA, SMA) |
| `scoring.py` | Score avanzado (3 pilares) |
| `db_utils.py` | Persistencia snapshots JSON |

### Infraestructura
| Componente | Versión/Detalle |
|---|---|
| **Cloudflare Pages** | Build automático desde Git |
| **Cloudflare Worker** | `vix-proxy.sonosanty.workers.dev` (proxy VIX + EUR) |
| **OpenClaw** | v2026.5.27 — Gateway PID 17320 |
| **OpenClaw Skill** | `indicador-sono` con 6 comandos |
| **Telegram Bot** | `@sono101bot` (gestionado por OpenClaw) |
| **GitHub** | Repositorio `Sonosanty/indicador-sono-` |

### APIs externas
| API | Endpoint | Uso |
|---|---|---|
| Binance REST | `api.binance.com/api/v3` | Precios, klines, ticker 24h |
| Binance WS | `wss://stream.binance.com:9443` | Precio en tiempo real (aggTrade) |
| CoinGecko | `api.coingecko.com/api/v3/global` | Dominancias, market cap |
| Alternative.me | `api.alternative.me/fng/` | Fear & Greed Index |
| Cloudflare Worker | `vix-proxy.sonosanty.workers.dev` | VIX + EUR (proxy) |

---

## 🔒 SEGURIDAD

| Aspecto | Estado |
|---|---|
| **CSP** | ⚠️ No configurado (recomendado via `_headers`) |
| **HSTS** | ❌ No configurado |
| **X-Frame-Options** | ❌ No configurado |
| **Credenciales en .env** | ✅ Pionex + Telegram en `.env` |
| **Git sin credenciales** | ✅ `.gitignore` cubre `.env`, `*.credentials.json`, `*_config.json` |
| **CORS API** | ✅ Binance y CoinGecko permiten CORS desde cualquier origen |
| **Paper mode** | ✅ Bot en simulación, sin fondos reales |

---

## 📦 GIT — ÚLTIMOS COMMITS

```
f194fa0 fix: asset selector funcional (ETH cambia label+precio+score)
072d892 fix: boot Score Maestro con setTimeout
b05e239 feat: Score Maestro completo (3 pilares), asset selector funcional
09fd9fb feat: archivos originales mifuturapp (exactos)
a7c0741 feat: nuevo diseño mifuturapp - 3 páginas HTML plano
eea9e97 fix: boton OpenClaw -> Conectado en nav v2
6f492dd feat: asset selector BTC/ETH/SOL/XRP en dashboard v2
ab0085c feat: pagina Metodo v2 diseño oscuro con Score Maestro real
```

---

## 📋 PENDIENTES PRIORIZADOS

### 🔴 Críticos
1. **VIX proxy ficticio** — Basado en Fear & Greed, no en datos reales de Yahoo Finance
2. **Trades demo** — La página /trades_explorer.html usa datos demo hardcodeados, no conectados al bot
3. **ADX incorrecto** — Usa solo close prices, no high/low según Wilder
4. **Fórmulas divergentes** — pagina.html y metodo.html calculan el score de forma distinta
5. **CSP/HSTS faltante** — Sin cabeceras de seguridad en Cloudflare

### 🟡 Altos
6. **sono-boot.js huérfano** — 6 KB sin usar (sobrante de implantación anterior)
7. **Scripts legacy** — 30+ archivos `.py` en workspace que no se usan
8. **Submodules Git** — backup_sono_* como submódulos causan ruido en `git status`
9. **Sin refresco periódico del Score** — Solo se calcula al cargar o al cambiar activo
10. **`_routes.json` incompleto** — No define rutas para las páginas HTML estáticas

### 🟢 Leves
11. **19 clases CSS sin definir** — pagina.html referencia clases que no están en style.css
12. **SPA React compilado (~550 KB)** — Se genera en el build pero nunca se sirve
13. **Navegación con rutas absolutas** — metodo.html tiene hrefs absolutos
14. **Encoding CP1252** — Windows vs UTF-8 genera warnings en Git
15. **Botón "Rangos" en nav** — No navega a range_explorer.html (usa ancla #rangos en su lugar)

---

## 📊 ESTADÍSTICAS DEL PROYECTO

| Métrica | Valor |
|---|---|
| **Archivos frontend** | 7 (HTML, CSS, JS, config) |
| **Archivos backend Python** | 45+ (incluyendo legacy) |
| **Líneas de código (aprox)** | 25,000+ |
| **Commits en main** | 30+ |
| **Páginas en producción** | 5 rutas activas |
| **APIs externas conectadas** | 4 (Binance, CoinGecko, Alt.me, Worker) |
| **Activos soportados** | 4 (BTC, ETH, SOL, XRP) |
| **Timeframes en rangos** | 4 (15m, 5m, 3m, 1m) |
| **Alertas sonoras** | Web Audio API (880Hz en cambio de señal) |
| **Historial señales** | localStorage (últimas 50) |
| **Bot activo** | 3 procesos Python, paper trading |
| **OpenClaw** | Gateway PID 17320, skill activo |
| **Coste infraestructura** | €0/mes (Cloudflare gratis + APIs gratuitas) |
