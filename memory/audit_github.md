# Auditoría del Repositorio GitHub: Sonosanty/indicador-sono-

**Fecha:** 2026-05-30  
**URL:** https://github.com/Sonosanty/indicador-sono-  
**Branch por defecto:** `main`  
**Branches adicionales:** `worker-vix`  
**Owner:** Sonosanty (sonosanty@gmail.com)  
**Repo Público:** Sí  
**Último commit:** Hoy mismo (2026-05-30T14:34Z)

---

## 1. Resumen General

Es un repositorio **activo** (todavía se hacen commits hoy), **sin releases/tags**, que contiene una suite de trading cuantitativo para Bitcoin con:

- Backend Python (FastAPI, WebSockets, scoring, trading bot)
- Frontend React/Vite (Cloudflare Pages deploy)
- Scripts de auditoría/seguridad para OpenClaw
- Documentación extensa en `.md`

---

## 2. Estructura de Archivos (branch `main`)

### 📁 Raíz del proyecto — Archivos núcleo del proyecto

| Archivo | Tamaño | Estado |
|---|---|---|
| `main.py` | 16.5 KB | ✅ Central — FastAPI server |
| `indicators.py` | 6.5 KB | ✅ Motor de indicadores técnicos |
| `scoring.py` | 7.7 KB | ✅ Motor de scoring de confluencia |
| `sono_score.py` | 6.3 KB | ✅ Score engine unificado (v2) |
| `sono_bot.py` | 24.6 KB | ✅ Bot de trading en Paper Mode |
| `telegram_alerts.py` | 12.0 KB | ✅ Módulo de alertas Telegram |
| `backtester_sono.py` | 13.1 KB | ✅ Backtester |
| `requirements.txt` | 124 B | ✅ Dependencias Python |
| `historico.json` | 359 KB | ✅ Dataset histórico de snapshots |
| `analyze_history.py` | 1.7 KB | ✅ Script análisis histórico |
| `analyze_patterns.py` | 3.3 KB | ✅ Script patrones de mercado |
| `apptest.js` | 16.4 KB | ✅ Script de testing JS |
| `_check_balance.py` | 1.7 KB | ⚠️ Script helper con prefijo `_` |
| `_check_key.py` | 850 B | ⚠️ Script helper con prefijo `_` |
| `_check_pionex.py` | 773 B | ⚠️ Script helper con prefijo `_` |
| `_fix_sell.py` | 1.6 KB | ⚠️ Script helper one-off |
| `_proyeccion.py` | 3.2 KB | ⚠️ Script helper one-off |
| `_sell_sol.py` | 1.2 KB | ⚠️ Script helper one-off |

### 📁 Archivos de configuración / identidad / documentación raíz

| Archivo | Tamaño | Nota |
|---|---|---|
| `.gitignore` | 194 B | ✅ Presente (ver sección 5) |
| `AGENTS.md` | 7.8 KB | Plantilla de workspace para el agente |
| `MEMORY.md` | 4.4 KB | Memoria del agente |
| `SOUL.md` | 1.8 KB | Identidad del agente |
| `IDENTITY.md` | 686 B | Identidad adicional |
| `USER.md` | 525 B | Perfil de usuario |
| `TOOLS.md` | 920 B | Notas de herramientas |
| `HEARTBEAT.md` | 15 B | Archivo heartbeat (casi vacío) |
| `README.md` | 6.4 KB | ✅ Readme del proyecto |
| `CHANGELOG.md` | 971 B | ✅ Historial de cambios |
| `Manual_v5_extracted.txt` | 7.3 KB | Manual extraído |
| `SonoProTerminal_monolith_ref.jsx` | 48 KB | ⚠️ Monolito JSX de referencia |
| `ANALISIS_DASHBOARD_V2_PRO.md` | 19.6 KB | Documento de análisis |
| `ANALISIS_TECNICO_BTC.md` | 21.3 KB | Documento de análisis |
| `ULTRAFINO_MEJORAS_DOCUMENTO_MAESTRO_2026.md` | 10.2 KB | Documento de planificación |
| `analisis_macro.md` | 12.2 KB | Análisis macroeconómico |
| `analisis_range.md` | 9.1 KB | Análisis de rangos |
| `analisis_trades.md` | 13.2 KB | Análisis de trades |

### 📂 `agents/` — Skills/agentes OpenClaw

- `ultrafino-amazon/SOUL.md`
- `ultrafino-analista/SOUL.md`
- `ultrafino-blog/SOUL.md`
- `ultrafino-ecommerce/SOUL.md`
- `ultrafino-seo/SOUL.md`

### 📂 `audit/` — Scripts de hardening y configuración

