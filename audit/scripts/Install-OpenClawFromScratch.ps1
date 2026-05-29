#Requires -Version 5.1
# ==============================================================================
#  SCRIPT: Install-OpenClawFromScratch.ps1
#  PROPÓSITO: Instalación completa automatizada de OpenClaw + Perplexity Search desde cero.
#  REQUISITOS: PowerShell 5.1+ (Ejecutar como Administrador para instalar paquetes)
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$GeminiKey,
    [string]$TargetDir = "C:\OpenClaw",
    [switch]$SkipBrowsers,
    [switch]$InstallExtraDevTools
)

$ErrorActionPreference = "Stop"

function Log-Info($m) { Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function Log-Ok($m) { Write-Host "[OK]    $m" -ForegroundColor Green }
function Log-Warn($m) { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function Log-Err($m) { Write-Host "[ERROR] $m" -ForegroundColor Red }

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR AUTOMATIZADO COMPLETO DE OPENCLAW (SRE/SANTY)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Log-Info "Destino de la instalación: $TargetDir"

# 1. Privilegios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Log-Err "Este script debe ejecutarse con permisos de Administrador para instalar programas y configurar el Firewall."
    exit 1
}

# 2. Detener instancias anteriores
Log-Info "Deteniendo procesos anteriores..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
try { schtasks /Delete /TN "OpenClaw Gateway" /F 2>&1 | Out-Null } catch {}

# 3. Instalación de Node.js, Git y utilidades vía Winget
Log-Info "Verificando herramientas requeridas..."
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Log-Info "Instalando Node.js LTS vía Winget..."
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    } else {
        Log-Info "Winget no disponible. Descargando instalador MSI de Node.js v24.15.0..."
        $msiUrl = "https://nodejs.org/dist/v24.15.0/node-v24.15.0-x64.msi"
        $msiPath = "$env:TEMP\node-install.msi"
        (New-Object System.Net.WebClient).DownloadFile($msiUrl, $msiPath)
        Log-Info "Instalando Node.js de forma silenciosa..."
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart ADDLOCAL=ALL" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    }
}
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath -and (Get-Command winget -ErrorAction SilentlyContinue)) {
    Log-Info "Instalando Git vía Winget..."
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
}

# Refrescar Variables de Entorno de la Sesión Actual
$mPath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
$uPath = [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path = "$mPath;$uPath"

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Log-Err "Node.js no está disponible en el PATH tras la instalación. Reinicie PowerShell e intente de nuevo."
    exit 1
}
Log-Ok "Node.js detectado: $(node --version)"
Log-Ok "npm detectado: $(npm --version)"

# Instalar herramientas de desarrollo adicionales si se solicita
if ($InstallExtraDevTools -and (Get-Command winget -ErrorAction SilentlyContinue)) {
    Log-Info "Instalando herramientas adicionales (VS Code, PostgreSQL, Docker)..."
    winget install --id Microsoft.VisualStudioCode -e --silent
    winget install --id PostgreSQL.PostgreSQL -e --silent
    winget install --id Docker.DockerDesktop -e --silent
    Log-Ok "Herramientas de desarrollo adicionales instaladas."
}

# 4. Crear estructura de directorios
$dirs = @(
    $TargetDir,
    "$TargetDir\logs",
    "$TargetDir\backups",
    "$TargetDir\workspace",
    "$TargetDir\skills",
    "$TargetDir\gateway"
)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
    Log-Ok "Directorio garantizado: $d"
}

# 5. Instalar OpenClaw globalmente
Log-Info "Instalando OpenClaw vía npm de forma global (openclaw@latest)..."
$env:SHARP_IGNORE_GLOBAL_LIBVIPS = "1"
npm install -g openclaw@latest --legacy-peer-deps --silent
Log-Ok "Instalación global de OpenClaw finalizada."

# 6. Crear archivo openclaw.json de configuración
$cfgDir = "$env:USERPROFILE\.openclaw"
if (-not (Test-Path $cfgDir)) {
    New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
}

$cfgPath = Join-Path $cfgDir "openclaw.json"
$now = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

