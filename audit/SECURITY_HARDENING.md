# 🛡️ DOCUMENTO DE HARDENING Y SEGURIDAD DE INFRAESTRUCTURA

Este manual detalla las directrices de seguridad avanzada para blindar el entorno local y de red de OpenClaw junto a la Plataforma Web de Trading en entornos Windows 10/11 Pro de producción.

---

## 1. LAS 4 CAPAS DE PROTECCIÓN EN WINDOWS

Para garantizar que un entorno local que hospeda credenciales financieras, APIs de exchanges y asistentes inteligentes sea inmune a vectores de ataque comunes, aplicamos un diseño de seguridad en profundidad basado en 4 capas estructurales:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CAPA DE RED Y FIREWALL (Aislamiento de sockets)          │
│    └─► Bloqueo estricto Inbound / loopback exclusivo        │
├─────────────────────────────────────────────────────────────┤
│ 2. CAPA DE SISTEMA OPERATIVO (Bastionado de servicios)      │
│    └─► Deshabilitación de SMBv1, RegRemoto y UPnP           │
├─────────────────────────────────────────────────────────────┤
│ 3. CAPA DE SISTEMA DE ARCHIVOS (Control de Acceso NTFS)     │
│    └─► ACLs explícitas, remoción de herencia y Everyone     │
├─────────────────────────────────────────────────────────────┤
│ 4. CAPA DE APLICACIÓN Y SECRETOS (Gestión de credenciales)  │
│    └─► Cifrado de claves, evasión de logs, tokens aleatorios │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. RESTRICCIÓN DEL PUERTO 18789 (LOOPBACK BINDING)

Por defecto, los servidores Node.js en Windows pueden enlazarse a la interfaz `0.0.0.0`, lo que expone el puerto a cualquier equipo de la red local (Wi-Fi de casa, redes LAN corporativas, etc.). En el caso de un asistente inteligente capaz de ejecutar scripts o leer archivos locales, esto representaría un riesgo crítico de ejecución remota de código (RCE).

### Configuración del Gateway en Enlace Seguro
En el archivo de configuración `openclaw.json`, es obligatorio inyectar la propiedad `bind: "loopback"` o enlazar a la dirección IP local de loopback `127.0.0.1`. Esto le indica al sistema operativo que rechace cualquier paquete de red entrante cuya interfaz de origen no sea la propia máquina física local:
```json
"gateway": {
  "port": 18789,
  "bind": "loopback"
}
```

### Reglas de Firewall Avanzadas
El script `Harden-Windows-OpenClaw.ps1` automatiza la inyección de reglas estrictas en el Firewall de Windows para blindar este puerto. Ejecuta dos directivas:
1. **Bloqueo Global Externo:** Deniega explícitamente cualquier paquete TCP entrante en el puerto 18789 que provenga de redes públicas, privadas o de dominio (`RemoteAddress: Any`, `Action: Block`).
2. **Excepción Local Exclusiva:** Permite tráfico en el puerto 18789 únicamente si la dirección de origen es `127.0.0.1` (`RemoteAddress: 127.0.0.1`, `Action: Allow`).

---

## 3. BASTIONADO DE PERMISOS NTFS (CONTROLES DE ACCESO EN DISCO)

El almacenamiento del perfil de configuración de OpenClaw contiene claves API de Gemini en texto plano. Si múltiples usuarios comparten la máquina, o si un malware consigue acceso limitado a nivel de usuario, estas claves podrían ser comprometidas.

### Remoción de la Herencia NTFS y Grupos Genéricos
Aplicamos el principio de mínimo privilegio sobre los directorios `C:\OpenClaw` y `%USERPROFILE%\.openclaw`. El script de hardening ejecuta comandos `icacls` para:
- Deshabilitar la herencia de permisos NTFS de carpetas superiores.
- Eliminar los permisos de lectura/escritura para el grupo integrado `Users` (usuarios comunes) y `Everyone` (todos).
- Conceder permisos de **Control Total (Full Control)** exclusivamente a:
  - `NT AUTHORITY\SYSTEM` (El propio sistema operativo).
  - `BUILTIN\Administrators` (Administradores de la máquina).
  - `<Tu_Usuario_Actual>` (El propietario exclusivo que ejecuta el asistente).

Comando icacls aplicado de fondo:
```powershell
icacls "C:\OpenClaw" /inheritance:r /grant:r "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" "%USERNAME%:(OI)(CI)(F)"
```

---

## 4. GESTIÓN SEGURA DE SECRETS Y CLAVES API

### Archivos `.env` Fuera del Código
Todas las credenciales requeridas por la plataforma de Trading (como `DATABASE_URL`, `PIONEX_API_KEY` o `JWT_SECRET`) deben residir en un archivo `.env` local. Este archivo **nunca debe ser subido a repositorios Git** o carpetas compartidas. Se incluye un archivo `.env.template` sin contraseñas reales para servir como plantilla de despliegue.

### Cifrado de Credenciales vía DPAPI en Windows
Para entornos corporativos de máxima seguridad, se recomienda cifrar las cadenas de texto sensibles utilizando la Interfaz de Programación de Aplicaciones de Protección de Datos (DPAPI) de Windows, de modo que solo puedan ser descifradas por la misma cuenta de usuario en el mismo PC:
```powershell
# Cifrar clave API y guardarla en archivo protegido NTFS
$SecretString = "tu_clave_api_secreta"
$Secure = ConvertTo-SecureString $SecretString -AsPlainText -Force
$Encrypted = ConvertFrom-SecureString $Secure
$Encrypted | Out-File "C:\OpenClaw\configs\.geminikey.enc" -Encoding UTF8
```
Al arrancar el sistema, el script de carga de variables de entorno lee y descifra dinámicamente el secreto en memoria RAM sin escribirlo jamás en archivos de configuración planos.

---

## 5. SANITIZACIÓN DE LOGS (PREVENCIÓN DE FUGA DE DATOS)

Los asistentes de IA y las APIs web tienden a registrar en sus logs de diagnóstico todo el tráfico que fluye por ellos. Esto puede dar lugar a que claves API, tokens de sesión JWT o saldos bancarios queden escritos en archivos de texto plano legibles en disco (`C:\OpenClaw\logs\gateway.log`).

### Implementación del Filtro de Redacción en Node.js
En los middlewares de registro del Backend de Trading y del Gateway de OpenClaw, implementamos una directiva de sanitización profunda que recorre de forma recursiva cualquier objeto JSON antes de volcarlo al log en disco:
```javascript
const sensitiveKeys = ['password', 'apikey', 'token', 'secret', 'authorization', 'cookie'];

function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = "[REDACTED_SECURE_DATA]";
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
```
Esto garantiza que, incluso si el nivel de depuración está configurado en `DEBUG`, la información de seguridad crítica permanezca completamente resguardada de miradas indiscretas.
