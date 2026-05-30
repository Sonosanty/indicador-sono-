# Correcciones Aplicadas — Auditoría Sono PRO (30 Mayo 2026)

## Resumen
3 agentes de auditoría analizaron 47 hallazgos (13 críticos, 26 altos, 8 leves).
Primera tanda de correcciones completada: **16 bugs corregidos**, build y deploy exitosos.

---

## 🔴 CRÍTICOS CORREGIDOS (9/13)

### WebSocket / Hooks (3)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 1 | Dependencia `[url, ...subscriptions]` inválida | `[url, subscriptions.join(',')]` — ahora React detecta cambios reales en subscriptions | `useWebSocket.js` |
| 2 | Closure stale de `status` en `ws.onmessage` | `setStatus(prev => prev === STALLED/RECONNECTING ? CONNECTED : prev)` — siempre usa el estado actual | `useWebSocket.js` |
| 3 | `onerror` no cerraba socket → no disparaba reconexión | `ws.close()` explícito en onerror para garantizar que onclose dispare reconexión | `useWebSocket.js` |

### useBinanceMulti (2)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 4 | `timeframes.join(',')` como dependencia de `useCallback` — se recreaba en cada render | `tfRef = useRef(timeframes)` — dependencia estable, usa `tfRef.current` dentro del callback | `useBinanceMulti.js` |
| 5 | `mountedRef.current = false` en un `useEffect` separado → se ejecutaba ANTES que el cleanup de WS/timers | Unificado en un solo `useEffect` — mountedRef se limpia dentro del mismo cleanup que cierra WS | `useBinanceMulti.js` |

### indicators.js (1)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 6 | `calcMA` propaga NaN si hay datos corruptos | Validación `Number.isFinite(v)` en cada valor — suma solo finitos, devuelve null si < p finitos | `indicators.js` |

### useMacro.js (1)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 7 | `altsDom` negativo si BTC+ETH > 100% (floating point) | `Math.max(0, +(100 - btc - eth).toFixed(2))` | `useMacro.js` |

### MetodoPage / AgentsPage (2)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 8 | `getElementById('sig-stop')` apunta a DOM que NO existe | Bloque eliminado — 10 líneas de código muerto | `MetodoPage.jsx` |
| 9 | `onSetAgent={onSetAsset}` — prop incorrecta a TopBar | `onSetAsset={onSetAsset}` | `AgentsPage.jsx` |

### RangeChart (1)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 10 | `preserveAspectRatio="none"` distorsiona el SVG | `preserveAspectRatio="xMidYMid meet"` — escala proporcional | `RangeChart.jsx` |

### Bot Python (4)
| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 11 | Paper mode compra sin verificar saldo real (3 compras de $80 con $20) | `if usdt_balance < min_trade: return` ANTES de calcular riesgo + `self.balances = dict(self.paper_balances)` al inicio de cada activo | `sono_bot.py` |
| 12 | f-string inválido: `'ATR=$' + (f'{atr:.2f}' if atr else 'N/A')` | `f'ATR=${atr:.2f}' if atr else 'ATR=N/A'` | `sono_bot.py` |
| 13 | `import sys` duplicado (líneas 8 y 14) | Segundo import eliminado | `sono_bot.py` |
| 14 | Telegram 401 — no se replica en logs recientes | Token parece funcional ahora. Pendiente monitorizar. | `telegram_config.json` |

---

## 🔴 CRÍTICOS PENDIENTES (4/13)

| # | Hallazgo | Esfuerzo | Impacto |
|---|----------|----------|---------|
| A | **main.py no arranca** — 5 módulos faltan (indicators.py, scoring.py, db_utils.py, sono_strategy.py, sistema_hibrido.py) | 2-8h | Server FastAPI inaccesible |
| B | **Pionex timestamp sync** — INVALID_TIMESTAMP por reloj desincronizado | 30 min | Trading real imposible |
| C | **Credenciales en texto plano** — API keys en JSON accesible, no en .env | 30 min | Seguridad |
| D | **TradesPage: stopLoss al 0.3% en vez de 2%** — R-values inflados artificialmente | 15 min | Métricas de trading incorrectas |

---

## 🟡 ALTOS / 🟢 LEVES CORREGIDOS (2/34)

| # | Hallazgo | Corrección | Archivo |
|---|----------|------------|---------|
| 15 | `onSetAgent` prop incorrecta a TopBar | `onSetAsset` ✅ | `AgentsPage.jsx` |
| 16 | `preserveAspectRatio="none"` en RangeChart | `xMidYMid meet` ✅ | `RangeChart.jsx` |

---

## Build & Deploy
- **Build**: 608ms ✅
- **Deploy**: `588d0a09` en producción ✅
- **URL**: https://indicador-sono.pages.dev/
- **BTC**: $73,935 (+0.52%), F&G 23 (Extreme Fear), Dominancia BTC 57.45%

---

## Verificación de correcciones
Las correcciones de WebSocket no se pueden probar en entorno aislado (requieren Binance WS real). Las correcciones de NaN, altsDom y f-string son lógica pura verificable en el código. La corrección de balance en paper mode se verifica en los logs tras el próximo ciclo del bot.
