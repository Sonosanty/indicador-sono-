# 📋 Decisión: scoreEngine.js

**Fecha:** 30 Mayo 2026

## Diagnóstico
- `scoreEngine.js` no es importado por NADIE en el frontend (0 referencias)
- El frontend usa `indicators.js` (5 archivos lo importan: RangeChart, useScore, RangesPage, TradesPage, MetodoPage)
- El bot Python usa `sono_score.py`, tiene su propio `computeScore` wrapper
- `sono-score-config.json` (el JSON unificado) nunca es leído por el frontend

## Decisión
❌ **ELIMINAR** `scoreEngine.js` del frontend.

**Razones:**
1. Es código muerto verificable — 0 imports en runtime
2. El bot ya tiene su propio motor (`sono_score.py`)
3. No hay divergencia de lógica porque scoreEngine.js nunca se ejecuta
4. Mantenerlo es ruido que confunde (como ya pasó en la auditoría)

**El JSON de configuración (`sono-score-config.json`)** se conserva como referencia/documentación de los thresholds. Si en el futuro se decide unificar, el JSON ya está listo.

## Acción
- Mover `scoreEngine.js` a `scoreEngine.js.eliminado` (por si se necesita como referencia)
- Mantener `indicators.js` como el motor activo del frontend
- Mantener `sono-score-config.json` como documentación
