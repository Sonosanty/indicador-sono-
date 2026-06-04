#!/bin/bash
# Build script for Cloudflare Pages - Sono PRO v6.3.0
# Self-hosted assets: chart.js, luxon, adapters (no CDN)
# Este script es el UNICO build command - se ejecuta desde git push
echo "=== Sono PRO v6.2.2 build ==="
mkdir -p indicador_cloudflare/assets/vendor

# Core SPA - Dashboard V6 (index.html)
cp index.html indicador_cloudflare/index.html

# Self-hosted vendor assets (chart.js, luxon, adapters)
cp -r frontend/assets/vendor indicador_cloudflare/assets/

# CSS modules (design tokens)
cp -r assets/css indicador_cloudflare/assets/

# Mockup design overrides
cp assets/css/mockup-overrides.css indicador_cloudflare/assets/css/ 2>/dev/null || true

# App JS - logica del dashboard
cp frontend/app.js indicador_cloudflare/app.js
cp frontend/app.module.js indicador_cloudflare/app.module.js

# JS Modules (ES modules - data layer)
mkdir -p indicador_cloudflare/js/core indicador_cloudflare/js/data indicador_cloudflare/js/indicators
cp js/core/cache.js indicador_cloudflare/js/core/
cp js/core/config.js indicador_cloudflare/js/core/
cp js/core/state.js indicador_cloudflare/js/core/
cp js/core/formatters.js indicador_cloudflare/js/core/
cp js/data/adapters.js indicador_cloudflare/js/data/
cp js/data/binance.js indicador_cloudflare/js/data/
cp js/data/kucoin.js indicador_cloudflare/js/data/
cp js/data/coingecko.js indicador_cloudflare/js/data/
cp js/data/alternative.js indicador_cloudflare/js/data/
cp js/data/vix.js indicador_cloudflare/js/data/
cp js/data/sonobot.js indicador_cloudflare/js/data/
cp js/indicators/ma.js indicador_cloudflare/js/indicators/
cp js/indicators/rsi.js indicador_cloudflare/js/indicators/
cp js/indicators/adx.js indicador_cloudflare/js/indicators/
cp js/indicators/bb.js indicador_cloudflare/js/indicators/
cp js/indicators/score-maestro.js indicador_cloudflare/js/indicators/
cp js/indicators/ranges.js indicador_cloudflare/js/indicators/
cp js/indicators/confluence.js indicador_cloudflare/js/indicators/

# SPA Controller
cp frontend/spa-controller.js indicador_cloudflare/spa-controller.js

# Pages
cp frontend/metodo.html indicador_cloudflare/metodo.html
cp frontend/range_explorer.html indicador_cloudflare/rangos.html
cp frontend/trades_explorer.html indicador_cloudflare/trades.html
cp frontend/dashboard.html indicador_cloudflare/dashboard.html 2>/dev/null || true
cp frontend/pagina.html indicador_cloudflare/pagina.html 2>/dev/null || true

# Configs
cp frontend/_headers indicador_cloudflare/_headers
cp _routes.json indicador_cloudflare/_routes.json

# Service worker (simplificado, sin precache de ASSETS)
cp frontend/service-worker.js indicador_cloudflare/service-worker.js

# Favicon / manifest
cp favicon.svg indicador_cloudflare/favicon.svg
cp manifest.json indicador_cloudflare/manifest.json

echo "=== Build complete ==="
ls -la indicador_cloudflare/
ls -laR indicador_cloudflare/assets/ 2>/dev/null
