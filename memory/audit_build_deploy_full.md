# AUDITORÍA COMPLETA — Build · Deploy · Seguridad · Git
**Fecha:** 30 Mayo 2026 17:45 CEST
**SHA:** 5b89723 — `v1.5: Telegram alerts, WebSocket robusto, cleanup bot, MétodoPage con score real + Chart.js`

---

## 🔴 CRÍTICOS

### CR-1: `telegram_config.json` TRACKEADO EN GIT (urgencia máxima)
- **Problema:** `git ls-files` confirma que `telegram_config.json` está en el índice de git. Contiene el token del bot de Telegram (secret).
- **Impacto:** Cualquier push o clon del repo expone el token de Telegram.
- **Acción tomada:** ✅ `git rm --cached telegram_config.json` ejecutado. Queda fuera del staging.
- **Pendiente:** Hacer push a origin para limpiar el remoto. Añadir `.env` al `.gitignore` (ya existe como línea `.env`).
- **Riesgo histórico:** commits previos aún contienen el archivo si fue trackeado → considerar BFG Repo-Cleaner si es necesario.

### CR-2: `_config.json` cubierto parcialmente por `.gitignore`
- **Problema:** `.gitignore` incluye `*_config.json` SOLO en las últimas líneas, pero `telegram_config.json` se filtró antes de que esa regla surtiera efecto. La regla actual es correcta para futuro.
- **Verificado:** `sono-score-config.json` en `frontend/src/` sí está trackeado — pero NO contiene credenciales, solo pesos de scoring (público).

### CR-3: Sin `robots.txt` en build output ni source
- **Problema:** No existe `frontend/public/robots.txt` ni `indicador_cloudflare/robots.txt`.
- **Impacto:** Los crawlers pueden indexar todo sin restricciones. Bajo riesgo para app SPA, pero falta control sobre `/metodo` y rutas internas.
- **Acción:** Crear `frontend/public/robots.txt` con `User-agent: *` + `Disallow: /` o `Allow: /`.

### CR-4: Sin HSTS / `_headers` ni cabeceras de seguridad en Cloudflare Pages
- **Problema:** No existe `indicador_cloudflare/_headers` ni `_redirects`. No hay cabeceras `Strict-Transport-Security`, `X-Content-Type-Options`, ni `Cache-Control` personalizadas.
- **Impacto:** El sitio es vulnerable a downgrade attacks y MIME-sniffing. Cloudflare Pages puede añadir HSTS por defecto (Settings → Security), pero no está verificado.
- **Acción:** Crear `_headers` en `frontend/public/_headers` (Vite lo copia automáticamente) o en `vite.config.js`:

