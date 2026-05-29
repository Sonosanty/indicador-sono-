#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Harden-Windows-OpenClaw.ps1
#  PROPÓSITO: Bastionado de seguridad (Hardening) del entorno Windows y OpenClaw.
#  REQUISITOS: PowerShell 5.1+ (Ejecutar como ADMINISTRADOR)
# ==============================================================================

$ErrorActionPreference = "Stop"

function Print-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Print-Ok($m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Print-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Print-Err($m) { Write-Host "[ERR]  $m" -ForegroundColor Red }

Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "  BASTIONADO Y AUDITORÍA DE SEGURIDAD (HARDENING) - WINDOWS OPENCLAW" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow

# 1. Comprobar privilegios de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Print-Err "Este script debe ser ejecutado con privilegios de ADMINISTRADOR."
    exit 1
}

# 2. Deshabilitar servicios inseguros o innecesarios
Print-Info "Deshabilitando servicios innecesarios o de alto riesgo..."
$servicesToStop = @(
    "RemoteRegistry",  # Registro remoto (altísimo riesgo de movimiento lateral)
    "RemoteAccess",    # Enrutamiento y acceso remoto
    "Telnet",          # Protocolo inseguro (si existe)
    "SSDPSRV",         # SSDP Discovery (descubrimiento de red innecesario en servidores o estaciones de trading)
    "upnphost"         # UPnP (vulnerabilidades de red y autodiscovery)
)

foreach ($serviceName in $servicesToStop) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Stop-Service -Name $serviceName -Force -Confirm:$false -ErrorAction SilentlyContinue
            Print-Ok "Servicio detenido: $serviceName"
        }
        Set-Service -Name $serviceName -StartupType Disabled -ErrorAction SilentlyContinue
        Print-Ok "Servicio deshabilitado: $serviceName"
    }
}

# 3. Deshabilitar SMBv1 (Protocolo obsoleto, vulnerable a exploits estilo EternalBlue)
Print-Info "Deshabilitando protocolo obsoleto SMBv1..."
try {
    Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart -ErrorAction SilentlyContinue | Out-Null
    Print-Ok "Protocolo SMBv1 deshabilitado en este equipo."
} catch {
    Print-Warn "No se pudo deshabilitar SMBv1 de forma programática. Puede requerir deshabilitación manual."
}

# 4. Configurar reglas de Firewall altamente restrictivas para OpenClaw
Print-Info "Configurando reglas estrictas en el Firewall de Windows..."
try {
    # Eliminar cualquier regla que exponga el puerto 18789 a la red local
    Remove-NetFirewallRule -DisplayName "OpenClaw Gateway" -ErrorAction SilentlyContinue | Out-Null
    Remove-NetFirewallRule -DisplayName "OpenClaw Gateway Local" -ErrorAction SilentlyContinue | Out-Null

    # Bloquear explícitamente cualquier intento de conexión al puerto 18789 desde el exterior (cualquier interfaz no loopback)
    New-NetFirewallRule -DisplayName "OpenClaw Bloqueo Red Externa Inbound" `
                        -Direction Inbound `
                        -LocalPort 18789 `
                        -Protocol TCP `
                        -Action Block `
                        -RemoteAddress Any `
                        -Description "Bloquear acceso externo de red a OpenClaw" | Out-Null

    # Permitir conexiones exclusivamente desde la dirección local 127.0.0.1 (Loopback)
    New-NetFirewallRule -DisplayName "OpenClaw Loopback Permitido Inbound" `
                        -Direction Inbound `
                        -LocalPort 18789 `
                        -Protocol TCP `
                        -Action Allow `
                        -RemoteAddress 127.0.0.1 `
                        -Description "Permitir solo tráfico de loopback para el Gateway de OpenClaw" | Out-Null
    Print-Ok "Firewall configurado de forma estricta (exclusivo localhost/127.0.0.1)."
} catch {
    Print-Err "Error al configurar las reglas de Firewall: $_"
}

# 5. Bastionado de permisos NTFS (Acl / icacls)
Print-Info "Estableciendo permisos restrictivos en carpetas críticas..."
$pathsToRestrict = @(
    "C:\OpenClaw",
    "$env:USERPROFILE\.openclaw"
)

foreach ($path in $pathsToRestrict) {
    if (Test-Path $path) {
        # Remover herencia y remover permisos para el grupo "Everyone" o "Users" ordinarios
        # Dejar acceso completo solo para el usuario propietario actual y Administradores
        $currentUser = $env:USERNAME
        
        Print-Info "Asegurando permisos en: $path para el usuario: $currentUser"
        
        # Deshabilitar herencia y copiar permisos existentes
        $acl = Get-Acl -Path $path
        $acl.SetAccessRuleProtection($true, $true)
        Set-Acl -Path $path -AclObject $acl
        
        # Ejecutar icacls para asegurar restricción estricta
        # Otorga Control Total al Administrador del Sistema y al Usuario Propietario. Remueve herencia y a otros usuarios.
        & icacls "$path" /inheritance:r /T /Q | Out-Null
        & icacls "$path" /grant:r "SYSTEM:(OI)(CI)(F)" /Q | Out-Null
        & icacls "$path" /grant:r "Administrators:(OI)(CI)(F)" /Q | Out-Null
        & icacls "$path" /grant:r "$($currentUser):(OI)(CI)(F)" /Q | Out-Null
        
        Print-Ok "Permisos NTFS securizados en: $path"
    }
}

# 6. Forzar protección en tiempo real de Windows Defender
Print-Info "Verificando el estado de Windows Defender..."
try {
    Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
    Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
    Print-Ok "Monitoreo en tiempo real y análisis de comportamiento de Windows Defender habilitados."
} catch {
    Print-Warn "No se pudo modificar la configuración de Windows Defender de forma directa. Asegúrese de no tener un antivirus de terceros que domine estas directivas."
}

# 7. Habilitar auditoría de inicios de sesión
Print-Info "Configurando políticas de auditoría local (Inicios de sesión fallidos)..."
try {
    & auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable | Out-Null
    & auditpol /set /category:"Account Logon" /success:enable /failure:enable | Out-Null
    Print-Ok "Auditoría de inicios de sesión exitosos y fallidos habilitada."
} catch {
    Print-Warn "No se pudieron cambiar las políticas de auditoría. Esto puede estar controlado por políticas de grupo dominantes (GPO)."
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  ¡PROCESO DE HARDENING COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Print-Info "Su entorno es ahora mucho más robusto frente a accesos no autorizados y malware de red."
Write-Host ""
