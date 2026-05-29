#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Export-OpenClawEnvironment.ps1
#  PROPÓSITO: Exportación completa y backup del entorno de OpenClaw + Configuración.
#  REQUISITOS: PowerShell 5.1+ (Ejecutar como Administrador recomendado para Tareas/Firewall)
# ==============================================================================

param(
    [string]$BackupPath = "C:\OpenClaw_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-ErrorMsg($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  EXPORTACIÓN Y RESPALDO DEL ENTORNO OPENCLAW" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Info "Iniciando proceso de backup..."
Write-Info "Ruta de destino: $BackupPath"

# Crear directorio de backup si no existe
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Ok "Directorio de destino creado."
}

# 1. Configuración de OpenClaw (.openclaw en el perfil de usuario)
Write-Info "[1/8] Exportando configuraciones en %USERPROFILE%\.openclaw ..."
$userProfileDir = "$env:USERPROFILE\.openclaw"
if (Test-Path $userProfileDir) {
    $destUserDir = Join-Path $BackupPath "user_profile_openclaw"
    New-Item -ItemType Directory -Path $destUserDir -Force | Out-Null
    
    # Copiar recursivamente omitiendo logs o temporales pesados si los hubiera
    Copy-Item -Path $userProfileDir -Destination $destUserDir -Recurse -Force -Exclude @("logs", "cache", "*.tmp")
    Write-Ok "Configuraciones copiadas con éxito a: $destUserDir"
} else {
    Write-Warn "No se encontró el directorio de configuración de OpenClaw en: $userProfileDir"
}

# 2. Copia del directorio principal C:\OpenClaw (instalación principal)
Write-Info "[2/8] Exportando directorio base C:\OpenClaw ..."
$baseDir = "C:\OpenClaw"
if (Test-Path $baseDir) {
    $destBaseDir = Join-Path $BackupPath "C_OpenClaw"
    New-Item -ItemType Directory -Path $destBaseDir -Force | Out-Null
    
    # Copiar excluyendo node_modules para mantener el backup liviano y rápido
    Copy-Item -Path $baseDir -Destination $destBaseDir -Recurse -Force -Exclude @("node_modules", "logs", "backups", "chromium", "ms-playwright")
    Write-Ok "Directorio base copiado (excluyendo node_modules y logs)."
} else {
    Write-Warn "No se encontró el directorio base en C:\OpenClaw."
}

# 3. Guardar Variables de Entorno
Write-Info "[3/8] Exportando variables de entorno del sistema y usuario..."
$envVars = Get-ChildItem Env: | Where-Object { 
    $_.Name -like "OPENCLAW*" -or $_.Name -like "NODE*" -or $_.Name -like "PLAYWRIGHT*" 
}
$envVars | Export-Clixml -Path (Join-Path $BackupPath "environment_variables.xml")
Write-Ok "Variables de entorno guardadas en xml."

# 4. Exportar Tareas Programadas de Windows
Write-Info "[4/8] Buscando tareas programadas de OpenClaw..."
$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "*OpenClaw*" }
if ($tasks) {
    $destTasks = Join-Path $BackupPath "scheduled_tasks"
    New-Item -ItemType Directory -Path $destTasks -Force | Out-Null
    foreach ($task in $tasks) {
        Export-ScheduledTask -TaskName $task.TaskName | Out-File (Join-Path $destTasks "$($task.TaskName).xml") -Encoding UTF8
    }
    Write-Ok "Tareas programadas exportadas en XML."
} else {
    Write-Ok "No se detectaron tareas programadas de Windows relacionadas con OpenClaw."
}

# 5. Exportar Reglas de Firewall
Write-Info "[5/8] Exportando reglas de Firewall para OpenClaw (puerto 18789)..."
try {
    $fwRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*OpenClaw*" -or $_.Name -like "*18789*" }
    if ($fwRules) {
        $fwRules | Select-Object Name, DisplayName, Description, DisplayGroup, Direction, Action, Enabled, Protocol, LocalPort | 
            Export-Clixml -Path (Join-Path $BackupPath "firewall_rules.xml")
        Write-Ok "Reglas de Firewall exportadas."
    } else {
        Write-Ok "No se encontraron reglas específicas de Firewall."
    }
} catch {
    Write-Warn "No se pudieron exportar las reglas de Firewall. Asegúrese de ejecutar como Administrador."
}

