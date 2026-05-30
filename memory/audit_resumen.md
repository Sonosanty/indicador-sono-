# Auditoría Profunda 30 Mayo 2026 — Resultados

## 🔴 Hallazgos críticos encontrados y corregidos

### 1. App.jsx — Dead Code (router duplicado)
- **Encontrado**: App.jsx (1.4 KB) no era importado por nadie. main.jsx importa AppRouter.jsx.
- **Acción**: ✅ Eliminado. Se movió a App.jsx.eliminado por si se necesita referencia.

### 2. computeScore DUPLICADO en DOS engines
- **Encontrado**: `scoreEngine.js` (usa config JSON) no es importado por NADIE en frontend
- **Todos los imports** van a `indicators.js` (thresholds hardcodeados)
- `sono-score-config.json` ignorado por el frontend en runtime
- **5 funciones duplicadas**: calcMA, calcRSI, calcBB, calcATR, calcADX idénticas en ambos archivos
- **Acción**: ⚠️ **PENDIENTE** — requiere refactor engineering. Pendiente de decisión.

### 3. Archivos .bak en producción (3)
- **Encontrado**: `useBinance.js.bak`, `MetodoPage.jsx.bak`, `TradesPage.jsx.bak` (53 KB total)
- **Acción**: ✅ Eliminados

### 4. Componentes no usados
- **MetricCard.jsx/.css** — 0 imports
- **CandleChart.jsx** — 0 imports
- **services/** — directorio vacío
- **Acción**: ✅ Eliminados

### 5. recharts en package.json (NO usado)
- Dependencia `^3.8.1` nunca importada en código. Solo usa chart.js
- **Acción**: ⚠️ **PENDIENTE** — requiere `npm uninstall recharts`

### 6. CSS scrollbar duplicado
- Definido en theme.css (8px) y pages.css (6px)
- **Acción**: ✅ Unificado en theme.css, eliminado de pages.css

### 7. AgentsPage .reverse() mutante
- `lastActions.reverse()` mutaba el array original en el render
- **Acción**: ✅ Corregido a `.slice().reverse()`

### 8. Git sincronizado y limpio
- backup_20260527_2100/ eliminado del repo
- Scripts _*.py movidos a scripts/
- .gitignore mejorado (venv, __pycache__, workspace files, backup_*)
- .wrangler/ ahora ignorado

### 9. 47 backups de openclaw.json eliminados (142 KB)
- Solo conservados los 5 más recientes

### 10. 29 scripts movidos a tests/, 9 a utils/
- Raíz del workspace reducida de 101 a ~63 archivos

## 🔴 Pendiente crítico para decidir
- **Unificar scoreEngine.js** — El frontend ignora el JSON config. scoreEngine.js es un motor muerto. Hay que decidir: ¿unificar en scoreEngine.js o eliminar y dejar solo indicators.js?

## Estado post-auditoría
- Build: ✅ OK (409ms)
- Deploy: ✅ Producción activa (hash 968f1073)
- Producción: ✅ indicador-sono.pages.dev — BTC $73,929 (+1.17%)
- Git: ✅ Sincronizado, commits pusheados
- JSON config: ✅ Válido y completo
