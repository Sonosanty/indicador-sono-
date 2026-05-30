# 🎯 Plan de Implementación Priorizado — Sono Pro Ecosystem

> CC_GodMode Workflow: Research + New Feature
> Versión objetivo: v2.0 (de v1.x estimado)
> Fecha: 2026-05-30

---

## Versión Actual Estimada

El proyecto no tiene VERSION file. Basado en el bot paper v1.0 y la evolución del SPA, estimamos:
- **Current**: v1.4 (pre-release)
- **Target**: v2.0 (con todas las mejoras)

---

## Priorización: Impacto × Esfuerzo

| ID | Feature | Impacto | Esfuerzo | Prioridad | Versión |
|----|---------|---------|----------|-----------|---------|
| A | Alertas Telegram (core) | 🔥 Alto | 🟢 Bajo (1-2h) | **P0** | v1.5 |
| B | WebSocket reconnect robusto | 🔥 Alto | 🟢 Bajo (2-3h) | **P0** | v1.5 |
| C | CI/CD Worker VIX | 🔥 Alto | 🟢 Bajo (1h) | **P0** | v1.5 |
| D | Refactor score unificado (JS ↔ Python) | 🔥 Alto | 🟡 Medio (3-4h) | **P1** | v1.6 |
| E | Cleanup dead code + archivos huérfanos | ⚡ Medio | 🟢 Bajo (1h) | **P1** | v1.6 |
| F | Backtesting engine propio | ⚡ Medio | 🟡 Medio (4-6h) | **P1** | v1.7 |
| G | Dashboard de rendimiento (bot-stats.json) | ⚡ Medio | 🟡 Medio (5-7h) | **P2** | v1.8 |
| H | Service Worker (PWA) | 💡 Bajo | 🟡 Medio (3-4h) | **P2** | v1.8 |
| I | BotDashboard page en SPA | ⚡ Medio | 🔴 Alto (6-8h) | **P2** | v1.9 |
| J | Safety Guardian + pre-real | 🔥 Alto | 🟡 Medio (3-5h) | **P3** | v2.0 |
| K | Migración a real trading | 🔥 Alto | 🔴 Alto (8-12h) | **P3** | v2.0+ |

---

## Roadmap Detallado

### 🚀 v1.5 — Quick Wins (Semana 1)

> Objetivo: Estabilizar el ecosistema con features de alto impacto y bajo esfuerzo

#### A. Alertas Telegram (P0 · 1-2h)

**Archivos a crear:**
- `telegram_alerts/__init__.py`
- `telegram_alerts/telegram_alert.py` — Core: send_alert() vía HTTP API
- `telegram_alerts/telegram_formatters.py` — Formatos HTML + emojis
- `telegram_alerts/telegram_config.py` — Carga `telegram_config.json`
- `telegram_alerts/event_router.py` — Lógica de throttle + routing

**Archivos a modificar:**
- `sono_bot_paper.py` — Añadir llamado a alert_router.process_scores() en cada ciclo

**Prueba manual:**
```bash
python -c "from telegram_alerts.telegram_alert import send_alert; send_alert('🧪 Test: Sono Pro alertas operativas')"
```

#### B. WebSocket Reconnect Robusto (P0 · 2-3h)

**Archivos a crear:**
- `frontend/src/hooks/useWebSocket.js` — Hook unificado con reconnect exponencial

**Archivos a modificar:**
- `frontend/src/hooks/useBinance.js` — Migrar a useWebSocket + mantener API pública igual
- `frontend/src/hooks/useMultiTicker.js` — Migrar a useWebSocket

**Criterio de éxito:**
- Reconexión automática tras caída de red (test: desconectar WiFi 30s)
- Indicador visual "stalled" si no hay datos >60s
- Log de reconexiones en consola

#### C. CI/CD Worker VIX (P0 · 1h)

**Archivos a crear:**
- `.github/workflows/deploy-vix-worker.yml`

**Archivos a modificar:**
- `vix-proxy-worker/wrangler.toml` — Añadir `[env.staging]` (opcional)

**Requisito previo:**
- Token `CF_API_TOKEN` en GitHub Secrets con permisos Workers + KV

---

### 🛠️ v1.6 — Refactor Técnico (Semana 1-2)

> Objetivo: Endurecer la base de código, eliminar deuda técnica

#### D. Refactor Score Unificado (P1 · 3-4h)

**Archivos a modificar:**
- `sono_bot_paper.py` — Reemplazar código score duplicado por import desde `sono_score.py`
- `sono_score.py` — Verificar que `compute_score()` acepta formato de velas de Binance (dict con open/high/low/close/volume)

**Validación:**
```bash
# Ambos deben dar el mismo score para los mismos datos
python -c "
from sono_score import compute_score as py_score
# ... mismo test que scoreEngine.js
"
```

#### E. Cleanup Dead Code (P1 · 1h)

**Archivos a mover a `_archived/`:**
- `sono_bot.py`
- `sono_bot_v2.py`
- `sono_bot_real.py`
- `sono_bot.log` (945KB — libera espacio)
- `sono_bot_v2.log`
- `sono_bot_real.log`

**Archivos a mover a `_archived/php/`:**
- `indicador-sono-repo/rangos.php`
- `indicador-sono-repo/trades.php`

**Backups a mover a `_archived/backups/`:**
- `backup_20260527_*`
- `backup_20260528_*`
- `backup_sono_*`
- `backup_working_20260527`
- `backup_sono_pre_mejoras_20260529_0928`

---

### 📊 v1.7 — Backtesting (Semana 2)

> Objetivo: Validar la estrategia de score con datos históricos

#### F. Backtesting Engine (P1 · 4-6h)