# 6. Inventario de Software y Versiones
Write-Info "[6/8] Generando inventario de versiones de software..."
$softwareVersions = [ordered]@{
    "ExportDate"       = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "OS"               = (Get-CimInstance Win32_OperatingSystem).Caption
    "OS_Version"       = (Get-CimInstance Win32_OperatingSystem).Version
    "Node_Version"     = (node --version 2>&1).ToString().Trim()
    "NPM_Version"      = (npm --version 2>&1).ToString().Trim()
    "Git_Version"      = (git --version 2>&1).ToString().Trim()
    "Playwright_Ver"   = (npx playwright --version 2>&1).ToString().Trim()
}
$softwareVersions | ConvertTo-Json | Out-File (Join-Path $BackupPath "software_versions.json") -Encoding UTF8
Write-Ok "Archivo de versiones guardado (software_versions.json)."

# 7. Crear el Checklist de Validación Post-Instalación
Write-Info "[7/8] Creando checklist de validación automatizada..."
$checklistContent = @"
# CHECKLIST DE VALIDACIÓN POST-RESTAURACIÓN

Este checklist permite verificar paso a paso que el entorno OpenClaw se ha restaurado con total fidelidad en el equipo de destino.

## 1. Comprobaciones de Infraestructura Base
- [ ] Windows 10/11 Pro (x64) con PowerShell 5.1+ o 7+ instalado.
- [ ] Node.js (v24.x LTS recomendado, versión actual: $($softwareVersions.Node_Version)) y npm ($($softwareVersions.NPM_Version)) disponibles en PATH.
- [ ] Git ($($softwareVersions.Git_Version)) disponible en el PATH del sistema.

## 2. Archivos y Estructuras de Directorios
- [ ] Directorio `C:\OpenClaw` restaurado con sus lanzadores y dependencias.
- [ ] Directorio `%USERPROFILE%\.openclaw` y archivo `openclaw.json` de configuración presentes.
- [ ] Workspace del agente con `MEMORY.md`, `AGENTS.md` y `SOUL.md` en su ruta correspondiente.

## 3. Configuración y Servicios
- [ ] El archivo de configuración `openclaw.json` cuenta con el puerto de escucha `18789`.
- [ ] Se configuró la API Key de Google Gemini válida (`google_api_key` o `apiKey` en el proveedor `google`).
- [ ] Se configuraron correctamente las variables de entorno asociadas en la sesión del usuario.
- [ ] El Firewall de Windows tiene una regla para habilitar tráfico local por el puerto `18789`.

## 4. Skills y Automatizaciones
- [ ] El skill `perplexity-search` está presente en la ruta correspondiente de skills.
- [ ] Playwright y Chromium están correctamente instalados en `%LOCALAPPDATA%\ms-playwright`.
- [ ] Se deshabilitó el Heartbeat para evitar cargos innecesarios en la API.

## 5. Pruebas Funcionales
- [ ] Se ejecuta `C:\OpenClaw\start-openclaw.bat` e inicia el Gateway sin errores.
- [ ] Acceso web a http://localhost:18789 / Panel de control cargado correctamente.
- [ ] El Gateway responde y procesa prompts de IA con Gemini 2.5 Flash de forma ágil.
- [ ] Las búsquedas en internet vía Perplexity-Search devuelven resultados correctos sin bloqueos.

---
Fecha de Verificación: ________________________
SRE / Administrador: _________________________
"@
$checklistContent | Out-File (Join-Path $BackupPath "POST_INSTALL_CHECKLIST.md") -Encoding UTF8
Write-Ok "Checklist POST_INSTALL_CHECKLIST.md generado."

# 8. Compresión en formato ZIP
Write-Info "[8/8] Comprimiendo el backup en formato ZIP..."
$zipPath = "$BackupPath.zip"
try {
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path "$BackupPath\*" -DestinationPath $zipPath -Force
    Write-Ok "Backup comprimido exitosamente en: $zipPath"
    
    # Limpieza del directorio temporal exportado
    Remove-Item -Path $BackupPath -Recurse -Force
    Write-Ok "Limpieza de archivos temporales completada."
} catch {
    Write-Warn "No se pudo crear el archivo ZIP. Los archivos de backup se mantienen en: $BackupPath"
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  PROCESO DE RESPALDO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
