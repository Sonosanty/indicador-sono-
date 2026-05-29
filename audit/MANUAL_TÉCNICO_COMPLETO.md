# 👒 MANUAL TÉCNICO DE INFRAESTRUCTURA, CLONACIÓN Y TROUBLESHOOTING
**Ecosistema Avanzado SRE/DevOps: OpenClaw + Plataforma Web de Trading (Fino BTC / Sono)**
*Última Revisión Completa: 24 de Mayo de 2026*

---

## 🚀 INTRODUCCIÓN

Este manual técnico representa el estándar definitivo para el aprovisionamiento, bastionado de seguridad (hardening), diagnóstico y clonación del entorno de ejecución de **OpenClaw** coordinado con la **Plataforma Web de Trading de Criptomonedas (Sono / Fino BTC)**.

Diseñado bajo la perspectiva de Ingeniería de Confiabilidad de Sitios (SRE), este documento detalla de manera exhaustiva el inventario exacto del sistema actual, evalúa las políticas de seguridad de datos, describe el pipeline completo de automatización e instruye paso a paso sobre cómo replicar este entorno de forma idéntica en hardware limpio en menos de 30 minutos.

---

## 1. INVENTARIO COMPLETO DEL SISTEMA ACTUAL

El ecosistema opera sobre un entorno de alto rendimiento alojado localmente en Windows. A continuación, se presenta la radiografía exacta del hardware, sistema operativo, sockets de red y dependencias instaladas.

### 1.1 Especificaciones de Sistema Operativo y Arquitectura
- **Nombre del Sistema Operativo:** Microsoft Windows 11 Pro
- **Versión/Build:** 10.0.26200
- **Arquitectura:** x64 (64 bits, Procesador basado en Intel/AMD)
- **Idioma del Sistema:** Español (es-ES) con zona horaria configurada en `Europe/Madrid` (GMT+2 en horario de verano).
- **Arranque:** UEFI con modo Secure Boot activo.
- **Virtualización:** Hyper-V y Plataforma de Máquina Virtual habilitadas en la BIOS, dando soporte para subsistemas WSL2 y contenedores de Docker.

### 1.2 Usuarios y Privilegios
- **Usuario Operativo:** El entorno se ejecuta bajo la cuenta de usuario principal de Windows del desarrollador (`sparreno`), con privilegios administrativos locales.
- **Acceso NTFS:** El usuario propietario tiene derechos de Control Total sobre los directorios críticos de datos:
  - `C:\OpenClaw`
  - `C:\Users\sparreno\.openclaw`
- **Control de Cuentas de Usuario (UAC):** Configurado en el nivel por defecto (Notificar solo cuando las aplicaciones intenten realizar cambios).
- **Ejecución de PowerShell:** Directiva local de ejecución establecida en `RemoteSigned` a nivel de proceso y usuario local para permitir el lanzamiento de herramientas de aprovisionamiento.

### 1.3 Variables de Entorno Activas
Para asegurar el correcto funcionamiento de los canales de mensajería y la automatización web, se han inyectado en el registro de Windows del usuario las siguientes variables críticas:

| Variable | Valor Configurado | Propósito |
| :--- | :--- | :--- |
| `OPENCLAW_TELEGRAM_IPV4_ONLY` | `1` | Fuerza a la API de Telegram a ignorar DNS de IPv6, evitando timeouts en Windows. |
| `PLAYWRIGHT_BROWSERS_PATH` | `%LOCALAPPDATA%\ms-playwright` | Forzar la localización del binario Chromium Headless de Playwright. |
| `NODE_ENV` | `production` | Establece el nivel de optimización en librerías de Node.js de la API de Trading. |
| `OPENCLAW_PORT` | `18789` | Define el puerto por defecto de escucha del Gateway. |

### 1.4 Procesos y Sockets de Red Activos
El Gateway de OpenClaw opera en modo de **lanzamiento manual** mediante consola de comandos, evitando la rigidez de los servicios automáticos de Windows.

- **Proceso Gateway de OpenClaw:** `node.exe` (PID verificado: `8044`), con una huella de memoria en reposo de aproximadamente `343.73 MB`.
- **Zonas de Escucha (netstat):**
  - **Puerto 18789 (Gateway):** Enlazado estrictamente a la interfaz local `127.0.0.1` (localhost) en modo LISTENING. No es visible a la LAN.
  - **Puerto 3000 (React Frontend):** Escuchando de forma activa durante el desarrollo local.
  - **Puerto 3001 (WebSockets API):** Canal dinámico de comunicación duplex para la cotización de criptomonedas en tiempo real.
  - **Puerto 3002 (REST Backend API):** Procesa peticiones y lógica de negocio de órdenes de compra/venta.
  - **Puerto 5432 (PostgreSQL DB):** Sockets activos en loopback local de base de datos.

