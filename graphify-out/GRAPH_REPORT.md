# Graph Report - .  (2026-06-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 981 nodes · 1330 edges · 104 communities (82 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aa1ab77c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Trading Indicators|Trading Indicators]]
- [[_COMMUNITY_External Data APIs|External Data APIs]]
- [[_COMMUNITY_Pionex Bot Client|Pionex Bot Client]]
- [[_COMMUNITY_Core Trading Logic|Core Trading Logic]]
- [[_COMMUNITY_Scoring Engine|Scoring Engine]]
- [[_COMMUNITY_Data Fetch Utilities|Data Fetch Utilities]]
- [[_COMMUNITY_Config & Indicators|Config & Indicators]]
- [[_COMMUNITY_App Fetch Controller|App Fetch Controller]]
- [[_COMMUNITY_HTML Builder|HTML Builder]]
- [[_COMMUNITY_Cloudflare Worker|Cloudflare Worker]]
- [[_COMMUNITY_HTML ID Fixer|HTML ID Fixer]]
- [[_COMMUNITY_Method Application|Method Application]]
- [[_COMMUNITY_Metodo Replacement|Metodo Replacement]]
- [[_COMMUNITY_Final Patch Apply|Final Patch Apply]]
- [[_COMMUNITY_HTML Audit|HTML Audit]]
- [[_COMMUNITY_Buffer Fix|Buffer Fix]]
- [[_COMMUNITY_Metodo Mapping|Metodo Mapping]]
- [[_COMMUNITY_Raw File Fix|Raw File Fix]]
- [[_COMMUNITY_CRLF Fix|CRLF Fix]]
- [[_COMMUNITY_Resilient Rebuild|Resilient Rebuild]]
- [[_COMMUNITY_State Management|State Management]]
- [[_COMMUNITY_Python Score Maestro|Python Score Maestro]]
- [[_COMMUNITY_Advanced Scoring|Advanced Scoring]]
- [[_COMMUNITY_Original Clean Fix|Original Clean Fix]]
- [[_COMMUNITY_VIX Proxy v4|VIX Proxy v4]]
- [[_COMMUNITY_VIX Proxy Worker|VIX Proxy Worker]]
- [[_COMMUNITY_Ajram HTML Check|Ajram HTML Check]]
- [[_COMMUNITY_Final Sono Fix|Final Sono Fix]]
- [[_COMMUNITY_Ajram HTML Insert|Ajram HTML Insert]]
- [[_COMMUNITY_Metodo Restore|Metodo Restore]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_Sono All Fix|Sono All Fix]]
- [[_COMMUNITY_Ajram Merge Clean|Ajram Merge Clean]]
- [[_COMMUNITY_Inline Rebuild|Inline Rebuild]]
- [[_COMMUNITY_Ajram Rename|Ajram Rename]]
- [[_COMMUNITY_Precise Sono Fix|Precise Sono Fix]]
- [[_COMMUNITY_Quotes Fix|Quotes Fix]]
- [[_COMMUNITY_Ajram Patch|Ajram Patch]]
- [[_COMMUNITY_Sono HTML Rebuild|Sono HTML Rebuild]]
- [[_COMMUNITY_Snapshot Storage|Snapshot Storage]]
- [[_COMMUNITY_JS Syntax Final Fix|JS Syntax Final Fix]]
- [[_COMMUNITY_Resilient v2 Fix|Resilient v2 Fix]]
- [[_COMMUNITY_Lazy Chart|Lazy Chart]]
- [[_COMMUNITY_Ajram Check|Ajram Check]]
- [[_COMMUNITY_Corruption Fix|Corruption Fix]]
- [[_COMMUNITY_Final FU Fix|Final FU Fix]]
- [[_COMMUNITY_Inline Sono Fix|Inline Sono Fix]]
- [[_COMMUNITY_Lines Fix|Lines Fix]]
- [[_COMMUNITY_Hooks Injection|Hooks Injection]]
- [[_COMMUNITY_Dollar Sign Fix|Dollar Sign Fix]]
- [[_COMMUNITY_Inline Sono Fix 2|Inline Sono Fix 2]]
- [[_COMMUNITY_Sono Audit|Sono Audit]]
- [[_COMMUNITY_STX Clean|STX Clean]]
- [[_COMMUNITY_Debug Line FU|Debug Line FU]]
- [[_COMMUNITY_Binance Proxy Fix|Binance Proxy Fix]]
- [[_COMMUNITY_Init Catch Fix|Init Catch Fix]]
- [[_COMMUNITY_Inline Sono Fix 3|Inline Sono Fix 3]]
- [[_COMMUNITY_Ajram Locate|Ajram Locate]]
- [[_COMMUNITY_Hybrid Verify|Hybrid Verify]]
- [[_COMMUNITY_Production Check|Production Check]]
- [[_COMMUNITY_Fix7 Done|Fix7 Done]]
- [[_COMMUNITY_JS Syntax Fix|JS Syntax Fix]]
- [[_COMMUNITY_Sono Method Hook Fix|Sono Method Hook Fix]]
- [[_COMMUNITY_STX Syntax Fix|STX Syntax Fix]]
- [[_COMMUNITY_Load Test|Load Test]]
- [[_COMMUNITY_Binance Proxy Verify|Binance Proxy Verify]]
- [[_COMMUNITY_CSP Routes Verify|CSP Routes Verify]]
- [[_COMMUNITY_Deploy Verify|Deploy Verify]]
- [[_COMMUNITY_Final Verify|Final Verify]]
- [[_COMMUNITY_Lazy Verify|Lazy Verify]]
- [[_COMMUNITY_STX Verify|STX Verify]]
- [[_COMMUNITY_Basic Worker|Basic Worker]]
- [[_COMMUNITY_CSP Headers Fix|CSP Headers Fix]]
- [[_COMMUNITY_JS Cache Verify|JS Cache Verify]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Binance Data|Binance Data]]
- [[_COMMUNITY_Sono Engine|Sono Engine]]
- [[_COMMUNITY_Macro Data|Macro Data]]
- [[_COMMUNITY_Service Worker|Service Worker]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 31 edges
2. `fetchWithTimeout()` - 20 edges
3. `refreshIndicators()` - 18 edges
4. `SonoStrategy` - 17 edges
5. `refreshIndicators()` - 14 edges
6. `SonoBot` - 14 edges
7. `updAll()` - 12 edges
8. `fU()` - 11 edges
9. `loadTicker()` - 11 edges
10. `Store` - 11 edges

## Surprising Connections (you probably didn't know these)
- `frontend/metodo.html` --references--> `js/indicators/ma.js`  [INFERRED]
  frontend/metodo.html → js/indicators/ma.js
- `frontend/metodo.html` --references--> `js/indicators/rsi.js`  [INFERRED]
  frontend/metodo.html → js/indicators/rsi.js
- `frontend/metodo.html` --references--> `js/indicators/adx.js`  [INFERRED]
  frontend/metodo.html → js/indicators/adx.js
- `frontend/metodo.html` --references--> `js/indicators/bb.js`  [INFERRED]
  frontend/metodo.html → js/indicators/bb.js
- `frontend/range_explorer.html` --references--> `js/indicators/ranges.js`  [INFERRED]
  frontend/range_explorer.html → js/indicators/ranges.js

## Import Cycles
- None detected.

## Communities (104 total, 22 thin omitted)

### Community 0 - "Trading Indicators"
Cohesion: 0.07
Nodes (75): addAlert(), addLog(), adxL(), adxLast(), allTrades, applyFilter(), atrCalc(), bbL() (+67 more)

### Community 1 - "External Data APIs"
Cohesion: 0.06
Nodes (52): Alternative.me API, Binance API, CoinGecko API, KuCoin API, VIX Proxy Worker, ADX (14), Bollinger %B, Cloudflare Pages (+44 more)

### Community 2 - "Pionex Bot Client"
Cohesion: 0.05
Nodes (45): computeScore(), fetch_candles(), fetch_ticker(), get_balances(), get_open_orders(), pionex_get(), pionex_post(), _pionex_sig() (+37 more)

### Community 3 - "Core Trading Logic"
Cohesion: 0.08
Nodes (49): addLog(), adxL(), allTrades, atrCalc(), bbL(), buildRow(), bus, calcRActual() (+41 more)

### Community 4 - "Scoring Engine"
Cohesion: 0.07
Nodes (28): Any, calculate_advanced_score(), scoring.py — Motor de scoring avanzado. Soporta kwargs-style desde main.py., Calcula score multi-factor. Acepta DataFrame o kwargs individuales.          Arg, BacktesterSono, print_gorgeous_report(), BACKTESTER_SONO.PY (FINO EDITION 👒) Simulador Cuantitativo de Alto Rendimiento p, Imprime el informe institucional del backtest en consola de forma hermosa (+20 more)

### Community 5 - "Data Fetch Utilities"
Cohesion: 0.11
Nodes (25): createSWRCache(), fetchWithTimeout(), buildResult(), DEFAULTS, fetchGlobalData(), fetchKlinesBackground(), fetchMacroOnly(), fetchMarketData() (+17 more)

### Community 6 - "Config & Indicators"
Cohesion: 0.11
Nodes (16): ASSET_KEYS, ASSETS, SCORE_BARRERAS, SCORE_LABELS, SCORE_PESOS, SWR_TTLS_MS, TIMEFRAMES, adx() (+8 more)

### Community 7 - "App Fetch Controller"
Cohesion: 0.14
Nodes (25): ax(), bb(), cs(), fetchAll(), fetchFg(), fetchUrl(), fk(), fl() (+17 more)

### Community 8 - "HTML Builder"
Cohesion: 0.10
Nodes (20): bodyEnd, concept, conceptBody, conceptStyle, { execSync }, firstLineEnd, fs, headClose (+12 more)

### Community 9 - "Cloudflare Worker"
Cohesion: 0.22
Nodes (17): CORS, fetch(), adx(), ASSETS, bb(), computeScore(), fetchCandles(), fetchMacro() (+9 more)

### Community 10 - "HTML ID Fixer"
Cohesion: 0.12
Nodes (16): afterLastRow, beforeSysCard, beforeSysLog, fs, html, lastSysRow, missing, newRows (+8 more)

### Community 11 - "Method Application"
Cohesion: 0.12
Nodes (15): bodyEnd, closeMet, conceptHtml, { execSync }, fs, h2, html, j2 (+7 more)

### Community 12 - "Metodo Replacement"
Cohesion: 0.12
Nodes (15): bodyEnd, checkIds, concept, conceptBody, conceptStyle, fs, headClose, html (+7 more)

### Community 13 - "Final Patch Apply"
Cohesion: 0.14
Nodes (13): be, conceptHtml, { execSync }, fs, html, hv, js, jv (+5 more)

### Community 14 - "HTML Audit"
Cohesion: 0.14
Nodes (13): common, css, cssRules, defs, files, fs, html, htmlIdAttrs (+5 more)

### Community 15 - "Buffer Fix"
Cohesion: 0.14
Nodes (12): buf, fs, outStr, result, ve, vf, vk1, vk2 (+4 more)

### Community 16 - "Metodo Mapping"
Cohesion: 0.15
Nodes (12): allJsIds, fs, getCalls, html, htmlIds, js, metEnd, metIdx (+4 more)

### Community 17 - "Raw File Fix"
Cohesion: 0.17
Nodes (11): fs, html, lines, ve, vf, vk1, vk2, vk3 (+3 more)

### Community 18 - "CRLF Fix"
Cohesion: 0.17
Nodes (11): fKlineStart, fs, fUpos, html, lines, pnlpos, ve, vf (+3 more)

### Community 19 - "Resilient Rebuild"
Cohesion: 0.17
Nodes (11): b1, cfgIdx, fs, html, initBlock, INPUT, OUTPUT, path (+3 more)

### Community 21 - "Python Score Maestro"
Cohesion: 0.26
Nodes (10): calc_adx(), calc_atr(), calc_bb(), calc_ma(), calc_rsi(), classify_score(), compute_score(), sono_score.py — Score Maestro UNIFICADO (bot Python) Lee umbrales/pesos desde so (+2 more)

### Community 22 - "Advanced Scoring"
Cohesion: 0.23
Nodes (11): calculate_advanced_score(), calculate_momentum_score(), calculate_trend_score(), calculate_volatility_score(), get_market_state(), SCORING.PY Sistema avanzado de scoring de 0-100 para evaluar el estado del merca, Calcula la puntuacion de momentum (0 a 100).     RSI sobrevendido suma puntos pa, Mapea el score acumulado (0-100) a un estado comprensible y una accion recomenda (+3 more)

### Community 23 - "Original Clean Fix"
Cohesion: 0.18
Nodes (10): fKok, fs, fUok, html, lines, vE, vF, vL (+2 more)

### Community 24 - "VIX Proxy v4"
Cohesion: 0.51
Nodes (10): CORS, fetch(), handleBinanceKlines(), handleBinancePrice(), handleBinanceTicker(), handleEUR(), handleGlobal(), handleVIX() (+2 more)

### Community 25 - "VIX Proxy Worker"
Cohesion: 0.51
Nodes (10): CORS, fetch(), handleBinanceKlines(), handleBinancePrice(), handleBinanceTicker(), handleEUR(), handleGlobal(), handleVIX() (+2 more)

### Community 26 - "Ajram HTML Check"
Cohesion: 0.20
Nodes (9): fs, h, hasAjram, hasAjramComment, hasCalc, hasEstrategias, mEnd, metodoSection (+1 more)

### Community 27 - "Final Sono Fix"
Cohesion: 0.20
Nodes (9): eb, fs, html, kh, lf, lines, ph, pnlIdx (+1 more)

### Community 28 - "Ajram HTML Insert"
Cohesion: 0.20
Nodes (9): ajramSection, ajramSectionStart, cleanHtml, cleanMetodoClose, cleanRangosOpen, fs, pageMetodoClose, pageRangosOpen (+1 more)

### Community 29 - "Metodo Restore"
Cohesion: 0.20
Nodes (9): be, conceptHtml, fs, html, metIdx, pageOpen, tradesCommentStart, tradesIdx (+1 more)

### Community 30 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, categories, description, display, icons, name, short_name, start_url (+1 more)

### Community 31 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, categories, description, display, icons, name, short_name, start_url (+1 more)

### Community 32 - "Sono All Fix"
Cohesion: 0.22
Nodes (8): fKStart, fs, html, lines, pFU, pnlIdx, vp, vu

### Community 33 - "Ajram Merge Clean"
Cohesion: 0.22
Nodes (8): ajramCode, ajramStart, fixedJs, fs, insertPoint, js, patchContent, withScore

### Community 34 - "Inline Rebuild"
Cohesion: 0.22
Nodes (8): chk, css, fs, html, js, reCSS, reJS, result

### Community 35 - "Ajram Rename"
Cohesion: 0.22
Nodes (7): fs, hr, html, htmlReps, jr, js, jsReps

### Community 37 - "Precise Sono Fix"
Cohesion: 0.25
Nodes (7): fs, html, lastBlock, lines, positions, vp, vu

### Community 38 - "Quotes Fix"
Cohesion: 0.25
Nodes (7): fKIdx, fs, fUIdx, html, lines, vP, vU

### Community 39 - "Ajram Patch"
Cohesion: 0.25
Nodes (7): { execSync }, fs, html, htmlPath, js, jsPath, path

### Community 40 - "Sono HTML Rebuild"
Cohesion: 0.25
Nodes (7): eurLineRaw, fKLineRaw, fs, fULineRaw, html, pnlFullLineRaw, pnlLineRaw

### Community 41 - "Snapshot Storage"
Cohesion: 0.25
Nodes (7): get_historical_snapshots(), get_latest_snapshot(), db_utils.py — Almacenamiento de snapshots (JSON file)., Guarda snapshot en JSON., Obtiene ultimo snapshot., Obtiene historial de snapshots., save_snapshot()

### Community 42 - "JS Syntax Final Fix"
Cohesion: 0.29
Nodes (5): cleaner, fs, js, lines, output

### Community 43 - "Resilient v2 Fix"
Cohesion: 0.29
Nodes (5): checks, fs, html, INPUT, path

### Community 44 - "Lazy Chart"
Cohesion: 0.29
Nodes (6): cleaned, { execSync }, fs, html, js, showPageFn

### Community 45 - "Ajram Check"
Cohesion: 0.33
Nodes (5): e, fs, h, s, sec

### Community 46 - "Corruption Fix"
Cohesion: 0.33
Nodes (5): dollarSigns, fs, fUcheck, html, stats

### Community 47 - "Final FU Fix"
Cohesion: 0.33
Nodes (5): fs, html, lines, vp, vu

### Community 48 - "Inline Sono Fix"
Cohesion: 0.33
Nodes (5): corruptedLines, eurIdx, fs, html, lines

### Community 49 - "Lines Fix"
Cohesion: 0.33
Nodes (5): fs, html, lines, vp, vu

### Community 50 - "Hooks Injection"
Cohesion: 0.33
Nodes (5): { execSync }, fs, funcs, js, jv

### Community 51 - "Dollar Sign Fix"
Cohesion: 0.40
Nodes (4): fs, html, v1, v3

### Community 52 - "Inline Sono Fix 2"
Cohesion: 0.40
Nodes (4): fs, html, lines, stats

### Community 53 - "Sono Audit"
Cohesion: 0.67
Nodes (3): fetchRaw(), https, main()

### Community 54 - "STX Clean"
Cohesion: 0.50
Nodes (3): brokenJs, fs, js

### Community 55 - "Debug Line FU"
Cohesion: 0.50
Nodes (3): fs, html, lines

### Community 56 - "Binance Proxy Fix"
Cohesion: 0.50
Nodes (3): fs, js, klinesIdx

### Community 57 - "Init Catch Fix"
Cohesion: 0.50
Nodes (3): fs, initStart, js

### Community 58 - "Inline Sono Fix 3"
Cohesion: 0.50
Nodes (3): fs, html, stats

### Community 59 - "Ajram Locate"
Cohesion: 0.50
Nodes (3): fs, h, idx

## Knowledge Gaps
- **404 isolated node(s):** `CFG`, `S`, `fs`, `html`, `conceptHtml` (+399 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compute_score()` connect `Python Score Maestro` to `Pionex Bot Client`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `SonoStrategy` (e.g. with `Any` and `BacktesterSono`) actually correct?**
  _`SonoStrategy` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CFG`, `S`, `fs` to the rest of the system?**
  _463 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Trading Indicators` be split into smaller, more focused modules?**
  _Cohesion score 0.06635802469135803 - nodes in this community are weakly interconnected._
- **Should `External Data APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.05505952380952381 - nodes in this community are weakly interconnected._
- **Should `Pionex Bot Client` be split into smaller, more focused modules?**
  _Cohesion score 0.0523532522474881 - nodes in this community are weakly interconnected._
- **Should `Core Trading Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.07987012987012987 - nodes in this community are weakly interconnected._