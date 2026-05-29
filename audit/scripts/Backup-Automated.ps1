#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Backup-Automated.ps1
#  PROPÓSITO: Respaldo automático diario de configuración, memorias y base de OpenClaw.
#  DISEÑO: Ejecutable silencioso para programar en Task Scheduler de Windows.
#  REPOSITORIO RESPALDO: C:\OpenClaw\backups
# ==============================================================================

$ErrorActionPreference = "Stop"

$baseDir = "C:\OpenClaw"
$backupsDir = Join-Path $baseDir "backups"
$logsDir = Join-Path $baseDir "logs"
$logFile = Join-Path $logsDir "backup-automated.log"

# Crear directorios si no existen
if (-not (Test-Path $backupsDir)) { New-Item -ItemType Directory -Path $backupsDir -Force | Out-Null }
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

# Función de logueo interno
function Write-Log($msg, $level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formattedMsg = "[$timestamp] [$level] $msg"
    $formattedMsg | Out-File $logFile -Append -Encoding UTF8
    Write-Output $formattedMsg
}

Write-Log "Iniciando proceso de respaldo automatizado..."

try {
    # 1. Crear nombre de archivo temporal y final
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $tempBackupFolder = Join-Path $env:TEMP "OpenClaw_AutoBackup_$timestamp"
    $finalZipName = "OpenClaw_Backup_$timestamp.zip"
    $finalZipPath = Join-Path $backupsDir $finalZipName
    
    New-Item -ItemType Directory -Path $tempBackupFolder -Force | Out-Null
    
    # 2. Copiar configuraciones del usuario (%USERPROFILE%\.openclaw)
    $userConfigDir = "$env:USERPROFILE\.openclaw"
    if (Test-Path $userConfigDir) {
        $destUser = Join-Path $tempBackupFolder "user_profile_openclaw"
        New-Item -ItemType Directory -Path $destUser -Force | Out-Null
        Copy-Item -Path $userConfigDir -Destination $destUser -Recurse -Force -Exclude @("logs", "cache", "*.tmp")
        Write-Log "Configuraciones del usuario empaquetadas."
    } else {
        Write-Log "No se encontró el directorio de configuración del usuario." "WARN"
    }
    
    # 3. Copiar directorio de trabajo C:\OpenClaw
    if (Test-Path $baseDir) {
        $destBase = Join-Path $tempBackupFolder "C_OpenClaw"
        New-Item -ItemType Directory -Path $destBase -Force | Out-Null
        Copy-Item -Path $baseDir -Destination $destBase -Recurse -Force -Exclude @("node_modules", "logs", "backups", "chromium", "ms-playwright", "workspace")
        
        # También salvaguardar por separado la carpeta de workspace que es donde vive la memoria viva
        $workspacePath = Join-Path $baseDir "workspace"
        if (Test-Path $workspacePath) {
            $destWk = Join-Path $tempBackupFolder "C_OpenClaw_Workspace"
            New-Item -ItemType Directory -Path $destWk -Force | Out-Null
            Copy-Item -Path $workspacePath -Destination $destWk -Recurse -Force
        }
        Write-Log "Archivos base de C:\OpenClaw empaquetados."
    }
    
    # 4. Comprimir el backup en un ZIP
    Write-Log "Comprimiendo backup en: $finalZipPath ..."
    Compress-Archive -Path "$tempBackupFolder\*" -DestinationPath $finalZipPath -Force
    Write-Log "Backup creado y comprimido exitosamente: $finalZipName"
    
    # Limpieza de temporales
    Remove-Item -Path $tempBackupFolder -Recurse -Force
    
    # 5. Rotación de Backups (Retener solo los últimos 7 días)
    Write-Log "Evaluando política de retención de copias antiguas (Retención: 7 días)..."
    $retentionDays = 7
    $limitDate = (Get-Date).AddDays(-$retentionDays)
    
    $backupsCount = 0
    $deletedCount = 0
    
    Get-ChildItem -Path $backupsDir -Filter "OpenClaw_Backup_*.zip" | ForEach-Object {
        $backupsCount++
        if ($_.CreationTime -lt $limitDate) {
            Write-Log "Eliminando backup antiguo por exceder límite de retención: $($_.Name) (Creado: $($_.CreationTime))" "INFO"
            Remove-Item $_.FullName -Force
            $deletedCount++
        }
    }
    
    Write-Log "Política de retención aplicada. Copias totales encontradas: $backupsCount, Copias eliminadas: $deletedCount, Copias preservadas: $($backupsCount - $deletedCount)."
    Write-Log "Respaldo automatizado finalizado correctamente." "SUCCESS"

} catch {
    Write-Log "El respaldo automatizado falló: $($_.Exception.Message)" "FATAL"
    exit 1
}
