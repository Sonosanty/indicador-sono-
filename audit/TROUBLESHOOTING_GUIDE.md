# 🛠️ GUÍA DE TROUBLESHOOTING AVANZADA Y RESOLUCIÓN DE INCIDENCIAS

Esta guía consolida las incidencias reales y teóricas más complejas en el ecosistema OpenClaw + Plataforma Web de Trading, detallando su causa raíz, diagnóstico técnico y resolución paso a paso (nivel SRE/Santy).

---

## 1. ERROR: `ECONNREFUSED 127.0.0.1:18789` (GATEWAY NO ACCESIBLE)
*Síntoma: El navegador o los clientes API no pueden establecer conexión con el puerto 18789. Se despliega error de conexión rechazada.*

### Causa Raíz
1. El proceso `node.exe` que hospeda el Gateway de OpenClaw se ha detenido inesperadamente por un crash o una falta de recursos.
2. Otro proceso del sistema (por ejemplo, una sesión zombie de Node) está ocupando el puerto, impidiendo que el Gateway se enlace.
3. El archivo `openclaw.json` está mal configurado con un puerto diferente o enlazando a una interfaz incorrecta (`bind: "loopback"` con problemas de resolución de red).

### Procedimiento de Resolución Paso a Paso
1. **Verificar ocupación del puerto:** Abra PowerShell como administrador y ejecute:
   ```powershell
   netstat -ano | findstr "18789"
   ```
   *Si hay un PID listado como LISTENING, apunte ese PID.*
2. **Matar procesos conflictivos:** Si el puerto está bloqueado por una sesión zombie de Node, ejecute:
   ```powershell
   taskkill /PID <PID_detectado> /F
   ```
   *O para matar todas las instancias huérfanas:*
   ```powershell
   Stop-Process -Name node -Force -ErrorAction SilentlyContinue
   ```
3. **Validar configuración de red en openclaw.json:**
   Asegúrese de que el archivo `openclaw.json` contiene la sección:
   ```json
   "gateway": {
     "port": 18789,
     "bind": "loopback"
   }
   ```
4. **Verificar logs de inicialización:** Revise el archivo `C:\OpenClaw\logs\gateway.log` para identificar excepciones al levantar el servidor.

---

## 2. ERROR DE TIMEOUT: `google:manual timed out`
*Síntoma: El asistente inteligente se queda congelado al procesar prompts. Los logs exponen fallos repetidos de timeout en el cargador de sesiones asociadas al proveedor google.*

### Causa Raíz
Este error crítico ocurre cuando OpenClaw se ha configurado usando la autenticación de sesión de navegador ("Google auth method: Back" cancelado) en lugar de una API Key directa de Google AI Studio. OpenClaw registra internamente un perfil llamado `google:manual` que intenta obtener un token interactivo, el cual expira rápidamente. Al expirar, el gateway entra en un bucle infinito intentando cargar la sesión, lo que congela el event loop de Node.js.

### Procedimiento de Resolución Paso a Paso
1. **Detener el Gateway:** Cierre el terminal del launcher o mate el proceso `node.exe`.
2. **Eliminar el perfil corrupto:** Abra PowerShell y ejecute el siguiente bloque para purgar el perfil `google:manual` del archivo `openclaw.json` de forma limpia:
   ```powershell
   $configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
   if (Test-Path $configPath) {
       $config = Get-Content $configPath -Raw | ConvertFrom-Json
       
       # Limpiar perfiles si existen
       if ($config.auth -and $config.auth.profiles) {
           # Reconstruir perfiles de autenticación excluyendo google:manual
           $profiles = $config.auth.profiles
           if (Get-Member -InputObject $profiles -Name "google:manual") {
               $config.auth.profiles = New-Object PSObject
               $config.auth.profiles | Add-Member -NotePropertyName "google:default" -NotePropertyValue @{
                   "provider" = "google"
                   "mode" = "api_key"
               }
               # Guardar de nuevo
               $config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8
               Write-Host "[OK] Perfil 'google:manual' eliminado y corregido a 'google:default'." -ForegroundColor Green
           }
       }
   }
   ```
3. **Establecer API Key Directa:** Edite `openclaw.json` e introduzca la API Key de Gemini en:
   `models.providers.google.apiKey`
4. **Reiniciar el Gateway:** Inicie `start-openclaw.bat`.

---

## 3. RENDIMIENTO DEGRADADO: `session-resource-loader` LENTO (5-17 SEGUNDOS)
*Síntoma: El inicio de las conversaciones o la carga de contexto toma entre 5 y 17 segundos antes de que la IA empiece a emitir tokens.*

