#!/bin/bash
# Build script for Cloudflare Pages - v6.0.2
echo "=== Sono PRO v6.0.2 build ==="
mkdir -p indicador_cloudflare/metodo indicador_cloudflare/v2

# Copy root HTML files (v6.0.2 actualizados)
cp index.html indicador_cloudflare/index.html
cp rangos.html indicador_cloudflare/rangos.html
cp trades.html indicador_cloudflare/trades.html
cp metodo.html indicador_cloudflare/metodo/index.html

# Copy assets
cp _headers indicador_cloudflare/ 2>/dev/null || true
cp _routes.json indicador_cloudflare/ 2>/dev/null || true
cp favicon.svg indicador_cloudflare/ 2>/dev/null || true

# Legacy paths
cp index.html indicador_cloudflare/v2/index.html 2>/dev/null || true

echo "=== Build complete ==="
ls -la indicador_cloudflare/
