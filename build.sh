#!/bin/bash
# Build script for Cloudflare Pages - v6.2.0
echo "=== Sono PRO v6.2.0 build ==="
mkdir -p indicador_cloudflare/metodo indicador_cloudflare/v2

# Copy root HTML files
cp index.html indicador_cloudflare/index.html
cp rangos.html indicador_cloudflare/rangos.html
cp trades.html indicador_cloudflare/trades.html
cp metodo.html indicador_cloudflare/metodo/index.html
cp dashboard.html indicador_cloudflare/dashboard.html

# Copy JS and assets
cp app.js indicador_cloudflare/app.js
cp _headers indicador_cloudflare/
cp _routes.json indicador_cloudflare/
cp _redirects indicador_cloudflare/
cp favicon.svg indicador_cloudflare/
cp service-worker.js indicador_cloudflare/sw.js 2>/dev/null || true
cp manifest.json indicador_cloudflare/ 2>/dev/null || true

# Legacy paths
cp index.html indicador_cloudflare/v2/index.html 2>/dev/null || true

echo "=== Build complete ==="
ls -la indicador_cloudflare/
