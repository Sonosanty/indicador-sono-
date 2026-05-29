#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Diagnose-OpenClaw.ps1
#  PROPOSITO: Diagnostico completo y analisis de fallos en el ecosistema OpenClaw.
#  REQUISITOS: PowerShell 5.1+
# ==============================================================================

function Print-Info($m) { Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function Print-Ok($m) { Write-Host "[OK]    $m" -ForegroundColor Green }
function Print-Warn($m) { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function Print-Err($m) { Write-Host "[ERROR] $m" -ForegroundColor Red }
function Print-Sub($m) { Write-Host "  -> $m" -ForegroundColor Gray }

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  HERRAMIENTA DE DIAGNOSTICO AVANZADO DE OPENCLAW (SRE)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobacion de Instalacion y Rutas
Print-Info "1. Validando rutas del sistema..."
$baseDir = "C:\OpenClaw"
$configDir = "$env:USERPROFILE\.openclaw"
$configJson = Join-Path $configDir "openclaw.json"

if (Test-Path $baseDir) {
    Print-Ok "Directorio base de OpenClaw existe ($baseDir)."
} else {
    Print-Err "Directorio base C:\OpenClaw NO existe."
}

if (Test-Path $configDir) {
    Print-Ok "Directorio de perfil de OpenClaw existe ($configDir)."
} else {
    Print-Err "Directorio de perfil $configDir NO existe."
}

# 2. Validacion de archivo de configuracion JSON
Print-Info "2. Validando integridad de openclaw.json..."
if (Test-Path $configJson) {
    try {
        $rawJson = Get-Content $configJson -Raw
        $json = ConvertFrom-Json $rawJson
        Print-Ok "El archivo openclaw.json esta bien formado y es un JSON valido."
        
        # Verificar modelo configurado
        $model = $null
        if ($json.agents -and $json.agents.defaults -and $json.agents.defaults.model) {
            $model = $json.agents.defaults.model
        } elseif ($json.models -and $json.models.primary) {
            $model = $json.models.primary
        }
        
        if ($model) {
            Print-Sub "Modelo IA configurado: $model"
        } else {
            Print-Warn "No se pudo identificar un modelo por defecto en el JSON."
        }
        
        # Verificar si existe el perfil 'google:manual' (origen comun de timeouts)
        $authProfiles = $null
        if ($json.auth -and $json.auth.profiles) {
            $authProfiles = $json.auth.profiles
        }
        
        if ($authProfiles) {
            $manualProfile = Get-Member -InputObject $authProfiles -Name "google:manual" -ErrorAction SilentlyContinue
            if ($manualProfile) {
                Print-Err "ALERTA: Se detecto un perfil 'google:manual' en las configuraciones de autenticacion."
                Print-Err "Esto causara problemas de expiracion de sesion y timeouts."
                Print-Err "Solucion: Reemplace 'google:manual' por 'google:default' usando API Key directa."
            } else {
                Print-Ok "No se detecto perfil corrupto 'google:manual'. Excelente."
            }
        }
        
        # Verificar puerto
        if ($json.gateway -and $json.gateway.port) {
            Print-Sub "Puerto de escucha configurado: $($json.gateway.port)"
        }
        
    } catch {
        Print-Err "El archivo openclaw.json esta CORRUPTO o tiene un formato de JSON invalido: $_"
        
        # Buscar backups de recuperacion
        $rejectedConfigs = Get-ChildItem -Path $configDir -Filter "*.rejected" -ErrorAction SilentlyContinue
        if ($rejectedConfigs) {
            Print-Warn "Se encontraron copias de recuperacion (.rejected):"
            foreach ($rc in $rejectedConfigs) {
                $rcSize = $rc.Length
                $rcName = $rc.Name
                Print-Sub "Copia encontrada: $rcName ($rcSize bytes)"
            }
            Print-Info "Sugerencia: Restaure la ultima copia valida renombrandola a openclaw.json."
        }
    }
} else {
    Print-Err "No se encuentra el archivo openclaw.json en: $configJson"
}

# 3. Comprobar Puertos y Conectividad
Print-Info "3. Evaluando puertos y sockets de red..."
$port = 18789
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    Print-Ok "El puerto $port esta ocupado/escuchando."
    foreach ($conn in $connections) {
        Print-Sub "Estado: $($conn.State) | PID: $($conn.OwningProcess) | IP Local: $($conn.LocalAddress)"
    }
} else {
    Print-Warn "No hay ningun servicio escuchando activamente en el puerto $port."
    Print-Warn "Esto indica que el Gateway de OpenClaw esta apagado o detenido."
}

# 4. Monitorizar Procesos de Node y Playwright
Print-Info "4. Analizando procesos de Node.js y navegadores..."
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Print-Ok "Se encontraron $($nodeProcs.Count) procesos de Node.js activos."
    foreach ($p in $nodeProcs) {
        Print-Sub "PID: $($p.Id) | CPU (s): $($p.CPU) | RAM (Working Set): $([Math]::Round($p.WorkingSet64 / 1MB, 2)) MB"
    }
} else {
    Print-Warn "No hay procesos de Node.js (node.exe) activos en el sistema."
}

