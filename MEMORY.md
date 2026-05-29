# MEMORIA - Ultrafino.com

## El negocio
- **Tienda**: ultrafino.com (Shopify, tema Turbo v9.3.0)
- **Blog**: blog.ultrafino.com (WordPress, subdominio)
- **Producto**: Sombreros Panama Montecristi autenticos, tejidos a mano en Ecuador
- **Posicionamiento**: DTC premium, cada sombrero toma 20+ horas de tejido manual
- **Mercado principal**: USA (ingles)
- **Meta**: escalar a + ARR
- **Canal secundario**: Amazon FBA

## Estado SEO (mayo 2026)
- Ranking "panama hat": colapsado de #1 a posicion ~11.8 (2024-2026)
- La pagina de REPARACION genera mas trafico que las paginas de compra
- Plan editorial: 30 articulos hasta noviembre 2026
- Competidores: Gamboa Fashion, Borsalino, Brent Black, PanamaHatsCo

## Stack tecnico
- Shopify: snippets uf-* (10+ creados), ZIPs versionados hasta v6.2
- Blog WordPress en subdominio (impacta autoridad SEO)
- Datos en: GSC, SEMrush, Excel, Word, PDFs de reportes

## Propietario
- Nombre: Santy
- Ubicacion: Madrid, Espana (con conexion a Quito, Ecuador)
- Idioma preferido: espanol

## Proyecto Indicador Cripto y Trading (Sono Pro)
- **Web App**: https://indicador-sono.pages.dev/#/ (Cloudflare Pages)
- **5 páginas**: Macro, Trades, Rangos, Método, Agentes (oculto del menú)
- **Stack**: React 18 + Vite + HashRouter SPA — 3 chunks (code splitting)
- **APIs**: Binance REST+WS, CoinGecko, Alternative.me, Worker VIX proxy
- **Worker VIX**: `vix-proxy.sonosanty.workers.dev` v3.0 (VIX + EUR)
- **Monedas**: BTC, ETH, SOL, XRP
- **Estrategia**: Score Maestro Sono 0-100 — swing trading (15m)
- **Bot Pionex**: `sono_bot.py` (PID 10504 activo, auto-arranque Windows)
- **Balance Pionex**: ~$4.52 USDT + activos (~$22) — mínimo $10 para operar
- **Despliegue**: `npx wrangler pages deploy . --project-name indicador-sono --branch main`
- **GitHub**: `github.com/Sonosanty/indicador-sono-` branch `main` (último: f86e8d2)
- **Seguridad**: robots.txt (bloquea GPTBot), HSTS, CSP estricto, X-Frame-Options DENY
- **Backup**: `backup_sono_20260528_2138` (90MB)
- **⚠️ Cache Cloudflare**: Ctrl+Shift+R después de cada deploy
- **Build**: `npm run build` justo antes de cada deploy
- **GitHub sync**: commit + push inmediato después de deploy

## ⚡ Optimizaciones arquitectura (29 mayo 2026)
- **Score unificado**: `sono-score-config.json` es la única fuente de verdad. `scoreEngine.js` (SPA) y `sono_score.py` (bot) lo consumen. Cualquier cambio de umbrales/pesos/etiquetas se hace solo en el JSON.
- **Lazy loading**: AppRouter.jsx con `lazy()` y `Suspense`. TradesPage, RangesPage, MetodoPage, AgentsPage son chunks separados. chart.js (202KB) ya no carga en la ruta principal.
- **Payload inicial reducido**: de ~520KB a ~200KB (index 17KB + react-vendor 182KB).
- **SWR/TTL en useMacro.js**: stale-while-revalidate. Fear&Greed 5min fresh/1h stale, CoinGecko 3min/5min, EUR 15min/30min, VIX 2min/3min. Poll cada 60s pero SWR decide si realmente fetch.
- **manualChunks en vite.config.js**: chunks con nombres legibles (trades, rangos, metodo, agentes, chart-vendor, recharts-vendor).
- **sono_bot.py**: ahora importa `sono_score.compute_score` en lugar de tener su propio `computeScore` duplicado.

### 📋 Protocolo de verificación post-deploy (obligatorio)
Cada vez que se despliegue a producción, jarvisClaw debe:
1. Abrir navegador → `https://indicador-sono.pages.dev/#/`
2. Esperar 8 segundos a que React cargue y WebSocket conecte
3. Verificar: `document.querySelector('.asset-selector')` existe
4. Verificar: bundle hash en `<script src>` es el correcto
5. Verificar: texto en pantalla tiene datos reales (no 'Cargando...')

## Protocolo de contingencia de IA y Resiliencia
- **Directiva de Caídas de Google**: En caso de caída de los servidores de Google (Gemini) o timeouts recurrentes que dejen incomunicado al asistente en su modelo principal, jarvisClaw se conectará automáticamente a Perplexity.ai (mediante el navegador integrado o la habilidad local de Perplexity Search con el perfil Pro persistente) para seguir realizando consultas y respondiendo las peticiones de Santy de forma ininterrumpida.