- `ARQUITECTURA_DIAGRAMA.svg` — Diagrama de arquitectura
- `MANUAL_TÉCNICO_COMPLETO.md` + `.docx` — ⚠️ **Duplicado** (mismo contenido en 2 formatos)
- `SECURITY_HARDENING.md`
- `TROUBLESHOOTING_GUIDE.md`
- `checklists/checklists_master.md`
- `configs/` — `.env.template`, `firewall-rules.json`, `nginx.conf`, `openclaw.json`
- `scripts/` — 8 scripts PowerShell para backup, diagnóstico, hardening, health-check, instalación

### 📂 `frontend/` — Dashboard React/Vite (Cloudflare Pages)

- `index.html`, `vite.config.js`, `package.json`, `_routes.json`, `eslint.config.js`
- `src/` con estructura React (componentes, hooks, páginas)

### 📂 `backup_20260527_2100/` — **⚠️ Backup embebido en el repo**

- `dashboard_sono/index.html` (3.7 KB)
- `index.html` (1.5 KB)
- `trades/index.html` (3.2 KB)

### 🔗 Submódulo: `addyosmani-skills`

- Es un **submódulo git** (`mode: 160000`), apunta a un commit externo.

---

## 3. Commits y Actividad

**Total commits en `main`:** ~30 (según API, varios más de los 30 mostrados)  
**Rango de fechas:** 26 May 2026 – 30 May 2026 (¡solo 5 días de historia!)

### Últimos commits significativos:

| Fecha | Autor | Mensaje |
|---|---|---|
| 30 May 14:34 | Sonosanty | `chore: add .gitignore` |
| 30 May 11:53 | Fino | `v1.5: Telegram alerts, WebSocket robusto, cleanup bot...` |
| 29 May 17:41 | Fino | `clean: remove redundant GitHub Actions workflow` |
| 29 May 17:27 | Fino | `fix: workflow CI build+deploy a Pages` |
| 29 May 17:26 | Fino | `v2: score unificado + lazy loading + SWR/TTL + auto-deploy CI` |
| ... y más hacia atrás |

**Autores:** 2 personas — **Fino** (fino@ultrafino.com) y **Sonosanty** (sonosanty@gmail.com).  
**Firma:** Todos los commits son **unsigned** (no verificados).  
**Branch protegido:** No.

---

## 4. Branch `worker-vix`

Branch independiente para un **Cloudflare Worker VIX**:

```
worker-vix/
├── .gitignore         (11 B — mínimo)
├── .wrangler/cache/
│   └── wrangler-account.json   (112 B — ⚠️ cache local trackeada)
├── src/
│   └── worker.js      (5.6 KB)
└── wrangler.toml      (158 B)
```

**Problemas:**
- `.wrangler/cache/wrangler-account.json` está trackeado en git — debería estar en `.gitignore`
- El `.gitignore` del branch solo tiene 11 bytes, probablemente vacío o insuficiente

---

## 5. GitHub Actions

**Workflows activos: 0**

El commit `cbf5ef2ce89` (29 May) eliminó el workflow CI/CD de GitHub Actions porque ahora usa **Cloudflare Pages con integración nativa Git** (auto-deploy desde el repo). Esto es correcto.

**Anteriormente había:** Un workflow CI para build + deploy a Pages (Node 22). Ahora no hay ninguno.

---

## 6. Issues

**Issues abiertos: 0** — Issues cerrados: 0 — Ninguna actividad en issues.

---

## 7. Hallazgos Críticos

### 🔴 Archivos huérfanos / scripts de uso puntual (`_` prefijo)

Seis scripts con prefijo `_` en la raíz (`_check_balance.py`, `_check_key.py`, `_check_pionex.py`, `_fix_sell.py`, `_proyeccion.py`, `_sell_sol.py`). Son **helpers de diagnóstico/one-off** que no deberían estar en el repo o deberían vivir en un subdirectorio `scripts/` o `tools/`. Contaminan la raíz del proyecto.

### 🔴 Backup embebido en el repo

`backup_20260527_2100/` es un snapshot de backup subido al repositorio. Esto infla el historial de git innecesariamente y debería eliminarse (el backup debe estar fuera del repo o en un release).

### 🔴 Archivos no mencionados en README que deberían estarlo

El README menciona `main.py`, `indicators.py`, `scoring.py`, `requirements.txt` e `historico.json`, pero **no** menciona:
- `sono_bot.py` — Componente crítico (bot de trading)
- `telegram_alerts.py` — Funcionalidad clave
- `sono_score.py` — Motor de scoring v2
- `backtester_sono.py` — Backtesting
- El frontend completo (`frontend/`)
- Los agentes (`agents/`)
- Los scripts de auditoría (`audit/`)