$chromeProcs = Get-Process -Name chrome, chromium, headless_shell -ErrorAction SilentlyContinue
if ($chromeProcs) {
    Print-Ok "Se detectaron $($chromeProcs.Count) procesos de navegador (Chromium/Playwright) en ejecucion."
} else {
    Print-Sub "No hay procesos de navegadores automatizados ejecutandose de forma pasiva."
}

# 5. Evaluar Consumo de Recursos
Print-Info "5. Evaluando recursos del hardware..."
$os = Get-CimInstance Win32_OperatingSystem
$freeRamGb = [Math]::Round($os.FreePhysicalMemory / 1MB, 2)
$totalRamGb = [Math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$usedRamGb = $totalRamGb - $freeRamGb

Print-Sub "Memoria RAM: Usada $usedRamGb GB / Libre $freeRamGb GB de un total de $totalRamGb GB."

$systemDrive = Get-PSDrive C -ErrorAction SilentlyContinue
if ($systemDrive) {
    $freeDiskGb = [Math]::Round($systemDrive.Free / 1GB, 2)
    $usedDiskGb = [Math]::Round($systemDrive.Used / 1GB, 2)
    Print-Sub "Espacio de Disco C:\: Usado $usedDiskGb GB / Libre $freeDiskGb GB."
    if ($freeDiskGb -lt 5) {
        Print-Warn "ADVERTENCIA: Queda muy poco espacio libre en el Disco C: (< 5 GB). Playwright o los logs podrian fallar."
    }
}

# 6. Validar Permisos del Directorio Active Memory
Print-Info "6. Comprobando directorio de Active Memory..."
$memoryDir = Join-Path $configDir "workspace"
if (Test-Path $memoryDir) {
    Print-Ok "Directorio de memoria activa / workspace localizado."
    try {
        $testFile = Join-Path $memoryDir "test_write.tmp"
        "test" | Out-File $testFile -ErrorAction Stop
        Remove-Item $testFile -Force
        Print-Ok "Permisos de escritura NTFS validados correctamente (Acceso Total)."
    } catch {
        Print-Err "ERROR: No hay permisos de escritura en la carpeta de memoria activa: $_"
    }
} else {
    Print-Warn "No existe la carpeta workspace/memoria en: $memoryDir"
}

# 7. Inspeccionar Logs Recientes del Gateway
Print-Info "7. Leyendo las ultimas 15 lineas de logs de OpenClaw..."
$logPath = "C:\OpenClaw\logs\gateway.log"
# Fallback si esta en el perfil o en Temp
if (-not (Test-Path $logPath)) {
    $logPath = Join-Path $configDir "logs\gateway.log"
}
if (-not (Test-Path $logPath)) {
    $todayStr = Get-Date -Format "yyyy-MM-dd"
    $logPath = "$env:TEMP\openclaw\openclaw-$todayStr.log"
}

if (Test-Path $logPath) {
    Print-Sub "Archivo de logs localizado: $logPath"
    $logLines = Get-Content $logPath -Tail 15 -ErrorAction SilentlyContinue
    if ($logLines) {
        foreach ($line in $logLines) {
            Write-Host "   | $line" -ForegroundColor DarkGray
        }
    }
} else {
    Print-Warn "No se encontro ningun archivo de logs de Gateway activo en las rutas estandar."
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO FINALIZADO" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
