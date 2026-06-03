#!/bin/bash
# Build script for Cloudflare Pages - Sono PRO v6.2.2
# Self-hosted assets: chart.js, luxon, adapters (no CDN)
# Este script es el UNICO build command - ejecutar con: bash build.sh
echo "=== Sono PRO v6.2.2 build ==="
mkdir -p indicador_cloudflare/assets/vendor

# Core SPA - Dashboard V6 (index.html)
cp index.html indicador_cloudflare/index.html

# Self-hosted vendor assets (chart.js, luxon, adapters)
cp -r frontend/assets/vendor indicador_cloudflare/assets/

# App JS - logica del dashboard
cp frontend/app.js indicador_cloudflare/app.js

# Pages
cp frontend/metodo.html indicador_cloudflare/metodo.html
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
