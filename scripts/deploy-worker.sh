#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# deploy-worker.sh — Deploy del Worker VIX Proxy a Cloudflare
#
# Requisitos:
#   - wrangler CLI instalado (npm i -g wrangler)
#   - Autenticación: wrangler login o CLOUDFLARE_API_TOKEN
#
# Uso:
#   chmod +x scripts/deploy-worker.sh
#   ./scripts/deploy-worker.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "⏳ Desplegando VIX Proxy Worker..."

cd "$(dirname "$0")/../vix-proxy-worker"

# Verificar wrangler
if ! command -v wrangler &>/dev/null; then
  echo "❌ wrangler no encontrado. Instala con: npm i -g wrangler"
  exit 1
fi

# Ejecutar deploy
echo "📦 Ejecutando: npx wrangler deploy"
npx wrangler deploy

if [ $? -eq 0 ]; then
  echo "✅ VIX Proxy Worker desplegado correctamente"
  echo "📍 URL: https://vix-proxy.sonosanty.workers.dev"
  echo "📍 Salud: https://vix-proxy.sonosanty.workers.dev/health"
else
  echo "❌ Error en el deploy. Revisa los logs."
  exit 1
fi