# Generar un token único de autenticación interna para el Gateway
$token = ([System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")).Substring(0,48)

$jsonConfig = @"
{
  "agents": {
    "defaults": {
      "workspace": "$($TargetDir.Replace('\', '\\'))\\workspace",
      "model": "google/gemini-2.5-flash",
      "contextTokens": 200000,
      "heartbeat": { "every": "" },
      "sandbox": { "mode": "off" },
      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 40000
      }
    },
    "list": [
      { "id": "main", "default": true, "model": "google/gemini-2.5-flash" }
    ]
  },
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "$token"
    },
    "tailscale": { "mode": "off", "resetOnExit": false },
    "controlUi": { "allowInsecureAuth": false },
    "nodes": {
      "denyCommands": ["camera.snap","camera.clip","screen.record","sms.send"]
    }
  },
  "models": {
    "providers": {
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
        "apiKey": "$GeminiKey",
        "models": [{ "id": "gemini-2.5-flash" }, { "id": "gemini-2.0-flash" }]
      }
    }
  },
  "auth": {
    "profiles": {
      "google:default": {
        "provider": "google",
        "mode": "api_key"
      }
    }
  },
  "session": {
    "dmScope": "per-channel-peer"
  },
  "tools": {
    "profile": "coding"
  },
  "logging": {
    "level": "warn"
  },
  "wizard": {
    "lastRunAt": "$now",
    "lastRunVersion": "2026.5.24",
    "lastRunCommand": "install",
    "lastRunMode": "local"
  },
  "meta": {
    "lastTouchedVersion": "2026.5.24",
    "lastTouchedAt": "$now"
  }
}
"@

[System.IO.File]::WriteAllText($cfgPath, $jsonConfig, [System.Text.UTF8Encoding]::new($false))
Log-Ok "Configuración openclaw.json escrita exitosamente."

# Desactivar Heartbeat creando HEARTBEAT.md en workspace
$hbPath = Join-Path $TargetDir "workspace\HEARTBEAT.md"
[System.IO.File]::WriteAllText($hbPath, "# Heartbeat Desactivado`r`n", [System.Text.Encoding]::UTF8)
Log-Ok "HEARTBEAT.md creado en el workspace de OpenClaw."

# 7. Inicializar directorio base C:\OpenClaw como un package de Node.js
Set-Location $TargetDir
$pkgJson = @"
{
  "name": "openclaw-tools",
  "version": "1.0.0",
  "type": "module",
  "description": "Herramientas locales para OpenClaw y automatización de búsquedas",
  "scripts": {}
}
"@
[System.IO.File]::WriteAllText("package.json", $pkgJson, [System.Text.UTF8Encoding]::new($false))

# Instalar Playwright para la automatización local
Log-Info "Instalando Playwright localmente para la automatización web..."
npm install playwright --silent

if (-not $SkipBrowsers) {
    Log-Info "Descargando e instalando el navegador Chromium de Playwright (puede tardar 2-3 minutos)..."
    $env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\ms-playwright"
    npx playwright install chromium
    Log-Ok "Navegador Chromium de Playwright instalado en $env:PLAYWRIGHT_BROWSERS_PATH."
}

# 8. Instalar Skill Personalizado perplexity-search
$skillDir = "$TargetDir\skills\perplexity-search"
if (-not (Test-Path $skillDir)) {
    New-Item -ItemType Directory -Path $skillDir -Force | Out-Null
}

$skillJson = @"
{
  "name": "perplexity-search",
  "version": "1.0.0",
  "description": "Búsqueda web en tiempo real usando Perplexity.ai y Playwright",
  "type": "skill",
  "entry": "perplexity-search.mjs",
  "capabilities": ["web-search", "real-time-info"],
  "enabled": true
}
"@
[System.IO.File]::WriteAllText("$skillDir\skill.json", $skillJson, [System.Text.UTF8Encoding]::new($false))

# Script MJS del skill Perplexity
$skillScript = @'
import { chromium } from "playwright";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
    console.log(JSON.stringify({ success: false, text: "", error: "No query provided" }));
    process.exit(0);
}

const CHROMIUM_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.env.LOCALAPPDATA + "\\ms-playwright");