### 1.5 Dependencias Críticas del Ecosistema

#### A. Node.js Runtime Engine
- **Versión de Node:** `v24.15.0` (LTS más reciente).
- **Versión de npm:** `v11.12.1`.
- **Módulos Globales:** `openclaw` (instalado de forma nativa e inyectado en la consola del sistema).

#### B. Motor Playwright Browser Automation
- **Versión de Playwright:** `^1.42.0`.
- **Browser Integrado:** Chromium Headless (descargado en la caché global del sistema).
- **Dependencias de Sistema:** DLLs básicas de representación multimedia de Windows Media Feature Pack (requeridas por Chromium headless en servidores limpios).

---

## 2. AUDITORÍA COMPLETA DE OPENCLAW

Esta sección evalúa con lupa el estado de la instalación de OpenClaw, su configuración real de disco, los procesos de recuperación en caliente y sus skills activos.

### 2.1 Archivo de Configuración de Producción (`openclaw.json`)
El archivo de configuración maestro se localiza en `C:\Users\sparreno\.openclaw\openclaw.json`. Su estructura actual ha sido purgada de restos obsoletos (como el antiguo motor de Anthropic Claude y autenticaciones experimentales) para optimizar el consumo de RAM y el gasto financiero de la API de Google Gemini.

La configuración activa opera bajo las siguientes métricas de diseño:
- **Modelo Principal:** `google/gemini-2.5-flash`. Ofrece un equilibrio perfecto de costo cero (bajo el Free Tier de Google AI Studio) y una ventana de contexto masiva.
- **Tamaño de Contexto del Agente (`contextTokens`):** Configurado en `200000` tokens. Previene errores de saturación de memoria de Node.js al tiempo que permite al LLM retener largas cadenas de conversación e historiales técnicos completos de trading.
- **Desactivación de Heartbeat (Ahorro de API):** Configurado con la propiedad `"heartbeat": { "every": "" }` y reforzado mediante el archivo `HEARTBEAT.md` en el workspace. Esto detiene las llamadas periódicas de 30 minutos al LLM que inflaban de manera innecesaria la facturación mensual.
- **Restricción de Comandos en Nodos:** Configurada la inhabilitación explícita para llamadas a cámaras locales, grabaciones de pantalla y envíos de SMS por parte del motor del agente, limitando la superficie de ataque de malware.

### 2.2 Sistema de Recuperación y Resiliencia (`.rejected`)
OpenClaw incorpora un validador de esquemas JSON en caliente. Si el usuario edita el archivo `openclaw.json` e introduce una sintaxis rota (por ejemplo, una coma faltante, comillas desbalanceadas o claves no reconocidas por el core), el sistema aplica las siguientes medidas defensivas:
1. El motor rechaza la nueva configuración entrante para evitar fallos de inicialización que dejen el sistema fuera de línea.
2. Renombra automáticamente la configuración rota a `openclaw.json.rejected`.
3. Carga en memoria la última configuración funcional conocida o, en su defecto, regenera una configuración por defecto segura a partir del archivo de respaldo `.bak`.

*Sugerencia de SRE:* El script `Diagnose-OpenClaw.ps1` incorporado en este manual rastrea la existencia de archivos `.rejected` para alertar al administrador de cambios fallidos en la configuración.

### 2.3 Skill Personalizado de Producción: `perplexity-search` (v10)
El asistente inteligente no depende del navegador interno por defecto de OpenClaw (el cual sufre bloqueos ante captchas y muros de cookies en sitios complejos). En su lugar, utiliza un skill personalizado de alto rendimiento que realiza búsquedas en tiempo real en Perplexity.ai.