### 🔴 Submódulo sin documentación

`addyosmani-skills` es un submódulo git apuntando a un commit externo. No hay instrucciones sobre cómo inicializarlo.

### 🟡 `.gitignore` insuficiente

El `.gitignore` actual ignora:
- `node_modules/`, `.wrangler/`
- `indicador_cloudflare/` (build)
- `.env`, `.env.local`, `.env.production`
- `.vscode/`, `.idea/` (IDE)
- `.DS_Store`, `Thumbs.db`
- `*.log`, `logs/`

**No ignora:**
- `venv/`, `__pycache__/`, `*.pyc` — entornos virtuales Python y caches (⚠️ crítico)
- `.wrangler/cache/` — como se ve en `worker-vix`, trackeado accidentalmente
- `backup_*` — backups embebidos deberían estar ignorados
- `.env.template` está bien trackeado (correcto), pero `.env` no tiene fallback coverage adicional

### 🟡 Documentos duplicados

- `audit/MANUAL_TÉCNICO_COMPLETO.md` (16.6 KB) y `audit/MANUAL_TÉCNICO_COMPLETO.docx` (42.9 KB) son el mismo contenido en dos formatos. El `.docx` es un binario innecesario en git.

### 🟡 `HEARTBEAT.md` casi vacío (15 bytes)

Incluido en el repo de forma pública, probablemente contenido del workspace local.

### 🟡 Archivos de identidad de agente (AGENTS.md, SOUL.md, MEMORY.md, etc.)

Son archivos de configuración del **workspace OpenClaw local** que se han subido al repo público. Contienen la identidad y memoria del agente. MEMORY.md tiene 4.4 KB con información del sistema. Esto es información no-código que probablemente no debería estar en un repo público de trading.

### 🟡 Estructura de raíz abarrotada

Hay **37 archivos** directamente en la raíz entre scripts Python, JSX, documentos MD, y archivos de identidad. Sería recomendable:
- `src/` para código Python
- `docs/` para documentación
- `scripts/` para helpers

---

## 8. Branch `worker-vix` — Hallazgos

- `.wrangler/cache/wrangler-account.json` trackeado — **no debería** (contiene datos de caché de Wrangler)
- Branch separado del contexto principal, probablemente OK como branch feature para Worker específico
- Solo 4 archivos, estructura limpia y minimalista

---

## 9. Lenguajes del Repositorio

| Lenguaje | Bytes |
|---|---|
| HTML | 815 KB |
| JavaScript | 529 KB |
| Python | 508 KB |
| CSS | 97 KB |
| PowerShell | 60 KB |
| Shell | 3.7 KB |
| Batchfile | 350 B |

---

## 10. Estado General y Recomendaciones

### Estado: ⚠️ **Funcional pero desordenado**

El proyecto es **activo y funcional** (último commit hoy), pero la estructura es caótica para ser un repositorio público:

### Recomendaciones prioritarias:

1. **Mover scripts `_*.py`** a un subdirectorio `scripts/` o `tools/`
2. **Eliminar `backup_20260527_2100/`** del historial con `git rm` (o añadir al `.gitignore`)
3. **Actualizar `.gitignore`** para incluir `venv/`, `__pycache__/`, `*.pyc`, `backup_*/`
4. **Limpiar archivos de workspace** — MEMORY.md, AGENTS.md, SOUL.md, HEARTBEAT.md, TOOLS.md, USER.md no deberían estar en un repo público de trading
5. **Eliminar el `.docx`** duplicado de `audit/`
6. **Actualizar README** para reflejar todos los módulos existentes
7. **Agregar `venv/` al `.gitignore` de `worker-vix`**
8. **Mover documentación larga** (ANALISIS_*.md, ULTRAFINO_*.md) a `docs/`
9. **Eliminar `.wrangler/cache/wrangler-account.json`** del branch `worker-vix`
10. **Considerar mover `SonoProTerminal_monolith_ref.jsx`** (48 KB) a un directorio de referencias o eliminarlo si es legacy

### Puntos positivos:

- ✅ README completo con instrucciones de uso
- ✅ CHANGELOG actualizado
- ✅ Código fuente núcleo (main.py, indicators.py, scoring.py, sono_score.py) presente y funcional
- ✅ `.gitignore` básico presente (aunque mejorable)
- ✅ Frontend completo con estructura React/Vite
- ✅ Bot de trading con modo paper trading
- ✅ Módulo de alertas Telegram
- ✅ 2 branches con propósito claro (main + worker-vix)
- ✅ Sin issues ni bugs reportados
- ✅ Sin secrets/API keys expuestas en el código visible