**Archivos a crear:**
- `backtest/__init__.py`
- `backtest/backtest_engine.py` — Core: carga datos → calcula score → genera trades
- `backtest/backtest_metrics.py` — Sharpe, Winrate, DD, Profit Factor
- `backtest/backtest_optimizer.py` — Grid search de pesos
- `backtest/backtest_visualizer.py` — Gráficos (equity curve, drawdown)

**Archivos a modificar:**
- `sono_score.py` — Extraer funciones helper para uso vectorizado

**Output esperado:**
```bash
python -m backtest.backtest_engine
# Resultado: 200 trades simulados
# Winrate: X%
# Profit Factor: X.XX
# Sharpe Ratio: X.XX
# Max Drawdown: X.X%
```

---

### 📈 v1.8 — Performance + PWA (Semana 2-3)

> Objetivo: Mejorar visibilidad de rendimiento y experiencia de usuario

#### G. Dashboard de Rendimiento (P2 · 5-7h)

**Archivos a crear:**
- `bot_stats/__init__.py`
- `bot_stats/stats_collector.py` — Recoge trades y genera stats.json
- `bot_stats/stats_server.py` — Opcional: servir stats.json vía HTTP mínimo

**Archivos a modificar:**
- `sono_bot_paper.py` — Llamar stats_collector en cada ciclo (después de trades)

**Output esperado:**
```json
# bot-stats.json generado automáticamente
```

#### H. Service Worker + PWA (P2 · 3-4h)

**Archivos a modificar:**
- `frontend/vite.config.js` — Añadir plugin VitePWA
- `frontend/public/manifest.json` — Crear manifest PWA

**Archivos a instalar:**
```bash
npm install vite-plugin-pwa --save-dev
```

**Criterio de éxito:**
- Lighthouse PWA audit pasa
- App instalable desde Chrome
- Carga offline de assets estáticos

---

### 🖥️ v1.9 — BotDashboard SPA (Semana 3)

> Objetivo: UI completa de rendimiento del bot

#### I. BotDashboard Page (P2 · 6-8h)

**Archivos a crear:**
- `frontend/src/pages/BotDashboardPage.jsx` — Página completa
- `frontend/src/hooks/useBotPerformance.js` — Fetch + cache de bot-stats.json
- `frontend/src/components/PnLChart.jsx` — Equity curve (Recharts)
- `frontend/src/components/TradeHistoryTable.jsx` — Tabla paginada de trades
- `frontend/src/components/PerformanceMetrics.jsx` — Cards métricas

**Archivos a modificar:**
- `frontend/src/AppRouter.jsx` — Añadir ruta `/bot` con lazy loading

**Métricas a mostrar:**
- Winrate (gráfico doughnut)
- Equity curve (line chart, 30d)
- Profit Factor
- Sharpe Ratio
- Max Drawdown
- Últimos 20 trades (tabla)
- Drawdown chart (area chart)

---

### 🔒 v2.0 — Real Trading Ready (Semana 3-4)

> Objetivo: Preparar todo para migración a real trading

#### J. Safety Guardian (P3 · 3-5h)

**Archivos a crear:**
- `telegram_alerts/safety_guardian.py` — Validación de trades
- `REQUISITOS_PRE_REAL.md` — Documento de condiciones pre-migración

**Archivos a modificar:**
- `sono_bot_paper.py` — Integrar SafetyGuardian (modo simulación primero)
- `telegram_alerts/` — Añadir comando /pause desde Telegram

#### K. Migración a Real Trading (P3 · 8-12h)

**Archivos a crear:**
- `sono_bot_real_controlled.py` — Bot real con Safety Guardian
- `pionex_credentials.json` — Ya existe, verificar permisos solo lectura

**Requisitos pre-migración:**
```markdown
1. ✅ Winrate ≥ 55% (backtesting con 200+ trades)
2. ✅ Profit Factor ≥ 1.5
3. ✅ Alertas Telegram probadas 7 días
4. ✅ Safety Guardian testeado en paper 50+ trades
5. ✅ Capital máximo por trade: $50
6. ✅ Circuit breaker: parar si -10% en 24h
7. ✅ Pausa manual desde Telegram
```

---

## Dependencias de Instalación

```bash
# Para v1.5 (Telegram alerts) — requests ya existe
pip install requests

# Para v1.7 (Backtesting) — pandas, numpy
pip install pandas numpy matplotlib

# Para v1.8 (PWA)
cd frontend && npm install vite-plugin-pwa --save-dev
```

---

## Estimación de Tiempos Totales

| Fase | Versión | Días estimados | Depende de |
|------|---------|----------------|------------|
| Quick Wins | v1.5 | 1-2 días | — |
| Refactor | v1.6 | 1-2 días | — |
| Backtesting | v1.7 | 2-3 días | v1.6 (score unificado) |
| Performance | v1.8 | 2-3 días | — |
| BotDashboard | v1.9 | 2-3 días | v1.7 (stats.json) |
| Real Trading | v2.0 | 3-5 días | v1.5, v1.7, v1.9 |

**Total estimado**: 11-18 días hábiles (3-4 semanas)

---

## Resumen Ejecutivo

```
Semana 1:  v1.5 Alertas + WebSocket + CI/CD  →  🚀 Estabilización
           v1.6 Refactor score + cleanup       →  🛠️ Base sólida

Semana 2:  v1.7 Backtesting engine             →  📊 Validación estratégica
           v1.8 Performance + PWA              →  ⚡ UX mejorada

Semana 3:  v1.9 BotDashboard SPA               →  📈 Visibilidad
           v2.0 Safety + Real Trading Ready    →  🔒 Preparación real
```

---

## Handoff

Este plan está listo para ejecución por @builder.
Cada versión tiene sus propios archivos afectados y criterios de éxito claros.
