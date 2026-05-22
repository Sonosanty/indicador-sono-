# ============================================================================
# ACTUALIZAR_CLOUDFLARE.PS1 (INDICADOR_BTC AUTOMATION FOR CLOUDFLARE PAGES)
# Script PowerShell para automatizar la ejecucion del procesador cada 30 min
# y desplegar en Cloudflare Pages
# ============================================================================

$ErrorActionPreference = 'Continue'

Write-Host "[CLOUDFLARE] Iniciando actualizador automatico para Cloudflare Pages..." -ForegroundColor Cyan
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $baseDir

while ($true) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$time] Ejecutando consolidacion de base de datos..." -ForegroundColor Yellow
    python process_indicador_data.py
    
    Write-Host "[$time] Copiando datos consolidados a la carpeta de Cloudflare..." -ForegroundColor Yellow
    Copy-Item -Path "indicador_data.json" -Destination "..\indicador_cloudflare\indicador_data.json" -Force
    
    Write-Host "[$time] Realizando despliegue automatico a Cloudflare Pages..." -ForegroundColor Yellow
    npx wrangler pages deploy "..\indicador_cloudflare" --project-name="indicador-sono"
    
    $nextRun = (Get-Date).AddMinutes(30).ToString("HH:mm:ss")
    Write-Host "[$time] Despliegue completado con exito. Siguiente ejecucion a las: $nextRun" -ForegroundColor Green
    Start-Sleep -Seconds 1800
}
