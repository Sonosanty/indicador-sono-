#!/bin/bash
# Build script for Cloudflare Pages - Sono PRO v6.2.1
# Self-hosted assets: chart.js, luxon, adapters (no longer depend on jsDelivr CDN)
echo "=== Sono PRO v6.2.1 build ==="
mkdir -p indicador_cloudflare/{metodo,assets/vendor,v2}

# Core SPA files - index.html from root is the real SPA (Dashboard V6)
cp index.html indicador_cloudflare/index.html

# Static assets (self-hosted vendor)
cp -r frontend/assets/vendor indicador_cloudflare/assets/

# Header / route / redirect configs
cp frontend/_headers indicador_cloudflare/_headers 2>/dev/null
cp _routes.json indicador_cloudflare/_routes.json 2>/dev/null

# Service worker
cp frontend/service-worker.js indicador_cloudflare/sw.js 2>/dev/null
cp frontend/service-worker.js indicador_cloudflare/service-worker.js 2>/dev/null

# App JS
cp frontend/app.js indicador_cloudflare/app.js 2>/dev/null

# Page files
cp frontend/range_explorer.html indicador_cloudflare/range_explorer.html 2>/dev/null || true
cp frontend/trades_explorer.html indicador_cloudflare/trades_explorer.html 2>/dev/null || true
cp frontend/style.css indicador_cloudflare/style.css 2>/dev/null || true
cp frontend/metodo.html indicador_cloudflare/metodo.html
cp frontend/pagina.html indicador_cloudflare/v2/index.html 2>/dev/null || cp pagina.html indicador_cloudflare/v2/index.html 2>/dev/null || true

# Favicon / manifest
cp favicon.svg indicador_cloudflare/favicon.svg 2>/dev/null || true
cp manifest.json indicador_cloudflare/manifest.json 2>/dev/null || true

echo "=== Build complete ==="
ls -la indicador_cloudflare/
ls -laR indicador_cloudflare/assets/ 2>/dev/null

