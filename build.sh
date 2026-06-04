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

# App JS - logica del dashboard
cp frontend/app.js indicador_cloudflare/app.js

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
