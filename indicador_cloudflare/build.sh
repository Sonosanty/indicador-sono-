#!/bin/bash
# Build script for SONO TERMINAL X — Cloudflare Pages
# Copy everything to output/ maintaining directory structure
set -e

echo "=== Build SONO TERMINAL X ==="

# Clean and create output structure
rm -rf output
mkdir -p output/js output/css

# Copy all required files
cp indicador_cloudflare/index.html output/
cp indicador_cloudflare/trades.json output/
cp indicador_cloudflare/_headers output/
cp indicador_cloudflare/_routes.json output/
cp indicador_cloudflare/js/stx-core.js output/js/
cp indicador_cloudflare/css/stx-theme.css output/css/

# Optional but recommended
if [ -f indicador_cloudflare/favicon.svg ]; then
  cp indicador_cloudflare/favicon.svg output/
fi
if [ -f indicador_cloudflare/robots.txt ]; then
  cp indicador_cloudflare/robots.txt output/
fi

echo "=== Build complete ==="
ls -la output/
ls -la output/js/
ls -la output/css/
