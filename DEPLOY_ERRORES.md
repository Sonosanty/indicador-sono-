# INFORME DE ERRORES DE DESPLIEGUE — SONO TERMINAL X
**Fecha:** 2026-06-09 08:24 GMT+2
**Analista:** JarvisClaw

---

## RESUMEN EJECUTIVO

Se han identificado **6 categorías de errores** que han afectado sistemáticamente los despliegues a Cloudflare Pages. De 358 commits totales en el repo, aproximadamente **92 commits (26%)** están directamente relacionados con arreglar problemas de deploy.

**Indicador clave:** 22 commits con "trigger deploy" o "force redeploy", más 26 commits con "cache/CDN/purge". El build no debería necesitar más de 1-2 commits de ajuste inicial.

---

## ERROR #1 — DUPLICIDAD DE FUENTE DE VERDAD (RAÍZ vs indicador_cloudflare/)

### Síntoma
El `build.sh` copia archivos de la raíz a `indicador_cloudflare/`, pero `indicador_cloudflare/` tiene **sus propios archivos versionados en git** que son los que realmente se despliegan. El build command de CF Pages hace:

```
mkdir -p output/js && cp indicador_cloudflare/index.html ... output/ && cp indicador_cloudflare/js/stx-core.js output/js/
```

No ejecuta `build.sh`. Copia directamente de `indicador_cloudflare/`.

### Consecuencia
- Editar `stx-core.js` de la raíz no afecta a producción — hay que copiarlo manualmente a `indicador_cloudflare/js/stx-core.js`
- Editar `index.html` de la raíz no afecta a producción — hay que editar `indicador_cloudflare/index.html`
- El `_headers` de la raíz y el de `indicador_cloudflare/` son diferentes
- `build.sh` es un artefacto muerto que no se ejecuta en CF Pages

### Historial
- `044b2a7` "remove physical SPA directories"
- `4cd0e4b` "add build.sh + js/stx-core.js + css/stx-theme.css to build output"
- `e2f6519` "quitar indicador_cloudflare de gitignore y commitear todos los archivos de build"
- `1f15ed1` "forzar deploy con build command cp -r"
- Múltiples commits con "sync" en el mensaje

### Fix necesario
**Unificar la fuente de verdad:**
- Opción A: Eliminar `indicador_cloudflare/` de git, que `build.sh` genere el output, y cambiar el build command a `bash build.sh`
- Opción B: Eliminar archivos duplicados de la raíz, mantener solo `indicador_cloudflare/` como fuente de verdad

---

## ERROR #2 — AUSENCIA DE SONO METHOD EN EL CÓDIGO DESPLEGADO

### Síntoma
La página `/metodo` mostraba `--` en todos los valores durante días. El código SONO METHOD™ (`initSonoMethod`, `updateSonoMethod`, `strategyGrid`) existía en `stx-core.js` de la raíz pero **nunca llegó a producción**.

### Causa raíz
1. `indicador_cloudflare/js/stx-core.js` era una versión antigua (commit `5b4494c`) sin SONO METHOD
2. Los commits que modificaron `stx-core.js` de la raíz con SONO METHOD (`a2c2fb1`, `7df4641`, `65f8ce4`, `86224ad`) NO actualizaron `indicador_cloudflare/js/stx-core.js`
3. El build command copia de `indicador_cloudflare/`, no de la raíz

### Historial
- 10+ commits con "SONO METHOD" en el mensaje, la mayoría sin efecto en producción
- `a2c2fb1` "fix: SONO METHOD datos reales" → solo afectó a raíz, no al output
- Fix manual final: `2c951ef` "fix: sync indicador_cloudflare stx-core.js"

### Fix aplicado
`2c951ef` — copiar `stx-core.js` de la raíz a `indicador_cloudflare/js/stx-core.js` manualmente.

---

## ERROR #3 — CACHE DE CDN (26 commits)

### Síntoma
Después de desplegar, los cambios no se ven durante minutos/horas porque Cloudflare CDN sirve versión cacheada.

### Causa raíz
- `Cache-Control: no-cache` mal configurado o aplicado solo a algunos archivos
- Intentos de "cache bust" con comentarios en `_headers`, versiones en URL, purgas forzadas
- El SPA no tiene hash en los nombres de archivo (ej. `stx-core-v1.2.3.js`)

### Historial
- `879b88c` "cache bust comment to force deploy CDN regeneration"
- `3787b03` "_headers regenerado con X-Cache-Bust unico"
- `909ba7f` "duplicar regla no-cache en _headers"
- `319456e` "force CDN regeneration via _headers cache bust"
- Y 22 commits más relacionados con cache

### Fix aplicado
`65f8ce4` — `stx-core.js` con `Cache-Control: public, max-age=300` y `trades.json` con `max-age=120`.

---

## ERROR #4 — RUTAS SPA / ROUTING (al menos 12 commits)

### Síntoma
Las rutas `/metodo`, `/rangos`, `/trades` no funcionaban — daban 404 o servían el HTML incorrecto.

### Causa raíz
- CF Pages necesita `_routes.json` para el fallback SPA (`/* → /index.html`)
- Se intentó con directorios físicos (`/metodo/index.html`) y con `_routes.json`
- Hubo múltiples cambios de estrategia de routing

