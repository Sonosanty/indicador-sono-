# PLAN DE ACCIÓN — Mañana 28 Mayo 2026

## 🎯 Objetivo: Deploy de Sono Pro v3 completo y funcional

---

## ⚠️ DIAGNÓSTICO RÁPIDO (leer esto primero)

**¿Qué tenemos ahora en producción?**
- 3 páginas HTML plano con datos reales de Binance ✅ 
- Score Maestro 70/100, RSI, ADX, 4 TFs, Timeline ✅
- Pero NO es la suite v3 React que Santy quiere

**¿Qué tenemos en local?**
- ZIP con React v3 descomprimido en `C:\Users\sparreno\Downloads\sono-pro-v3-openclaw\` (26 archivos, 41KB)
- Dashboard HTML nuevo en `C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html` (20KB, con diseño Number-First)
- Trades HTML en `indicador_cloudflare\trades\index.html`

**Problemas conocidos:**
- Sandbox de OpenClaw NO puede ejecutar comandos shell (wrangler, node, powershell)
- VPN del usuario bloquea Binance → desactivar VPN para pruebas
- El ZIP React necesita `npm install` + `npm run build` + `wrangler deploy`

---

## 📋 PLAN PASO A PASO

### PASO 1 — HACER BACKUP DE TODO
```bash
xcopy "C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare" "C:\Users\sparreno\.openclaw\workspace\backup_28MAY" /E /I /Y
```
Guardar antes de tocar nada.

### PASO 2 — DEPLOY DEL DASHBOARD NUEVO (OPCIÓN RÁPIDA)
Si quieres que la web se vea bien AHORA:
```bash
cd C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare
npx wrangler pages deploy . --project-name indicador-sono --branch main
```
Esto sube el dashboard con diseño profesional (Inter, 14px radius, colors semanticos).
NO es React. Es HTML plano. Pero funciona y se ve bien.

### PASO 3 — BUILD DE LA SUITE REACT v3 (para tener las 3 páginas)
```bash
# Desde el ZIP descomprimido
cd C:\Users\sparreno\Downloads\sono-pro-v3-openclaw
npm install
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos.

### PASO 4 — UNIR AMBOS PROYECTOS
Copiar el `dist/` de React a `indicador_cloudflare/`:
```bash
xcopy "C:\Users\sparreno\Downloads\sono-pro-v3-openclaw\dist" "C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare" /E /I /Y
```

Mantener el dashboard HTML como fallback en `/dashboard_sono/`.

### PASO 5 — DEPLOY FINAL
```bash
cd C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare
npx wrangler pages deploy . --project-name indicador-sono --branch main
```

### PASO 6 — VERIFICAR
Abrir en navegador:
- https://indicador-sono.pages.dev/ → Landing React
- https://indicador-sono.pages.dev/trades → Trades Realtime
- https://indicador-sono.pages.dev/rangos → Range Intelligence
- https://indicador-sono.pages.dev/dashboard_sono/ → Dashboard fallback HTML

---

## 🧩 QUÉ HACE CADA ARCHIVO DEL ZIP

| Archivo | Descripción |
|---|---|
| `src/pages/MacroPage.jsx` | Página Macro con 9 cards (BTC Spot, Estado, F&G, VIX, RSI, Dominancias) |
| `src/pages/TradesPage.jsx` | Equity curve + KPIs + rendimiento por setup + tabla trades |
| `src/pages/RangesPage.jsx` | Grid 2x2 multi-TF con gauges de presión + confianza 0-100 |
| `src/components/MetricCard.jsx` | Componente "Number-First" reutilizable |
| `src/components/TopBar.jsx` | Header con pills de navegación entre páginas |
| `src/engine/indicators.js` | Motor matemático (MAs, RSI, ADX, BB, Score) |
| `src/hooks/useBinance.js` | WebSocket + REST Binance |
| `src/hooks/useMacro.js` | Fear & Greed, CoinGecko, VIX |
| `src/hooks/useSignals.js` | Persistencia localStorage + alertas |
| `src/styles/theme.css` | Sistema de diseño (variables CSS, paleta, tipografía) |
| `openclaw-skill/skill.json` | Skill de OpenClaw con triggers de voz |
| `openclaw-skill/desplegar-sono-v3.ps1` | Script PowerShell de deploy automático |

---

## 🎨 QUÉ SE VE DIFERENTE EN v3 vs LO QUE TENEMOS AHORA

| Aspecto | Ahora (HTML plano) | v3 React |
|---|---|---|
| Páginas | 3 separadas | 3 con React Router SPA |
| Diseño | Number-First básico | MetricCard reutilizable |
| Tipografía | Inter + JetBrains Mono | Inter + JetBrains Mono (igual) |
| Paleta | #0a1428 + #16a34a | Misma (hereda de theme.css) |
| Equity Curve | No tiene | Sí, con canvas y 5 KPIs |
| F&G | No conectado | alternative.me API |
| VIX | No conectado | Yahoo Finance |
| Dominancia | No conectada | CoinGecko |
| Glassmorphism | backdrop-filter básico | Sí, con blur |
| Skeleton loaders | No | Sí, con shimmer |
| Cabeceras seguridad | No | HSTS + CSP + XFO |
| Responsive | 3 breakpoints | 4 breakpoints (1024/768/640/480) |
| WebSocket | No (REST polling) | Sí, aggTrade en tiempo real |

---

## ⚡ TIEMPOS ESTIMADOS

| Paso | Tiempo | Quién |
|---|---|---|
| Backup | 1 min | Tú (cmd) |
| Deploy HTML actual | 30 seg | Tú (wrangler) |
| npm install React | 2-3 min | Tú (cmd) |
| npm run build | 30 seg | Tú (cmd) |
| Copiar dist + deploy | 1 min | Tú (cmd) |
| Verificar navegador | 2 min | Tú |
| **Total** | **~7 min** | |

---

## 🐛 POSIBLES PROBLEMAS Y SOLUCIONES

**Problema: "wrangler not found"**
```bash
npx wrangler pages deploy . --project-name indicador-sono --branch main
```
Usar `npx` en vez de llamar wrangler directamente.

**Problema: "npm not recognized"**
Instalar Node.js desde https://nodejs.org/ (v20 LTS)
O verificar que está en PATH:
```bash
where node
where npm
```

**Problema: React build falla**
```bash
npm install --legacy-peer-deps
npm run build
```

**Problema: VPN bloquea Binance**
Desactivar VPN antes de probar la web. Con VPN activa el fetch a Binance se cuelga.

**Problema: Cloudflare cache**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```
O esperar 5 minutos a que la cache expire sola.

---

## 📞 MAÑANA: PRIMER MENSAJE PARA MÍ

Cuando me despiertes mañana, dime:
1. "Buenos días, despliega sono v3 desde el ZIP"
2. O "Sono, deploy del HTML que escribiste anoche"
3. O "Sono, build y deploy de React v3"

Con cualquiera de esas frases, agarro el plan, ejecuto los pasos y te tengo la web funcionando en <10 minutos.
