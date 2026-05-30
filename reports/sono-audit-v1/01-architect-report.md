# 🏗️ Arquitectura: Sono Pro Ecosystem — Architecture Design Report

> Generado por @architect para CC_GodMode Orchestrator
> Fecha: 2026-05-30
> Basado en: research-report.md (@researcher)

---

## Índice de Decisiones

1. [Módulo de Backtesting Integrado al Score Engine](#1-módulo-de-backtesting)
2. [Sistema de Alertas por Telegram](#2-sistema-de-alertas-telegram)
3. [Dashboard de Rendimiento del Bot](#3-dashboard-de-rendimiento)
4. [Refactor: Eliminar ALT/OSMO y Cleanup Dead Code](#4-refactor-cleanup)
5. [Migración de Paper Trading a Real Trading Controlado](#5-migración-a-real-trading)
6. [Hoja de Ruta Priorizada](#6-hoja-de-ruta)

---

## 1. Módulo de Backtesting

### Decisión: Backtesting propio vectorizado con Pandas/Numpy

**Contexto**: El score engine está duplicado entre JS y Python. Necesitamos verificar históricamente qué tan bueno es el score para predecir movimientos y optimizar pesos.

**Opción A**: VectorBT — Rápido pero API cambiante, dependencia externa
**Opción B**: Backtrader — Maduro pero verbose, orientado a clases
**Opción C**: **Propio vectorizado (Pandas/Numpy)** — Control total, sin dependencias no-essentials, mismo código que el score

### Arquitectura del Módulo

```
backtest/
├── backtest_engine.py       # Core: carga datos, calcula score, genera trades
├── backtest_metrics.py      # Métricas: Sharpe, Winrate, DD, Profit Factor
├── backtest_optimizer.py    # Grid search de pesos p1/p2/p3
├── backtest_visualizer.py   # Gráficos: equity curve, drawdown, heatmap
├── sono-score-config.json   # Symbolic link al config único
└── requirements.txt         # pandas, numpy, matplotlib (opcional)
```

### Flujo de Backtesting

```
1. Cargar OHLCV histórico (Binance REST: 1000 velas mínimo)
   ↓
2. Calcular score por cada vela (misma lógica que scoreEngine.js)
   ↓
3. Generar señales: COMPRA cuando score ≥ 62, VENTA cuando < 30
   ↓
4. Backtest con slippage 0.1%, comisión 0.1%
   ↓
5. Reportar: Winrate, Profit Factor, Sharpe Ratio, Max DD, Calmar Ratio
   ↓
6. Visualizar: Equity curve, drawdown chart, monthly returns
```

### Firmas de API

```python
# backtest_engine.py
def run_backtest(
    candles: list[dict],       # OHLCV data
    buy_threshold: int = 62,   # Umbral de compra
    sell_threshold: int = 30,  # Umbral de venta
    slippage: float = 0.001,   # 0.1%
    fee: float = 0.001,        # 0.1%
    capital: float = 100       # Capital inicial
) -> dict:                     # { trades, metrics, equity_curve }

# backtest_metrics.py
def calculate_metrics(equity_curve, trades) -> dict:
    # winrate, profit_factor, sharpe (annualized), max_drawdown, calmar_ratio

# backtest_optimizer.py
def optimize_weights(candles, p1_range, p2_range, p3_range) -> dict:
    # Grid search sobre pesos p1=30-40, p2=30-40, p3=20-30
```

### Archivos afectados
- [ ] `backtest/` (nuevo directorio)
- [ ] `sono_score.py` (extraer lógica vectorizable)
- [ ] `sono_bot_paper.py` (integrar verificación de señal vs backtest)

---

## 2. Sistema de Alertas por Telegram

### Decisión: Módulo Python independiente + integración en bot

**Contexto**: Ya existe `telegram_config.json` con token y chat_id. No se usa. El bot paper necesita notificar cuando el score cruza umbrales.

### Arquitectura

```
telegram_alerts/
├── __init__.py
├── telegram_alert.py         # Core: send_alert() vía HTTP API
├── telegram_formatters.py    # Formatos de mensaje (HTML + emojis)
├── telegram_config.py        # Carga telegram_config.json
└── event_router.py           # Decide qué alertar y cuándo
```

### Tipos de Evento y Prioridades

| Evento | Trigger | Prioridad | Throttle |
|--------|---------|-----------|----------|
| `score_cross` | Score cruza umbral (ej: BTC ≥ 78) | ALTA | 1h por activo |
| `trade_open` | Se abre posición | CRÍTICA | Ilimitado |
| `trade_close` | Se cierra posición con PnL | CRÍTICA | Ilimitado |
| `trailing_stop` | Trailing stop ejecutado | CRÍTICA | Ilimitado |
| `bot_error` | Error en ciclo de trading | CRÍTICA | 15min |
| `bot_health` | Bot heartbeat (resumen) | BAJA | 6h |
| `macro_alert` | F&G < 20 o VIX > 30 | MEDIA | 4h |

### Lógica de Throttle

```python
THROTTLE = {
    'score_cross': timedelta(hours=1),
    'trade_open': timedelta(seconds=0),    # Sin throttle
    'trade_close': timedelta(seconds=0),
    'bot_error': timedelta(minutes=15),
    'bot_health': timedelta(hours=6),
}

def should_send(event_type, asset, current_value):
    key = f"{event_type}:{asset}"
    last_sent = cache.get(key)
    if not last_sent:
        return True
    if datetime.now() - last_sent > THROTTLE[event_type]:
        return True
    # Score cross: solo si cambió de categoría
    if event_type == 'score_cross':
        return current_value != last_sent.get('level')
    return False
```

### Formato de Mensajes

```html
🟢 <b>SEÑAL COMPRA FUERTE</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>BTC</b> · Score: 84/100
Precio: $73,647
RSI: 65.2 · ADX: 32.1
Bias: LONG SWING

<a href="https://indicador-sono.pages.dev">📊 Abrir Sono Pro</a>
```

### Integración con sonobot

```python
# En sonobot_paper.py (cada ciclo)
from telegram_alerts import AlertRouter
alert_router = AlertRouter(token, chat_id)

# Al final de run_once()
alert_router.process_scores(scores, positions)
alert_router.check_health(balance, positions_count)
```

### Archivos afectados
- [ ] `telegram_alerts/` (nuevo directorio)
- [ ] `sono_bot_paper.py` (importar alert router)
- [ ] `telegram_config.json` (ya existe, no tocar)

---

## 3. Dashboard de Rendimiento del Bot

### Decisión: Nueva página en el SPA + endpoint/log JSON

**Contexto**: Actualmente no hay visibilidad del rendimiento del bot. El log `sono_bot_paper.log` es archivo plano. No hay métricas acumuladas ni UI.

### Arquitectura

#### Componentes

```
Frontend (SPA):
└── src/
    └── pages/
        └── BotDashboardPage.jsx    (nueva, lazy loaded)
    └── hooks/
        └── useBotPerformance.js     (nuevo, fetch bot-stats.json)
    └── components/
        └── PnLChart.jsx             (nuevo)
        └── TradeHistoryTable.jsx    (nuevo)
        └── PerformanceMetrics.jsx   (nuevo)

Backend (Python):
└── bot_stats/
    ├── __init__.py
    ├── stats_collector.py   # Recoge trades → genera stats.json
    └── stats_server.py      # Servidor HTTP mínimo para servir stats.json
```

#### Formato stats.json

```json
{
  "version": 1,
  "last_updated": "2026-05-30T13:39:00Z",
  "summary": {
    "total_trades": 85,
    "winning_trades": 40,
    "losing_trades": 45,
    "winrate": 47.06,
    "profit_factor": 1.03,
    "total_pnl": 0.30,
    "total_pnl_pct": 0.30,
    "avg_win": 2.15,
    "avg_loss": -1.92,
    "max_drawdown": 8.5,
    "max_drawdown_pct": 8.5,
    "sharpe_ratio": 0.35,
    "calmar_ratio": 0.04
  },
  "positions": {
    "current": { "asset": "BTC", "side": "LONG", "entry": 73647, "pnl_pct": 0.5 },
    "max_concurrent": 1
  },
  "equity_curve": [
    {"date": "2026-05-01", "equity": 100.0},
    {"date": "2026-05-15", "equity": 101.2},
    {"date": "2026-05-30", "equity": 100.3}
  ],
  "trades": [
    {
      "id": 85,
      "time": "2026-05-30T12:00:00Z",
      "type": "BUY",
      "asset": "BTC",
      "price": 73647,
      "score": 84,
      "signal": "COMPRA FUERTE",
      "pnl_pct": null
    }
  ]
}
```

#### Servir stats.json vía Cloudflare Pages

```
# indicador-sono-repo/_redirects (o _headers)
/bot-stats.json  https://raw.githubusercontent.com/Sonosanty/indicador-sono-/main/bot-stats.json  200
```

O mejor: generar `bot-stats.json` localmente y subirlo al repo con cada commit.

### Hook useBotPerformance

```javascript
// useBotPerformance.js
import useSWR from 'swr'

const STATS_URL = '/bot-stats.json'  // Cloudflare Pages static

export function useBotPerformance() {
  const { data, error } = useSWR(STATS_URL, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  return {
    stats: data,
    isLoading: !error && !data,
    isError: error,
  }
}
```

### Archivos afectados
- [ ] `frontend/src/pages/BotDashboardPage.jsx`
- [ ] `frontend/src/hooks/useBotPerformance.js`
- [ ] `frontend/src/AppRouter.jsx` (añadir ruta /bot)
- [ ] `bot_stats/` (nuevo directorio Python)
- [ ] `sono_bot_paper.py` (llamar stats_collector en cada ciclo)

---

## 4. Refactor: Eliminar ALT/OSMO y Cleanup Dead Code

### Decisión: Limpieza agresiva en 2 fases

**Contexto**: 
- En `sono_bot_paper.py`, `CONFIG` tiene solo 4 activos (BTC, ETH, SOL, XRP). ALT y OSMO no existen.
- Hay archivos huérfanos: `sono_bot.py` (945KB log, 23KB script), `sono_bot_v2.py`, `sono_bot_real.py`
- Hay backups duplicados: `backup_20260527_*`, `backup_20260528_*`
- `indicador-sono-repo/` tiene PHP (`rangos.php`, `trades.php`) que ya no se usan (SPA React las reemplazó)

### Fase 1: Cleanup de Código Muerto (ALTA prioridad)

```bash
# Archivos a eliminar o archivar:
- sono_bot.py           → Reemplazado por sono_bot_paper.py
- sono_bot_v2.py        → Reemplazado
- sono_bot_real.py      → No se usa (paper trading es el activo)
- sono_bot_real.log     → Log muerto (11KB)
- sono_bot_v2.log       → Log muerto (215KB)
- sono_bot.log          → Log muerto (945KB!!) — libera ~1MB
- indicador-sono-repo/rangos.php   → Reemplazado por RangesPage.jsx
- indicador-sono-repo/trades.php   → Reemplazado por TradesPage.jsx  
```

**Estrategia**: Mover a `_archived/` en vez de borrar (por si acaso).

### Fase 2: Consolidación de Score (MEDIA prioridad)

```python
# En sono_bot_paper.py, la lógica de score está DUPLICADA.
# Debe IMPORTAR desde sono_score.py
from sono_score import compute_score, classify_score

# Así evitamos tener 2 implementaciones del score manual.
# El código "duplicado manual" en get_scores_from_web() se reemplaza por:
scores[asset]['total'] = s['total']
scores[asset]['signal'] = s['signal']
```

### Archivos afectados (Eliminar/Mover)
- [ ] `sono_bot.py` → `_archived/sono_bot.py`
- [ ] `sono_bot_v2.py` → `_archived/`
- [ ] `sono_bot_real.py` → `_archived/`
- [ ] `sono_bot.log` → `_archived/logs/`
- [ ] `sono_bot_v2.log` → `_archived/logs/`
- [ ] `sono_bot_real.log` → `_archived/logs/`
- [ ] `indicador-sono-repo/rangos.php` → `_archived/`
- [ ] `indicador-sono-repo/trades.php` → `_archived/`

### Archivos afectados (Modificar)
- [ ] `sono_bot_paper.py` (importar sono_score, no duplicar lógica)
- [ ] `sono_score.py` (verificar compatibilidad de firmas)

---

## 5. Migración de Paper Trading a Real Trading Controlado

### Decisión: No migrar aún. Implementar Safety Locks primero.

**Contexto**: El winrate actual es 46.5% con Profit Factor 1.03. Es decir, apenas positivo. Migrar a real ahora implicaría riesgo alto.

### Checklist Pre-Migración (Requisitos Obligatorios)

```
[ ] Winrate ≥ 55% (actual: 46.5%)
[ ] Profit Factor ≥ 1.5 (actual: 1.03)
[ ] Max Drawdown ≤ 15% (actual: ~8.5%, pero sample pequeño)
[ ] Mínimo 200 trades de backtesting con datos reales
[ ] Sistema de alertas Telegram funcionando 24/7
[ ] Safety limit: max $50 por trade
[ ] Circuit breaker: si -10% en 24h, parar todo
[ ] Pausa manual: poder detener el bot desde Telegram
```

### Arquitectura de Seguridad para Real Trading

```
        ┌─────────────────────┐
        │   Sono Pro SPA      │  ← solo lectura, muestra señales
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │  Alert Router       │  ← Telegram: notifica cada señal
        │  (siempre activo)   │
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │  Safety Guardian    │  ← VALIDA antes de ejecutar
        │  - Max loss check   │
        │  - Daily loss limit │
        │  - Position size    │
        │  - Rate limiter     │
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │  Pionex API         │  ← ÚNICO punto de ejecución
        │  (solo real)        │
        └─────────────────────┘
```

### Safety Guardian (pseudocódigo)

```python
class SafetyGuardian:
    def __init__(self):
        self.max_daily_loss = 10  # % del capital
        self.max_position_size = 50  # USD
        self.daily_loss = 0
        
    def can_trade(self, signal, price, balance):
        today = date.today()
        if today != self.last_check:
            self.daily_loss = 0
            self.last_check = today
        
        # 1. Límite diario de pérdida
        if self.daily_loss >= self.max_daily_loss:
            return False, "Daily loss limit reached"
        
        # 2. Capital mínimo
        if balance < 20:
            return False, "Insufficient balance"
        
        # 3. Señal debe ser fuerte
        if signal not in ('COMPRA FUERTE', 'COMPRA'):
            return False, f"Signal too weak: {signal}"
        
        # 4. Cooldown entre trades (mín 30 min)
        if self.last_trade and (now - self.last_trade) < 1800:
            return False, "Cooldown active"
        
        return True, "OK"
    
    def pause_from_telegram(self, chat_id):
        # Permitir "/pause" desde Telegram
        self.paused = True
```

### Archivos afectados
- [ ] `telegram_alerts/safety_guardian.py` (nuevo)
- [ ] `REQUISITOS_PRE_REAL.md` (nuevo documento de requisitos)

---

## 6. Mejoras Técnicas Complementarias

### 6.1 WebSocket Reconnect (Basado en research)

```javascript
// useWebSocket.js — Hook unificado con estado de conexión
const WS_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'live',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  STALLED: 'stalled',
}

function exponentialBackoff(attempt) {
  const base = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s, 8s...
  const jitter = base * (0.8 + Math.random() * 0.4) // ±20%
  return Math.min(jitter, 30000) // cap at 30s
}
```

### 6.2 CI/CD Worker VIX

```yaml
# .github/workflows/deploy-vix-worker.yml
name: Deploy VIX Proxy Worker
on:
  push:
    branches: [main]
    paths: ['vix-proxy-worker/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: vix-proxy-worker
          command: deploy
```

### 6.3 Service Worker (PWA)

```javascript
// vite.config.js — Añadir
import { VitePWA } from 'vite-plugin-pwa'
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png}'],
    runtimeCaching: [{
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
    }]
  }
})
```

---

## Resumen de Arquitectura

### Diagrama de Capas

```
┌──────────────────────────────────────────────────────┐
│                    🖥️ SPA (Cloudflare Pages)         │
│  MacroPage │ TradesPage │ RangesPage │ MetodoPage    │
│  BotDashboardPage (NEW) │ AgentsPage                 │
└──────────┬──────────────┬────────────────────────────┘
           │              │
     ┌─────▼──────┐  ┌───▼────────┐
     │ Score Engine│  │ WebSocket  │
     │ (JS/Python) │  │ Binance WS │
     └─────┬──────┘  └────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│               🐍 Backend (Windows)                   │
│  sono_bot_paper.py │ sono_score.py                   │
│  telegram_alerts/  │ backtest/ (NEW)                 │
│  bot_stats/ (NEW)  │ safety_guardian (NEW)           │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│               ☁️ Infraestructura                      │
│  VIX Proxy Worker  │ Pionex Paper API                │
│  GitHub Actions CI │ Cloudflare Pages Deploy         │
└─────────────────────────────────────────────────────┘
```

### Dependencias Externas

| Dependencia | Uso | Crítica? |
|-------------|-----|----------|
| `pandas` | Backtesting | Opcional |
| `requests` | Alertas Telegram, ya existe | Sí |
| `vite-plugin-pwa` | Service Worker | Opcional |
| `cloudflare/wrangler-action@v3` | CI/CD | Opcional |

### Handoff
→ Ver Plan de Implementación Priorizado en Paso 3