```
# _headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🟡 ALTOS

### AL-1: `frontend/index.html` tiene CSP incorrecta
- **Problema:** El `index.html` fuente (en `frontend/`) tiene `title: frontend` y NO tiene CSP. La CSP correcta se inyecta en tiempo de build por el plugin `post-build`.
- **Impacto:** Durante `vite dev`, el index.html fuente se sirve SIN CSP, exponiendo el entorno de desarrollo. No afecta a producción porque la CSP se inyecta en build.
- **Corrección:** Opcional: copiar la CSP también al `index.html` fuente para cobertura en dev.

### AL-2: `vite.config.js` — `metodo.html` copiado desde ruta incorrecta
- **Problema:** El `post-build` copia `path.resolve('metodo.html')` (resuelve a `frontend/metodo.html` → works ✅). Pero la referencia antigua en el build-pipeline podría depender de `frontend/public/metodo.html` (que NO existe).
- **Verificado:** ✅ Build pasa. `metodo.html` está en `frontend/metodo.html` y se copia correctamente.
- **Riesgo bajo:** La ruta funciona pero es frágil. Si se mueve `metodo.html`, el build falla silenciosamente.

### AL-3: `package.json` — `recharts` en dependencias NO usado (persistente)
- **Problema:** `"recharts": "^3.8.1"` listado en `devDependencies` del `package.json`. No hay imports de recharts en ningún archivo del frontend. Solo se usa `chart.js`.
- **Impacto:** 0 en producción (Vite tree-shakes), pero infla `npm install` y `package-lock.json` con dependencias muertas.
- **Acción:** `npm uninstall recharts`.
- **Nota ya documentada:** El resumen de auditoría anterior ya lo señalaba como pendiente.

### AL-4: `sono_bot.py` — PAPER_MODE = True confirmado pero línea 1 no es la variable
- **Verificado:** ✅ `PAPER_MODE = True` está en línea 43. La línea 1 es un comentario.
- **Hallazgo:** La variable está bien configurada como paper trading. No hay riesgo de trading real involuntario.

### AL-5: Git status — muchos cambios sin stage (deleted + modified)
- **Problema:** Decenas de archivos eliminados (`_check_*.py`, `test_*.py`, etc.) y modificados no están staged ni commited. `git status` muestra >70 cambios.
- **Impacto:** Si se necesita revertir o hacer deploy, está todo sucio. `indicador_cloudflare/` está en `.gitignore` ✅ pero los archivos Python eliminados dan confusión.
- **Acción:** `git add -A` + `git commit` para limpiar el estado. O añadir a `.gitignore` si estaban previstos.

### AL-6: `scoreEngine.js` eliminado pero su `.eliminado` queda como untracked
- **Encontrado:** `frontend/src/engine/scoreEngine.js.eliminado` en untracked files.
- **Impacto:** Archivo de referencia muerto que ocupa espacio y confunde. Decidir si mantenerlo o eliminarlo definitivamente (el resumen de auditoría anterior ya lo señalaba).

---

## 🟢 LEVES

### LE-1: `agentes` chunk más grande que `trades` (65 KB vs 22.5 KB)
- **Observación:** El chunk `agentes-BrDMbyM9.js` (65 KB) es ~3× más grande que `trades` o `metodo`. Podría optimizarse con lazy-loading más granular.

### LE-2: `chart-vendor` chunk muy grande (197.5 KB raw, 69.3 KB gzip)
- **Observación:** El vendor de chart.js domina el tamaño total (37% del total de assets). Posible mejora: cargar chart.js solo en las páginas que lo usan (vía `import()` dinámico).

### LE-3: Sin favicon real (favicon.svg)
- **Verificado:** ✅ `favicon.svg` referenciado en el head. Existe el archivo.

### LE-4: Caché de Cloudflare no configurada explícitamente
- **Observación:** Sin `_headers` ni configuración en Cloudflare Dashboard, los assets JS/CSS pueden servir con caché default (posiblemente corta). Los archivos con hash en el nombre (`-BgcU474e.js`) son ideales para `Cache-Control: immutable, max-age=31536000`.

### LE-5: Sin `envPrefix` ni variables de entorno VITE en build
- **Observación:** `vite.config.js` no define `envPrefix` (default `VITE_`). Si se usan variables de entorno, hay que prefijarlas con `VITE_` o configurar `envPrefix`.

---

## ✅ VERIFICADOS (Todo correcto)

### BUILD ✅
| Item | Estado | Detalle |
|------|--------|---------|
| `vite.config.js` — manualChunks | ✅ Correctos | react-vendor, trades, rangos, metodo, agentes, chart-vendor, recharts-vendor. Función compatible con Rollup/Rolldown |
| `vite.config.js` — resolve.alias | ✅ No necesario | No usa alias, imports relativos directos |
| `vite.config.js` — proxy | ✅ No relevante | App SPA, no necesita proxy (API externas directas) |
| `vite.config.js` — envPrefix | ⚠️ Default VITE_ | Funciona si las variables se llaman VITE_* |
| `package.json` — scripts | ✅ Correctos | dev, build, lint, preview |
| `package.json` — dep vs devDep | ✅ Bien separadas | React, chart.js en dependencies; vite, eslint en devDependencies |
| Build ejecutado | ✅ **410ms** | 1767 módulos transformados, 11 chunks generados |
| `metodo.html` copiado | ✅ Correcto | `metodo/index.html` creado en build output |
| `_routes.json` copiado | ✅ Correcto | Excluye `/metodo` del SPA routing |

### SEGURIDAD ✅
| Item | Estado | Detalle |
|------|--------|---------|
| CSP (build output) | ✅ Completa | `connect-src` cubre: `api.binance.com`, `wss://stream.binance.com`, `wss://stream.binance.com:9443`, `api.coingecko.com`, `api.alternative.me`, `vix-proxy.sonosanty.workers.dev`, fonts.googleapis.com, fonts.gstatic.com |
| CSP — `frame-ancestors` | ✅ `'none'` | Previene clickjacking |
| CSP — `script-src` | ✅ `'self' 'unsafe-inline'` | Necesario para React/Vite |
| CSP — `img-src` | ✅ `'self' data:` | Cubre assets e imágenes inline |
| CSP — `font-src` | ✅ `fonts.gstatic.com` | Google Fonts |
| CSP — `default-src 'self'` | ✅ Base segura |
| `.gitignore` — credenciales | ✅ Cubiertas | `*.credentials.json`, `*_config.json`, `.env`, `*.key`, `*.pem` |
| `.gitignore` — node_modules | ✅ Ignorado |
| `.gitignore` — build output | ✅ `indicador_cloudflare/` ignorado |
| `.gitignore` — `.openclaw/` | ✅ Ignorado |
| `.env.template` existe | ✅ En `audit/configs/` | Muestra cómo configurar sin exponer secrets reales |