- **Ubicación en Disco:** `%USERPROFILE%\.openclaw\workspace\skills\perplexity-search\`
- **Tecnología:** Node.js (con módulo de importación nativo ES Modules `.mjs`) impulsando un navegador Chromium headless vía Playwright.
- **Medidas de Evasión Integradas:**
  - Inyección de cabeceras HTTP de agentes de usuario realistas (`User-Agent` de Chrome en Windows 11).
  - Purga automática del DOM de popups molestos de cookies y diálogos de consentimiento mediante la inyección preventiva de JavaScript:
    ```javascript
    await page.evaluate(() => {
        document.querySelectorAll('[id*="cookie"], [class*="consent"]')
            .forEach(el => el.remove());
    });
    ```
  - Margen de espera adaptativo de renderizado (`8000ms`) que garantiza que la IA de Perplexity ha terminado de estructurar la respuesta Markdown en la clase `.prose` antes de proceder con el raspado de texto.

---

## 3. PLATAFORMA WEB DE TRADING

La plataforma web de trading representa la consola visual del negocio, integrando indicadores avanzados de análisis técnico como el Método Sono (RSI, Bandas de Bollinger, medias móviles), tendencias de Google Trends y métricas de volatilidad VIX.

### 3.1 Arquitectura de Tres Capas (Frontend, Backend, DB)
El sistema está configurado en una topología local de alto rendimiento y baja latencia:

```
[ FRONTEND UI: React/Next.js ] (Puerto 3000)
             │
             ▼ REST API / WebSockets
[ BACKEND API: Node.js Express ] (Puerto 3002 REST / 3001 Sockets)
             │
             ├────────► [ BD POSTGRESQL: trading_db ] (Puerto 5432)
             │
             └────────► [ OPENCLAW GATEWAY ] (Puerto 18789) ──► Google Gemini API
