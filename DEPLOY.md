# SONO PRO v5.0 — GUÍA DE DESPLIEGUE
## Sistema completo: Dashboard · Rangos · Trading Journal

---

## 🏗️ ARQUITECTURA (HTML Puro — Sin Build)

```
sono-system/
├── index.html      ← Dashboard principal (WebSocket + Score Maestro + Chart)
├── rangos.html     ← Range Intelligence multi-timeframe (15m/5m/3m/1m)
├── trades.html     ← Trading Journal con estadísticas y equity curve
├── css/
│   └── sono.css    ← Sistema de diseño Bloomberg Dark completo
├── js/
│   ├── engine.js   ← Motor: SMA, EMA, RSI, ADX, Bollinger, Score Maestro
│   ├── binance.js  ← WebSocket + REST Binance (precio, klines, ticker)
│   └── macro.js    ← Fear & Greed + CoinGecko + VIX proxy
├── _headers        ← Security headers (HSTS, CSP, XFO)
├── _redirects      ← Routing Cloudflare Pages
└── favicon.svg     ← Icono SVG verde terminal
```

---

## 🚀 DESPLIEGUE EN CLOUDFLARE PAGES — 4 PASOS

### Paso 1: Subir archivos a GitHub

```bash
# Opción A: Repo nuevo limpio (RECOMENDADO)
cd C:\Users\sparreno\Desktop
# Extrae el ZIP aquí

git init sono-v5
cd sono-v5
# Copia todos los archivos de sono-system/ aquí
git add .
git commit -m "feat: Sono Pro v5 - sistema completo HTML puro"
git remote add origin https://github.com/Sonosanty/indicador-sono-v5.git
git push -u origin main

# Opción B: Reemplazar repo existente (si quieres mantener URL)
cd C:\Users\sparreno\.openclaw\workspace\indicador-sono-repo
# Copia los archivos de sono-system/ (reemplaza index.html, etc.)
git add .
git commit -m "feat: migrar a HTML puro v5 - sin build"
git push origin main
```

### Paso 2: Configurar Cloudflare Pages

En https://dash.cloudflare.com → Pages → tu proyecto → Settings → Builds:

```
Framework preset:   None
Build command:      (DEJAR VACÍO — sin build)
Build output dir:   /
Root directory:     /
```

⚠️ **IMPORTANTE:** El Build command debe estar VACÍO.
Cloudflare servirá los archivos directamente sin compilar.
Esto elimina el límite de 500 builds/mes porque no hay build.

### Paso 3: Verificar _redirects

El archivo `_redirects` ya está configurado:
```
/dashboard    /index.html    200
/rangos       /rangos.html   200
/trades       /trades.html   200
/*            /index.html    404
```

### Paso 4: Deploy

```bash
git push origin main
```

Cloudflare lo detecta en ~10 segundos y lo despliega en ~5 segundos.
**Sin compilación = Sin límite de builds.**

---

## ✅ QUÉ FUNCIONA EN ESTA VERSIÓN

| Función | Estado |
|---|---|
| Precio BTC/ETH/SOL/XRP tiempo real | ✅ WebSocket Binance |
| Score Maestro 0-100 | ✅ P1+P2+P3 calculados |
| MA6, MA40, MA70, MA200 reales | ✅ Conectados a la UI |
| RSI(14) real | ✅ |
| ADX(14) real con +DI/-DI | ✅ |
| Bollinger Bands %B | ✅ |
| Fear & Greed Index | ✅ Alternative.me |
| Dominancia BTC/ETH/Alts | ✅ CoinGecko |
| Market Cap total | ✅ CoinGecko |
| VIX (proxy + estimado fallback) | ✅ |
| Gráfico de velas con MAs y BB | ✅ Canvas nativo |
| Régimen de mercado 1-6 | ✅ |
| Selector multi-activo | ✅ BTC/ETH/SOL/XRP |
| Selector multi-timeframe | ✅ 1m/3m/5m/15m/1h |
| Range Intelligence 4 TFs | ✅ Con gauges de presión |
| Confluencia MTF score 0-100 | ✅ |
| Checklist señal de entrada | ✅ 5 criterios |
| Trading Journal CRUD | ✅ localStorage |
| Estadísticas (Win Rate, PF, R:R) | ✅ |
| Equity Curve | ✅ Canvas |
| Export CSV | ✅ |
| Security headers (HSTS, CSP) | ✅ |
| Responsive móvil | ✅ Breakpoints 1024/768/480 |
| Sin backend | ✅ 100% frontend |
| Sin npm/build | ✅ Deploy directo |
| Sin límite builds Cloudflare | ✅ |

---

## ⚙️ CONFIGURACIÓN POST-DEPLOY

### VIX Real (opcional)
Si tienes el Worker de VIX funcionando:
1. Abre `js/macro.js`
2. Verifica que `VIX_URL = 'https://vix-proxy.sonosanty.workers.dev/vix'` sea correcto
3. Si el Worker falla, el sistema usa el estimado automático (F&G inverso)

### Dominio personalizado (opcional)
En Cloudflare Pages → Custom domains → indicador-sono.pages.dev ya es tu URL actual.

---

## 🔄 ACTUALIZAR EL SISTEMA

Para hacer cambios futuros:
```bash
# 1. Editar el archivo que necesitas
# 2. Guardar
git add .
git commit -m "fix: descripción del cambio"
git push origin main
# 3. En ~15 segundos está en producción
```

---

## 📞 RUTAS DE LA WEB

| URL | Página |
|---|---|
| `https://indicador-sono.pages.dev/` | Dashboard principal |
| `https://indicador-sono.pages.dev/rangos.html` | Range Intelligence |
| `https://indicador-sono.pages.dev/trades.html` | Trading Journal |

---

*Sono Pro v5.0 — Arquitectura: Santy + Claude Sonnet 4.6*
*31 Mayo 2026 · HTML puro · Sin build · Sin backend*