### GIT ✅
| Item | Estado | Detalle |
|------|--------|---------|
| Branch | ✅ `main` | Up-to-date con `origin/main` |
| Último commit | ✅ `5b89723` | Hace 4 horas — v1.5 con Telegram alerts |
| Commits recientes | ✅ 5 commits | Limpios, mensajes descriptivos |
| Archivos con credenciales trackeados | ⚠️ `telegram_config.json` | ✅ ACABO DE EJECUTAR `git rm --cached` |
| `pionex_credentials.json` en git | ✅ NO | No aparece en `git ls-files` |
| Untracked files | ⚠️ Muchos | Archivos `.eliminado`, `tests/`, `utils/`, memory docs — decidir si añadir a `.gitignore` o commitear |

### PERFORMANCE ✅
| Item | Estado | Detalle |
|------|--------|---------|
| Total assets | ✅ **528.1 KB (0.52 MB)** | Muy ligero para SPA |
| Chunk más grande | ⚠️ `chart-vendor` 197.5 KB | 69.3 KB gzip — aceptable |
| Chunk más pequeño | ✅ `rolldown-runtime` 0.7 KB |
| Code splitting | ✅ 8 chunks JS + 2 CSS | React, chart, páginas separadas |
| Gzip sizes | ✅ Excelentes | vendor ~57 KB, chart ~69 KB, page chunks 4-24 KB |
| Build time | ✅ **410ms** | Rápido |
| `cssCodeSplit: true` | ✅ Activo |

---

## 📋 RESUMEN DE ACCIONES PRIORITARIAS

| Prioridad | Acción | Archivos |
|-----------|--------|----------|
| 🔴 **URGENTE** | Hacer `git push` para que `telegram_config.json` deje de estar en el índice remoto | `telegram_config.json` |
| 🔴 **ALTA** | Crear `_headers` con HSTS + Cache-Control + seguridad | `frontend/public/_headers` |
| 🔴 **ALTA** | Crear `robots.txt` | `frontend/public/robots.txt` |
| 🟡 **MEDIA** | `npm uninstall recharts` | `package.json` |
| 🟡 **MEDIA** | Hacer `git add -A && git commit` para limpiar estado sucio | workspace |
| 🟡 **MEDIA** | Revisar scoreEngine.js.eliminado — ¿eliminar o restaurar? | `frontend/src/engine/` |
| 🟢 **BAJA** | Considerar lazy-loading de chart.js para páginas sin gráficos | MetodoPage, AgentsPage |
| 🟢 **BAJA** | Cache-Control: immutable para assets con hash | `_headers` |

---

## NOTAS ADICIONALES
- `sono_bot.py` línea 1 es comentario, `PAPER_MODE = True` en línea 43 ✅
- Scripts de test eliminados del staging en el commit anterior (`_check_*.py` están como `deleted` en git status)
- `audit/correcciones_v1.md` enumera 14 bugs corregidos, 4 críticos pendientes
- Pendiente crítico no resuelto: `main.py` no arranca (5 módulos faltan)