### Causa Raíz
1. **Historial de chat sobrecargado:** El historial de la sesión actual acumula decenas de miles de tokens de contexto que se leen, validan y parsean en disco lento en cada turno de conversación.
2. **Límite de tokens mal configurado (`contextTokens`):** El parámetro `contextTokens` está configurado con valores muy bajos, forzando al motor a ejecutar algoritmos de compactación agresivos de forma continua.
3. **Escrituras bloqueantes en disco duro mecánico:** El almacenamiento en disco lento ralentiza la lectura y escritura de los archivos JSON temporales de las sesiones en `%USERPROFILE%\.openclaw\`.

### Procedimiento de Resolución Paso a Paso
1. **Limpiar historial de sesiones viejas:**
   Ejecute el comando nativo para purgar sesiones inactivas y pesadas del sistema:
   ```powershell
   openclaw session purge-inactive --days 3
   ```
2. **Aumentar el límite de tokens de contexto:**
   Abra `%USERPROFILE%\.openclaw\openclaw.json` y configure `contextTokens` en al menos `200000` (Gemini Flash soporta hasta 1 millón de tokens de forma ultra-rápida):
   ```json
   "agents": {
     "defaults": {
       "contextTokens": 200000
     }
   }
   ```
3. **Garantizar Unidad SSD:** Asegúrese de que el directorio `%USERPROFILE%` y `C:\OpenClaw` residen en una unidad de estado sólido (SSD) de alto rendimiento.

---

## 4. ERROR DE SEGURIDAD: CONFIGURACIÓN RECHAZADA (`Size-drop protection / rejected`)
*Síntoma: Al guardar modificaciones en openclaw.json, el sistema rechaza la configuración y genera un archivo openclaw.json.rejected. El Gateway vuelve a su estado anterior.*

### Causa Raíz
OpenClaw incorpora un mecanismo de seguridad y consistencia llamado "Size-drop protection". Si el tamaño de la configuración se reduce abruptamente (por ejemplo, al eliminar accidentalmente un bloque de configuración clave) o si el validador estricto de esquemas detecta campos no reconocidos, el sistema rechaza el nuevo archivo escribiendo una copia `.rejected` para evitar arranques con configuraciones rotas.

### Procedimiento de Resolución Paso a Paso
1. **Analizar la causa de validación:** Ejecute la herramienta interna para verificar el error exacto:
   ```powershell
   openclaw config validate
   ```
2. **Localizar el último backup consistente:**
   Si desea volver atrás, identifique los archivos `.rejected` o `.bak` en el directorio:
   ```powershell
   Get-ChildItem -Path "$env:USERPROFILE\.openclaw\" -Filter "*.rejected"
   ```
3. **Restaurar configuración válida:**
   Copie el último rechazado que estuviese funcional o la plantilla limpia de producción (`audit/configs/openclaw.json`) sobre el archivo dañado:
   ```powershell
   Copy-Item "C:\Users\sparreno\.openclaw\workspace\audit\configs\openclaw.json" "$env:USERPROFILE\.openclaw\openclaw.json" -Force
   ```
4. **Validar e iniciar:** Verifique nuevamente con `openclaw config validate` antes de levantar el Gateway.

---

## 5. SKILL PERPLEXITY DEVUELVE TEXTO VACÍO O ERRORES DE COOKIES
*Síntoma: Al realizar búsquedas en Perplexity, el asistente responde: "No se pudo extraer respuesta de Perplexity" o se observan errores de timeout en Playwright.*

### Causa Raíz
1. **Intercepción de Cookie Consent:** Perplexity u otros motores de búsqueda despliegan popups de consentimiento de cookies que bloquean la vista del DOM, impidiendo que Playwright localice los inputs de texto.
2. **Cambio de selectores CSS:** El portal web de Perplexity actualiza sus selectores internos (clases de botones, textareas o contenedores Markdown) desalineando los selectores hardcodeados en el script.
3. **Bloqueo anti-bot / Cloudflare:** El servidor web detecta el comportamiento automatizado de Playwright y bloquea la navegación desplegando un captcha o pantalla de verificación.

### Procedimiento de Resolución Paso a Paso
1. **Actualizar script de Playwright con selectores actualizados:**
   Asegúrese de usar selectores adaptativos y flexibles en el script de búsqueda. Edite `C:\OpenClaw\skills\perplexity-search\perplexity-search.mjs` garantizando selectores genéricos para el input de búsqueda como:
   `"textarea[placeholder*='Ask'], textarea[name='q'], input[type='text']"`
2. **Incorporar evasión de Cookies en el script:**
   Garantice que el script incluye el bloque de purga de elementos de cookies antes de rellenar el formulario:
   ```javascript
   await page.evaluate(() => {
       document.querySelectorAll('[id*="cookie"], [class*="consent"], [class*="modal"]')
           .forEach(el => el.remove());
   });
   ```
3. **Habilitar visualización de depuración (Modo Heady):**
   Si el problema persiste, configure temporalmente `"headless": false` en la instanciación de Playwright en el script `.mjs` para observar visualmente en qué pantalla se queda congelado el bot:
   ```javascript
   browser = await chromium.launch({ headless: false });
   ```
   *No olvide revertir esto a `headless: true` para operaciones en producción.*
