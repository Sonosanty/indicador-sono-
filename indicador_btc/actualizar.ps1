# ============================================================================
# ACTUALIZAR.PS1 (INDICADOR_BTC AUTOMATION FOR WINDOWS)
# Script PowerShell para automatizar la ejecucion del procesador de datos cada 10 min
# ============================================================================

$ErrorActionPreference = 'Continue'

Write-Host "[AUTOMATION] Iniciando actualizador automatico para Windows..." -ForegroundColor Cyan
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $baseDir

while ($true) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$time] Ejecutando consolidacion de base de datos..." -ForegroundColor Yellow
    python process_indicador_data.py
    
    Write-Host "[$time] Copiando datos consolidados a la carpeta de Netlify..." -ForegroundColor Yellow
    Copy-Item -Path "indicador_data.json" -Destination "..\indicador_netlify\indicador_data.json" -Force
    
    Write-Host "[$time] Realizando despliegue automatico a Netlify..." -ForegroundColor Yellow
    netlify deploy --dir="..\indicador_netlify" --prod
    
    $nextRun = (Get-Date).AddMinutes(30).ToString("HH:mm:ss")
    Write-Host "[$time] Despliegue completado con exito. Siguiente ejecucion a las: $nextRun" -ForegroundColor Green
    Start-Sleep -Seconds 1800
}
