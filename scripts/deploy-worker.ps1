# ═══════════════════════════════════════════════════════════════
# deploy-worker.ps1 — Deploy del Worker VIX Proxy a Cloudflare
#
# Requisitos:
#   - wrangler CLI instalado (npm i -g wrangler)
#   - Autenticación: wrangler login o CLOUDFLARE_API_TOKEN en env
#
# Uso:
#   .\scripts\deploy-worker.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkerDir = Join-Path $ScriptDir ".." "vix-proxy-worker" | Resolve-Path

Write-Host "⏳ Desplegando VIX Proxy Worker..." -ForegroundColor Cyan

# Cambiar al directorio del worker
Push-Location $WorkerDir

try {
    # Verificar wrangler
    $wrangler = Get-Command "wrangler" -ErrorAction SilentlyContinue
    if (-not $wrangler) {
        Write-Host "❌ wrangler no encontrado. Instala con: npm i -g wrangler" -ForegroundColor Red
        exit 1
    }

    # Ejecutar deploy
    Write-Host "📦 Ejecutando: npx wrangler deploy" -ForegroundColor Yellow
    npx wrangler deploy

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ VIX Proxy Worker desplegado correctamente" -ForegroundColor Green
        Write-Host "📍 URL: https://vix-proxy.sonosanty.workers.dev" -ForegroundColor Cyan
        Write-Host "📍 Salud: https://vix-proxy.sonosanty.workers.dev/health" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error en el deploy (código: $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
