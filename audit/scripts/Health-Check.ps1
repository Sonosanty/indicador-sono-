#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Health-Check.ps1
#  PROPÓSITO: Verificación periódica rápida (Heartbeat/Health-Check) del Gateway.
#  DISEÑO: Genera un retorno JSON o texto estructurado útil para monitorización.
# ==============================================================================

$ErrorActionPreference = "SilentlyContinue"

$gatewayUrl = "http://localhost:18789"
$healthCheckLog = "C:\OpenClaw\logs\health-check.log"

$status = [ordered]@{
    "Timestamp"   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    "GatewayUrl"  = $gatewayUrl
    "Online"      = $false
    "StatusCode"  = $null
    "NodeActive"  = $false
    "RAM_Available_MB" = $null
    "Disk_Free_GB"     = $null
    "OverallHealth"    = "RED"
}

# 1. Comprobar si Node.js está activo
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    $status.NodeActive = $true
}

# 2. Comprobar si el puerto responde a una solicitud Web local
try {
    # Usar System.Net.HttpWebRequest o Invoke-WebRequest de forma compatible
    $response = Invoke-WebRequest -Uri "$gatewayUrl/health" -TimeoutSec 5 -UseBasicParsing
    $status.StatusCode = $response.StatusCode
    if ($response.StatusCode -eq 200) {
        $status.Online = $true
    }
} catch {
    # Fallback al puerto básico TCP
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect("localhost", 18789, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($success) {
            $tcpClient.EndConnect($connect)
            $status.Online = $true
            $status.StatusCode = 200
        }
        $tcpClient.Close()
    } catch {}
}

# 3. Métricas de Sistema
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
if ($os) {
    $status.RAM_Available_MB = [Math]::Round($os.FreePhysicalMemory / 1024, 2)
}

$drive = Get-PSDrive C -ErrorAction SilentlyContinue
if ($drive) {
    $status.Disk_Free_GB = [Math]::Round($drive.Free / 1GB, 2)
}

# 4. Determinar estado de salud general
if ($status.Online -eq $true -and $status.NodeActive -eq $true -and ($status.Disk_Free_GB -gt 2)) {
    $status.OverallHealth = "GREEN"
} elseif ($status.Online -eq $true -or $status.NodeActive -eq $true) {
    $status.OverallHealth = "YELLOW"
} else {
    $status.OverallHealth = "RED"
}

# Convertir a JSON
$jsonResult = $status | ConvertTo-Json -Compress

# Registrar resultado en logs si la carpeta existe
$logDir = [System.IO.Path]::GetDirectoryName($healthCheckLog)
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
"[$($status.Timestamp)] $($status.OverallHealth) - Online: $($status.Online), RAM_Free: $($status.RAM_Available_MB)MB, Disk_Free: $($status.Disk_Free_GB)GB" | Out-File $healthCheckLog -Append -Encoding UTF8

# Retornar el JSON para integraciones o monitores de SRE
Write-Output $jsonResult

# Código de salida basado en la salud
if ($status.OverallHealth -eq "GREEN") {
    exit 0
} elseif ($status.OverallHealth -eq "YELLOW") {
    exit 1
} else {
    exit 2
}
