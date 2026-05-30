#!/bin/bash
# Build script for Cloudflare Pages - static files only
echo "=== Sono PRO static build ==="
mkdir -p indicador_cloudflare/metodo indicador_cloudflare/v2

# Copy static files
cp pagina.html indicador_cloudflare/index.html
cp frontend/range_explorer.html indicador_cloudflare/range_explorer.html
cp frontend/trades_explorer.html indicador_cloudflare/trades_explorer.html
cp frontend/style.css indicador_cloudflare/style.css
cp frontend/metodo.html indicador_cloudflare/metodo/index.html
cp frontend/pagina.html indicador_cloudflare/metodo/index.html 2>/dev/null || cp pagina.html indicador_cloudflare/v2/index.html

echo "=== Build complete ==="
ls -la indicador_cloudflare/