### Historial
- `c40429e` "fix _routes.json exclude"
- `9003c22` "fix _routes.json sin exclude y fallback universal"
- `137f652` "add physical SPA routes (...) to bypass edge CDN cache"
- Múltiples commits con "router", "SPA", "routes"

### Estado actual
Funciona con History API + `_routes.json` + fallback. Verified.

---

## ERROR #5 — CSP (Content Security Policy) — al menos 8 commits

### Síntoma
La consola mostraba errores de CSP bloqueando scripts, estilos o conexiones. Chart.js desde CDN bloqueado, WebSocket bloqueado, estilos inline bloqueados.

### Causa raíz
CSP demasiado restrictivo configurado en `_headers` sin considerar todas las URLs que usa la app (Binance WS, CDN chart.js, CoinGecko, Proxy Worker).

### Historial
- `f8c0405` "fix CSP unsafe-inline"
- `10f6ef2` "fix CSP connect-src + CSP-safe onclick"
- `a58cf75` "fix CSP script-src ahora incluye 'unsafe-inline'"
- `a9efc26` "fix CSP script-src unsafe-inline"
- `c4cb870` "fix _headers con CSP real"
- Varios más

### Estado actual
Resuelto. CSP en `_headers` cubre todos los endpoints usados.

---

## ERROR #6 — SINTAXIS Y ERRORES DE CÓDIGO JS (16 commits)

### Síntoma
Errores de sintaxis JS que rompían el core: comas mal colocadas, `catch()` sin argumento, `await` fuera de `async`, referencias a variables no definidas.

### Causa raíz
Parches manuales sin testing, concatenación de código de diferentes fuentes, ediciones sin verificar sintaxis.

### Historial
- `1e5fbf8` "fix JS syntax error - comma before comment in BINANCE_WS line"
- `601772c` "fix catch(_) en lugar de catch() para compatibilidad total"
- `a45280c` "fix stx-core FINAL - sin await fuera de async"
- `4ac94ab` "fix init() envuelto en try-catch para depurar por que datos no cargan"
- Múltiples commits con "syntax", "catch", "async", "parse"

### Estado actual
Resuelto. Todo el código verificado con `node -c` antes de commit.

---

## ESTADÍSTICAS GLOBALES

| Métrica | Valor |
|---|---|
| Commits totales en repo | 358 |
| Commits de fix/deploy | ~92 (26%) |
| Commits "fix:" en mensaje | ~140 (39%) |
| Commits "trigger deploy/force redeploy" | 22 |
| Commits "cache/CDN/purge" | 26 |
| Commits "sync/copy" | 18 |
| Commits "syntax/parse/async/catch" | 16 |
| Commits "error/404/451" | 10 |
| Scripts de fix/parche en raíz | ~45 archivos .js |
| Archivos en `indicador_cloudflare/` (producción) | 5 |
| Archivos en raíz (total) | ~72 |
| Tiempo estimado perdido en errores de deploy | ~80% del tiempo de desarrollo |

---

## RECOMENDACIONES

### Crítico (hacer ahora)
1. **Unificar fuente de verdad**: Decidir si `indicador_cloudflare/` o la raíz es el source. Yo recomiendo eliminar `indicador_cloudflare/` de git, y que el build command ejecute `bash build.sh` que genera el output. PERO el build.sh actual también está desactualizado — habría que reescribirlo.

2. **Limpiar raíz**: Los ~45 scripts de fix/parche en la raíz no deberían estar en el repo de producción. Moverlos a una branch o directorio `tools/`.

### Importante (esta semana)
3. **Hash en nombres de archivo**: `stx-core.a1b2c3.js` para cache bust automático sin tocar `_headers`.

4. **Pre-commit hook**: Verificar sintaxis JS con `node -c` antes de cada commit.

5. **Build command documentado**: El build command actual de CF Pages está hardcodeado en la UI de Cloudflare y no es visible desde el repo. Ponerlo en `DEPLOY.md` actualizado.

### Medio (próximas semanas)
6. **CI/CD**: GitHub Actions para testing + deploy automático. Eliminar dependencia de push directo.

7. **Entorno de staging**: Una branch `develop` que se despliegue a `indicador-sono-staging.pages.dev` para verificar antes de prod.

---

## FLUJO ACTUAL DE DEPLOY

```
git push → GitHub
   ↓
CF Pages clona repo (commit 86224ad)
   ↓
Ejecuta build command (hardcodeado en UI):
  mkdir -p output/js
  cp indicador_cloudflare/index.html output/
  cp indicador_cloudflare/trades.json output/
  cp indicador_cloudflare/_headers output/
  cp indicador_cloudflare/_routes.json output/
  cp indicador_cloudflare/js/stx-core.js output/js/
   ↓
CF Pages despliega output/ a indicador-sono.pages.dev
```

**Problema:** El build command no se regenera automáticamente si la estructura del repo cambia. Está fijo en la UI.

---

## FLUJO RECOMENDADO

```
git push → GitHub
   ↓
CF Pages clona repo
   ↓
Ejecuta: bash build.sh
   ↓
build.sh genera output/ correctamente
   ↓
CF Pages despliega output/
```

Donde `build.sh` está actualizado y versionado en el repo.
