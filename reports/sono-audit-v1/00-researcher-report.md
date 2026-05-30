# 🔍 Investigación: Sono Pro Ecosystem — Research Report

> Generado por @researcher para CC_GodMode Orchestrator
> Fecha: 2026-05-30

---

## Índice

1. [Dashboards de trading en tiempo real — WebSocket optimización](#1-dashboards-de-trading-en-tiempo-real-websocket)
2. [Backtesting para estrategias de score](#2-backtesting-para-estrategias-de-score)
3. [Alertas en tiempo real — Telegram](#3-alertas-en-tiempo-real-telegram)
4. [Optimizaciones Vite/React para SPA de trading](#4-optimizaciones-vitereact-para-spa-de-trading)
5. [Deploy de Workers Cloudflare con wrangler CI/CD](#5-deploy-de-workers-cloudflare-con-wrangler-cicd)

---

## 1. Dashboards de Trading en Tiempo Real — WebSocket

### Estado actual del proyecto
- WebSocket Binance `wss://stream.binance.com:9443` para streams `<symbol>@kline_15m`
- hook `useBinance.js` maneja conexión única, reconexión manual
- hook `useMultiTicker.js` suscripciones múltiples (24hr ticker)

### Mejores prácticas investigadas

#### WebSocket Connection Management
1. **Reconnect Strategy Exponencial (Backoff con Jitter)**
   - Intentos: 1s → 2s → 4s → 8s → 16s → 30s (cap)
   - Añadir jitter aleatorio ±20% para evitar thundering herd
   - Límite de 10 reconexiones antes de notificar al usuario
   - Source: [Binance WebSocket Best Practices](https://binance-docs.github.io/apidocs/websocket_api/en/#websocket-api)

2. **Heartbeat / Ping-Pong**
   - Binance cierra conexión inactiva tras 10 min
   - Enviar ping cada 3 min y esperar pong
   - Si no hay respuesta en 10s → reconectar
   - Usar `WebSocket.prototype.onclose` para disparar reconexión

3. **Rate Limiting de Suscripciones**
   - Binance: max 1024 streams por conexión
   - Para 6 activos × 2 streams (kline + ticker) = 12 → dentro de límite
   - Recomendación: 1 conexión WebSocket con múltiples streams, no 1 por activo

4. **Stale Data Detection**
   - Timestamp en cada mensaje
   - Si no hay update en >60s → asumir desconexión y reconectar
   - Mostrar indicador visual de "stale data"

5. **State Machine para Conexiones**
   ```
   DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → DISCONNECTED
   ```
   ✓ Mejor que boolean `isConnected`

#### Implementaciones Recomendadas
- **useWebSocket**: Custom hook con estado de conexión, reconexión automática, y buffer de mensajes
- **SWR con WebSocket**: Mantener SWR como cache, pero actualizar vía WebSocket
- **Alternativa**: usar Binance SDK no oficial (`binance-api-node`) que maneja reconexión

### Recomendación para @architect
Migrar a un custom hook `useWebSocket` con reconnect exponencial + heartbeat + stale detection. Mantener SWR como capa de cache (stale-while-revalidate) para evitar flickering en actualizaciones.

---

## 2. Backtesting para Estrategias de Score

### Estado actual
- Backtesting básico en `sono_bot_paper.py` (simulación en vivo)
- Script `backtester_sono.py` existente (134 líneas)
- Score basado en 3 pilares: MA crosses + Momentum + Bollinger
- Config en JSON (sono-score-config.json)

### Frameworks investigados

#### VectorBT (recomendado como primera opción)
- **Pros**: Ligero, vectorizado (muy rápido), ideal para estrategias basadas en indicadores
- **Cons**: Documentación limitada, API cambió en v0.4+
- **Uso**: Cargar OHLCV → calcular indicadores → generar señales → portfolio metrics
- **Ideal para**: Backtesting de score sobre 3-6 activos, optimización de pesos

```python
# Ejemplo conceptual VectorBT
import vectorbt as vbt
price = vbt.YFData.download("BTC-USD").get("Close")
# Aplicar indicadores vectorizados
fast_ma = vbt.MA.run(price, window=6)
slow_ma = vbt.MA.run(price, window=40)
entries = fast_ma.ma_crossed_above(slow_ma)
exits = fast_ma.ma_crossed_below(slow_ma)
pf = vbt.Portfolio.from_signals(price, entries, exits)
print(pf.stats())
```

#### Backtrader
- **Pros**: Maduro, documentación excelente, community grande
- **Cons**: Más verboso, orientado a objetos (clases), overhead
- **Uso**: Crear `SonoScoreStrategy(bt.Strategy)` que compute score como el engine
- **Ideal para**: Backtesting detallado con slippage, comisiones, múltiples timeframes

#### Backtesting.py (Pypi)
- **Pros**: Simple (~300 líneas de código), ideal para estrategias de una línea
- **Cons**: Limitado, no maneja multi-activo bien
- **Uso**: Prototipado rápido, no para producción

#### Custom (vectorizado con Pandas/Numpy)
- **Pros**: Control total, sin dependencias externas
- **Cons**: Hay que implementar metrics (Sharpe, drawdown, winrate)
- **Recomendación**: Extender el `backtester_sono.py` existente con pandas vectorizado

### Recomendación para @architect
**Estrategia híbrida**: 
1. Usar Pandas/Numpy para cálculo de score vectorizado (misma lógica que scoreEngine.js)
2. Implementar métricas: Winrate, Profit Factor, Sharpe (annualized), Max Drawdown, Calmar Ratio
3. Añadir optimization grid para pesos de score (p1=30-40, p2=30-40, p3=20-30)
4. Visualización: equity curve, drawdown chart, monthly returns heatmap
5. No depender de vectorbt/backtrader para evitar dependencias rotas

---

## 3. Alertas en Tiempo Real — Telegram

### Estado actual
- `telegram_config.json` existente con bot token y chat_id
- **No implementado** — archivo muerto en raíz

### Arquitectura recomendada

#### Componentes
1. **Bot de Telegram** (python-telegram-bot o HTTP API directa)
2. **Canal privado** o grupo donde enviar alertas
3. **Script de alertas** que se ejecuta cada X minutos o en eventos

#### Tipos de alerta

| Tipo | Trigger | Prioridad |
|------|---------|-----------|
| Score Alert | Score cruza umbral (ej: score BTC > 78) | Alta |
| Trade Signal | Entrada/ salida de posición | Alta |
| Bot Status | Bot offline / error / reconexión | Crítica |
| Daily Summary | Resumen diario a las 20:00 CET | Baja |
| Fear & Greed | Cambio extremo (F&G < 20 o > 80) | Media |

#### Implementación recomendada

```python
import requests

TELEGRAM_TOKEN = "your_token"
CHAT_ID = "your_chat_id"
API_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"

def send_alert(message, parse_mode="HTML"):
    payload = {
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": parse_mode,
        "disable_notification": False
    }
    try:
        r = requests.post(API_URL, json=payload, timeout=10)
        return r.ok
    except Exception as e:
        logger.error(f"Telegram error: {e}")
        return False

def format_score_alert(asset, score):
    emoji = {"COMPRA FUERTE": "🟢", "COMPRA": "🟢", "ACUMULACIÓN": "🔵",
             "NEUTRAL": "⚪", "DISTRIBUCIÓN": "🟡", "VENTA": "🔴", "CAPITULACIÓN": "⛔"}
    e = emoji.get(score["signal"], "⚪")
    return f"{e} <b>{asset}</b>\nScore: {score['total']} ({score['signal']})\nPrecio: ${score['price']:,.2f}\nRSI: {score.get('rsi', '?')}"
```

#### Rate Limiting
- Telegram limita a 30 mensajes/segundo por chat
- Agrupar alertas (batch de máximo 10) en vez de enviar 1 por activo
- Usar `disable_notification` para alertas no críticas

### Recomendación para @architect
Implementar módulo `telegram_alerts.py` separado, importable desde `sono_bot_paper.py` y desde un cron job independiente. Usar formatos HTML con emojis para mejorar legibilidad. No añadir dependencias (solo `requests` que ya existe).

---

## 4. Optimizaciones Vite/React para SPA de Trading

### Estado actual
- Vite 8, React 19, HashRouter
- Lazy loading: Trades, Rangos, Metodo, Agents
- manualChunks: react-vendor, chart-vendor, recharts-vendor
- CSP estricto, post-build con reescritura de HTML
- No hay service worker

### Optimizaciones recomendadas

#### Code Splitting Avanzado
```javascript
// En vez de lazy() por página, dividir componentes pesados
// El MétodoPage.jsx tiene 29KB — dividir en:
// - MetodoScoreBoard
// - MetodoControls
// - MetodoChart
```

#### Preconnect / Prefetch Estratégico
```html
<!-- Ya implementado -->
<link rel="preconnect" href="https://stream.binance.com" crossorigin />
<link rel="dns-prefetch" href="https://api.coingecko.com" />

<!-- Añadir: -->
<link rel="preload" as="script" href="/assets/react-vendor-xxx.js" />
<link rel="modulepreload" href="/assets/trades-xxx.js" />
```

#### Service Worker (Workbox)
Ya hay carpeta `.netlify` y `.wrangler` — implementar service worker para:
- Cachear assets estáticos (cero round-trips en navegación)
- Estrategia: Stale-While-Revalidate para assets JS/CSS
- Cache-First para fonts de Google Fonts (ya precargadas)

```javascript
// vite.config.js - Añadir plugin vite-plugin-pwa
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg}'],
    runtimeCaching: [{
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts' }
    }]
  }
})
```

#### Bundle Analysis
```bash
npm run build && npx vite-bundlesize
```
Analizar si Chart.js + Recharts duplican funcionalidad (ambos renderizan gráficos).

#### CSS Optimization
- CSS actual: `pages.css` (14KB) + `theme.css` (4.6KB) + `MetricCard.css` (4.7KB) + `TopBar.css` (2.8KB)
- Total ~26KB CSS — aceptable pero mejorable
- Recomendación: CSS Modules o CSS-in-JS medio (vanilla-extract) para colocar CSS junto al componente

#### React 19 Optimizations
- Ya usa React 19 — aprovechar `use()` para data fetching
- `React.memo()` en componentes que no cambian (MetricCard, TopBar)
- `useTransition` para navegación entre páginas (evitar bloqueo de UI)

### Recomendación para @architect
Priorizar: (1) Bundle analysis, (2) Service Worker para assets estáticos, (3) Code splitting de MétodoPage (componente más grande), (4) Verificar si Chart.js + Recharts son necesarios ambos.

---

## 5. Deploy de Workers Cloudflare con Wrangler CI/CD

### Estado actual
- Worker `vix-proxy` deployado manualmente en `vix-proxy.sonosanty.workers.dev` v3.0
- `wrangler.toml` con KV binding `VIX_CACHE`
- Sin CI/CD — deploy manual cada vez

### Pipeline recomendado

#### wrangler.toml existente (bien configurado)
```toml
name = "vix-proxy"
main = "src/worker.js"
compatibility_date = "2026-05-28"
[[kv_namespaces]]
binding = "VIX_CACHE"
id = "f231333214e24e98bc5f53a1d321e776"
```

#### CI/CD con GitHub Actions

```yaml
# .github/workflows/deploy-vix-worker.yml
name: Deploy VIX Proxy Worker

on:
  push:
    branches: [main]
    paths:
      - 'vix-proxy-worker/**'
      - '.github/workflows/deploy-vix-worker.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: vix-proxy-worker
          command: deploy
```

#### Secrets necesarios en GitHub
- `CF_API_TOKEN` — Token con permisos Workers + KV (en Cloudflare Dashboard)
- `CF_ACCOUNT_ID` opcional (se lee de wrangler.toml o env)

#### Ambient Environment Variables (Workers)
```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"

[env.staging]
name = "vix-proxy-staging"
vars = { ENVIRONMENT = "staging" }
```

#### Secrets Management
Para Workers con tokens sensibles:
```bash
echo "MY_SECRET" | wrangler secret put TELEGRAM_BOT_TOKEN
```

### Recomendación para @architect
Implementar GitHub Action para deploy automático del VIX Worker en push a main. Usar `wrangler-action@v3` que es oficial y no requiere wrangler CLI instalado en el runner.

---

## Resumen de Recomendaciones para @architect

| # | Tema | Prioridad | Esfuerzo | Dependencias |
|---|------|-----------|----------|--------------|
| 1 | WebSocket reconnect + heartbeat | Alta | Bajo | Ninguna |
| 2 | Backtesting engine propio (vectorizado) | Media | Medio | pandas, numpy |
| 3 | Alertas Telegram | Alta | Bajo | requests |
| 4 | Service Worker + PWA | Media | Medio | vite-plugin-pwa |
| 5 | CI/CD Worker VIX | Alta | Bajo | wrangler-action |
| 6 | Refactor score (ALT/OSMO cleanup) | Alta | Medio | - |
| 7 | Módulo de performance dashboard | Media | Alto | - |
| 8 | Migración a real trading controlado | Baja | Alto | Pionex API real |

**Handoff** → @architect para diseño de arquitectura