let browser;
try {
    browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    });

    // Navegar de forma segura y esperar a que el DOM cargue
    await page.goto("https://www.perplexity.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Evadir diálogos de cookies molestos
    await page.evaluate(() => {
        document.querySelectorAll('[id*="cookie"], [class*="consent"], [class*='modal']')
            .forEach(el => el.remove());
    });

    // Localizar textarea de búsqueda y rellenar la consulta
    const inputSel = "textarea[placeholder*='Ask'], textarea[name='q'], input[type='text']";
    await page.waitForSelector(inputSel, { timeout: 15000 });
    await page.fill(inputSel, query);
    await page.keyboard.press("Enter");

    // Esperar respuesta (con márgenes de seguridad para evitar fallos de renderizado)
    await page.waitForTimeout(8000);
    await page.waitForSelector(".prose, [class*='answer'], [class*='result'], [class*='markdown']", {
        timeout: 20000
    }).catch(() => {});
    await page.waitForTimeout(3000);

    // Extraer la respuesta prose
    const text = await page.evaluate(() => {
        const selectors = [
            ".prose", "[class*='AnswerText']", "[class*='answer-text']",
            "[class*='markdown']", "[class*='result-content']", "[data-testid='answer']"
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText && el.innerText.length > 50) {
                return el.innerText.trim();
            }
        }
        // Fallback: extraer líneas largas de la página
        const bodyText = document.body ? document.body.innerText : "";
        const lines = bodyText.split("\n").filter(l => l.trim().length > 40);
        return lines.slice(0, 15).join("\n");
    });

    await browser.close();

    console.log(JSON.stringify({
        success: true,
        text: text || "No se pudo extraer la respuesta final de la página.",
        query: query,
        source: "perplexity.ai"
    }));

} catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify({
        success: false,
        text: "",
        error: err.message,
        query: query
    }));
}
'@
[System.IO.File]::WriteAllText("$skillDir\perplexity-search.mjs", $skillScript, [System.Text.UTF8Encoding]::new($false))
Log-Ok "Skill perplexity-search escrito e instalado."

# 9. Crear el archivo start-openclaw.bat (lanzador manual rápido)
$launcherPath = Join-Path $TargetDir "start-openclaw.bat"
$launcherContent = @"
@echo off
title OpenClaw Gateway
echo ==========================================================
echo  INICIANDO GATEWAY DE OPENCLAW (MODO MANUAL)
echo ==========================================================
echo  Puerto de escucha: 18789
echo  Modelo por defecto: Gemini 2.5 Flash
echo  Workspace: %USERPROFILE%\.openclaw\workspace
echo ==========================================================

:: Forzar conexiones Telegram por IPv4 únicamente para evitar bloqueos
set OPENCLAW_TELEGRAM_IPV4_ONLY=1

:: Forzar ruta del navegador Playwright
set PLAYWRIGHT_BROWSERS_PATH=%LOCALAPPDATA%\ms-playwright

:: Lanzar OpenClaw
openclaw gateway start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] No se pudo arrancar OpenClaw Gateway.
    echo Revisa la configuracion en %USERPROFILE%\.openclaw\openclaw.json o ejecuta Diagnose-OpenClaw.ps1
    pause
)
"@
[System.IO.File]::WriteAllText($launcherPath, $launcherContent, [System.Text.Encoding]::ASCII)
Log-Ok "Lanzador 'start-openclaw.bat' creado correctamente."

# 10. Configurar la regla de Firewall
try {
    Remove-NetFirewallRule -DisplayName "OpenClaw Gateway Local" -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "OpenClaw Gateway Local" `
                        -Direction Inbound `
                        -LocalPort 18789 `
                        -Protocol TCP `
                        -Action Allow `
                        -RemoteAddress 127.0.0.1 `
                        -Description "Aprobado para loopback OpenClaw" | Out-Null
    Log-Ok "Regla de Firewall establecida para puerto 18789 (localhost)."
} catch {
    Log-Warn "No se pudo registrar la regla del Firewall. Asegúrese de tener privilegios de Administrador."
}

# 11. Crear un acceso directo al start-openclaw.bat en el Escritorio
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $desktopPath = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
    $shortcut = $WshShell.CreateShortcut(Join-Path $desktopPath "OpenClaw Gateway.lnk")
    $shortcut.TargetPath = $launcherPath
    $shortcut.WorkingDirectory = $TargetDir
    $shortcut.Description = "Iniciar el asistente inteligente local OpenClaw"
    $shortcut.IconLocation = "shell32.dll,220" # Icono de un engranaje o asistente
    $shortcut.Save()
    Log-Ok "Acceso directo creado en el Escritorio."
} catch {
    Log-Warn "No se pudo crear el acceso directo en el Escritorio."
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ¡PROCESO DE INSTALACIÓN COMPLETADO CON ÉXITO!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Log-Info "Para iniciar su asistente:"
Log-Info "1. Haga doble clic en el acceso directo de su Escritorio o ejecute: $launcherPath"
Log-Info "2. Acceda a la interfaz gráfica en su navegador: http://127.0.0.1:18789"
Log-Info "3. Utilice Diagnose-OpenClaw.ps1 para cualquier verificación en el futuro."
Write-Host ""