```

### 3.2 Frontend (Trading UI)
- **Framework:** React 18 con Next.js 14 en modo de renderizado híbrido.
- **Gráficos en Tiempo Real:** Integración con librerías nativas y el widget avanzado de TradingView para la representación de ticks de velas de 1 hora y 1 día.
- **Actualización de Datos:** El cliente se conecta automáticamente al servidor de WebSockets de fondo al cargar la página para reflejar variaciones de precio sin requerir refresco de página.

### 3.3 Backend API y WebSockets
- **Engine:** Servidor Express de Node.js que expone endpoints REST securizados con tokens JWT para la autenticación de usuarios.
- **WebSockets Server:** Servidor Socket.io montado sobre el puerto `3001` con políticas de reconexión automáticas para feeds de datos de criptomonedas (BTC, ETH, SOL, XRP) y actualizaciones en vivo de balances financieros consultados en la API de Pionex.

### 3.4 Configuración de Base de Datos PostgreSQL
- **Database Name:** `trading_db`
- **Usuario de Aplicación:** `trading_user` (con privilegios de escritura restringidos a sus propias tablas).
- **Tablas Críticas:**
  - `users`: Almacena usuarios y hash de contraseñas (encriptadas con bcrypt).
  - `orders`: Tabla transaccional para el registro de órdenes procesadas y alertas Sono enviadas.
  - `market_data`: Histórico caché de indicadores técnicos para acelerar la consulta del frontend.
- **Optimización:** Índices compuestos implementados en la clave de búsqueda `symbol` + `timestamp` para acelerar los queries analíticos en gráficos.

---

## 4. MANUAL DE CLONACIÓN EXACTA (PASO A PASO)

Esta sección es la guía práctica maestra para clonar y restaurar el sistema en un equipo nuevo.

### 4.1 Preparación de la Máquina de Destino
La nueva estación de trabajo o servidor de trading debe cumplir con las siguientes especificaciones:
- **SO:** Windows 10/11 Pro (64 bits).
- **BIOS:** Habilitar Virtualización ("Intel Virtualization Technology" o "SVM Mode") para dar soporte óptimo a Docker/WSL2 en caso de ser requeridos.
- **Espacio en Disco:** SSD con un espacio de almacenamiento disponible de al menos 10 GB para la base de datos y navegadores Playwright.

### 4.2 Automatización de la Exportación (En el Equipo Origen)
Para realizar el backup de todo el entorno sin comprometer archivos gigantescos innecesarios, ejecute el script de exportación automatizada desde PowerShell como Administrador:

```powershell
Set-Location "C:\Users\sparreno\.openclaw\workspace"
.\audit\scripts\Export-OpenClawEnvironment.ps1 -BackupPath "C:\OpenClaw_Backup_Produccion"
```

**¿Qué hace este script de fondo de manera inteligente?**
1. Copia todas las configuraciones del perfil de usuario (`%USERPROFILE%\.openclaw`) excluyendo las carpetas pesadas de logs y temporales.
2. Copia la estructura base del directorio `C:\OpenClaw` omitiendo las carpetas de dependencias de Node.js (`node_modules`) y los navegadores de Playwright descargados, los cuales se reconstruyen dinámicamente en el destino de forma limpia.
3. Exporta las variables de entorno asociadas del sistema a un archivo XML estructurado.
4. Exporta las reglas del Firewall de Windows asociadas al puerto del Gateway.
5. Genera de forma automática un archivo Markdown de checklist post-instalación en la carpeta de backup.
6. Comprime el resultado en un único archivo ZIP optimizado listo para ser transferido al servidor destino.

### 4.3 Automatización de la Restauración (En el Equipo de Destino)
Una vez transferido el archivo ZIP del backup en el equipo de destino, abra PowerShell como Administrador y lance el script de importación y restauración completa:

```powershell
Set-Location "C:\Users\sparreno\.openclaw\workspace"
.\audit\scripts\Import-OpenClawEnvironment.ps1 -BackupZipPath "C:\OpenClaw_Backup_Produccion.zip"
```

**Flujo lógico de restauración aplicado por el script:**
1. Descomprime de manera silenciosa el backup ZIP en un directorio temporal del sistema.
2. Restaura la carpeta base de ejecución `C:\OpenClaw` en el disco principal del destino.
3. Restaura las configuraciones maestras y el workspace de memoria persistente en la carpeta de perfil del usuario de destino (`%USERPROFILE%\.openclaw\`).
4. Reconstruye de forma segura las dependencias de paquetes Node.js ejecutando un proceso silencioso de `npm install --production` tanto en el gateway como en el skill `perplexity-search`.
5. Descarga e instala el motor de Chromium Headless de Playwright en la ruta correspondiente del nuevo sistema.
6. Registra las variables de entorno inyectándolas en el registro de la sesión de usuario de Windows de forma permanente.
7. Registra una regla estricta en el Firewall local de Windows para autorizar conexiones por el puerto `18789` únicamente a través de la interfaz loopback local (`127.0.0.1`), previniendo intrusiones de red LAN.
8. Coloca en el Escritorio del nuevo usuario el archivo `POST_INSTALL_CHECKLIST.md` de validación.

---

## 5. RECOMENDACIONES DE OPERACIÓN SRE Y MANTENIMIENTO

Para asegurar que la plataforma opere de forma continua sin degradación de rendimiento a largo plazo (Uptime > 99.9%), se deben programar los scripts de mantenimiento y backups diarios.

### 5.1 Backups Automatizados Diarios (Estrategia SRE)
El script de backup automatizado (`Backup-Automated.ps1`) está diseñado para ejecutarse de forma silenciosa en segundo plano sin interrumpir las operaciones del trader. Se recomienda programarlo para ejecutarse de forma diaria a las **03:00 AM** mediante el Programador de Tareas de Windows (Task Scheduler).

#### Configuración de la Tarea Programada en Windows:
Para registrar el script en el Task Scheduler de forma permanente, abra un terminal administrativo de PowerShell y ejecute el siguiente comando de una sola línea:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\Users\sparreno\.openclaw\workspace\audit\scripts\Backup-Automated.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "OpenClaw Daily Backup" -Action $action -Trigger $trigger -Description "Respaldo diario automatico de configuracion de OpenClaw y retencion de historicos por 7 dias." -User "SYSTEM" -Force
```
*Este comando asegura que el backup diario se ejecutará de forma invisible, limpiando de forma automática las copias que tengan una antigüedad mayor a 7 días para evitar colapsar el espacio del disco duro.*

### 5.2 Scripts de Diagnóstico Rápido y Heartbeat de Salud
- **`Diagnose-OpenClaw.ps1`:** Ejecútelo de forma manual ante anomalías en las respuestas de la IA. Analiza en tiempo real puertos bloqueados, variables corruptas, el uso de memoria RAM por parte de Node y extrae de forma limpia las últimas líneas del archivo de logs para acelerar el diagnóstico de fallos.
- **`Health-Check.ps1`:** Diseñado para actuar como un sensor ligero de monitoreo. Este script intenta conectarse al Gateway local; si detecta que la API no responde, genera un registro JSON y una alerta para el sistema de monitorización local con un código de salida distinto de cero, permitiendo programar reinicios automatizados en caliente en caso de caídas inesperadas del servicio de IA.
