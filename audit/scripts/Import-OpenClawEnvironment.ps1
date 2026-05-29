#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Import-OpenClawEnvironment.ps1
#  PROPÓSITO: Restauración del entorno OpenClaw a partir de un backup ZIP generado.
#  REQUISITOS: PowerShell 5.1+ (Ejecutar como Administrador recomendado)
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupZipPath
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-ErrorMsg($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  RESTAURACIÓN DEL ENTORNO DE TRABAJO OPENCLAW" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Validaciones previas
if (-not (Test-Path $BackupZipPath)) {
    Write-ErrorMsg "No se pudo encontrar el archivo de backup en: $BackupZipPath"
    exit 1
}

$tempRestoreDir = Join-Path $env:TEMP "OpenClaw_Restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $tempRestoreDir -Force | Out-Null
Write-Info "Extrayendo backup temporal en: $tempRestoreDir ..."

# Descomprimir
Expand-Archive -Path $BackupZipPath -DestinationPath $tempRestoreDir -Force
Write-Ok "Extracción de archivos completada."

# 2. Restaurar C:\OpenClaw
Write-Info "[2/8] Restaurando instalación en C:\OpenClaw ..."
$srcBaseDir = Join-Path $tempRestoreDir "C_OpenClaw"
$destBaseDir = "C:\OpenClaw"

if (Test-Path $srcBaseDir) {
    if (-not (Test-Path $destBaseDir)) {
        New-Item -ItemType Directory -Path $destBaseDir -Force | Out-Null
    }
    # Copiar archivos
    Copy-Item -Path "$srcBaseDir\*" -Destination $destBaseDir -Recurse -Force
    Write-Ok "Directorio C:\OpenClaw restaurado correctamente."
} else {
    Write-Warn "No se encontró el directorio base C_OpenClaw en el backup."
}

# 3. Restaurar %USERPROFILE%\.openclaw
Write-Info "[3/8] Restaurando perfil de configuración %USERPROFILE%\.openclaw ..."
$srcUserDir = Join-Path $tempRestoreDir "user_profile_openclaw"
$destUserDir = "$env:USERPROFILE\.openclaw"

if (Test-Path $srcUserDir) {
    if (-not (Test-Path $destUserDir)) {
        New-Item -ItemType Directory -Path $destUserDir -Force | Out-Null
    }
    Copy-Item -Path "$srcUserDir\*" -Destination $destUserDir -Recurse -Force
    Write-Ok "Configuraciones en %USERPROFILE%\.openclaw restauradas."
} else {
    Write-Warn "No se encontró el directorio user_profile_openclaw en el backup."
}

# 4. Instalar y reconstruir dependencias de Node.js
Write-Info "[4/8] Reinstalando y reconstruyendo dependencias de Node.js..."
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    if (Test-Path "C:\OpenClaw\package.json") {
        Set-Location "C:\OpenClaw"
        Write-Info "Instalando dependencias de Node.js en C:\OpenClaw (Gateway/Tools)..."
        npm install --legacy-peer-deps
        Write-Ok "npm install en base completado."
    }
    
    # Reconstruir skills si existen dependencias
    $perplexitySkillDir = "$env:USERPROFILE\.openclaw\workspace\skills\perplexity-search"
    if (Test-Path $perplexitySkillDir) {
        Set-Location $perplexitySkillDir
        Write-Info "Reinstalando dependencias para skill perplexity-search..."
        npm install
        Write-Ok "Dependencias de skill perplexity-search instaladas."
    }
} else {
    Write-Warn "Node.js no está instalado o no se encuentra en el PATH. No se pudieron instalar las dependencias."
}

# 5. Instalar Playwright Chromium
Write-Info "[5/8] Instalando Playwright Chromium..."
if ($nodeCmd) {
    try {
        Set-Location "C:\OpenClaw"
        $env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\ms-playwright"
        Write-Info "Instalando navegador Chromium para Playwright..."
        npx playwright install chromium
        Write-Ok "Playwright Chromium descargado y listo."
    } catch {
        Write-Warn "Fallo al instalar Playwright Chromium: $_"
    }
}

# 6. Restaurar Variables de Entorno
Write-Info "[6/8] Restaurando variables de entorno..."
$envXmlPath = Join-Path $tempRestoreDir "environment_variables.xml"
if (Test-Path $envXmlPath) {
    $envVars = Import-Clixml -Path $envXmlPath
    foreach ($var in $envVars) {
        [System.Environment]::SetEnvironmentVariable($var.Name, $var.Value, "User")
        $env:$($var.Name) = $var.Value
        Write-Ok "Variable restaurada: $($var.Name) = $($var.Value)"
    }
    Write-Ok "Variables de entorno restauradas en la sesión del usuario."
} else {
    Write-Warn "No se encontró el archivo xml de variables de entorno."
}

# 7. Configurar reglas del Firewall de Windows
Write-Info "[7/8] Configurando reglas del Firewall de Windows..."
try {
    # Eliminar regla antigua si existe
    Remove-NetFirewallRule -DisplayName "OpenClaw Gateway Local" -ErrorAction SilentlyContinue
    
    # Añadir nueva regla estricta para localhost (loopback únicamente)
    New-NetFirewallRule -DisplayName "OpenClaw Gateway Local" `
                        -Direction Inbound `
                        -LocalPort 18789 `
                        -Protocol TCP `
                        -Action Allow `
                        -RemoteAddress 127.0.0.1 `
                        -Description "Permitir conexiones de loopback para OpenClaw Gateway en puerto 18789"
    Write-Ok "Regla de Firewall 'OpenClaw Gateway Local' agregada (localhost solo)."
} catch {
    Write-Warn "No se pudo configurar el Firewall. Asegúrese de ejecutar PowerShell con permisos de Administrador."
}

# 8. Mover POST_INSTALL_CHECKLIST.md al escritorio para fácil acceso
$checklistSrc = Join-Path $tempRestoreDir "POST_INSTALL_CHECKLIST.md"
if (Test-Path $checklistSrc) {
    $desktopPath = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
    if (Test-Path $desktopPath) {
        Copy-Item -Path $checklistSrc -Destination $desktopPath -Force
        Write-Ok "Se ha copiado el POST_INSTALL_CHECKLIST.md en tu Escritorio para verificar la instalación."
    }
}

# Limpieza temporal
Remove-Item -Path $tempRestoreDir -Recurse -Force

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  RESTAURACIÓN DEL ENTORNO COMPLETADA" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Info "Pasos manuales recomendados:"
Write-Info "1. Abra una nueva terminal para cargar las variables de entorno restauradas."
Write-Info "2. Ejecute el script Diagnose-OpenClaw.ps1 para verificar que todo esté en perfecto estado."
Write-Info "3. Inicie OpenClaw con el script start-openclaw.bat."
