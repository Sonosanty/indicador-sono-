# 📋 PLANILLAS Y CHECKLISTS MASTER DE OPERACIONES - OPENCLAW + TRADING WEB

Este documento consolida las 5 planillas y listas de verificación (checklists) imprimibles requeridas para la gestión del ciclo de vida del entorno OpenClaw y la Plataforma Web de Trading, bajo estándares de Ingeniería de Confiabilidad de Sitios (SRE).

---

## 1. CHECKLIST DE INSTALACIÓN (DESDE CERO)
*Propósito: Guiar al SRE/DevOps en el aprovisionamiento de un sistema completamente limpio desde cero.*

### Fase 1: Hardware y Sistema Base
- [ ] **1.1.** CPU de 4 núcleos (mínimo) y 8 núcleos (recomendado) verificado.
- [ ] **1.2.** RAM física de 16 GB disponible (32 GB recomendado).
- [ ] **1.3.** Unidad de almacenamiento SSD con al menos 50 GB de espacio libre asignado.
- [ ] **1.4.** Windows 10/11 Pro (64 bits) completamente parcheado e instalado.
- [ ] **1.5.** Virtualización de CPU (VT-x o AMD-V) habilitada en la BIOS de la máquina.
- [ ] **1.6.** PowerShell versión 5.1+ o PowerShell 7+ disponible.

### Fase 2: Gestor de Paquetes e Instalaciones Base
- [ ] **2.1.** Winget instalado y funcional. (Verificable con `winget --version`).
- [ ] **2.2.** Git instalado vía Winget (`winget install Git.Git`).
- [ ] **2.3.** Node.js LTS instalado vía Winget (`winget install OpenJS.NodeJS.LTS`).
- [ ] **2.4.** VS Code o editor de texto avanzado disponible (`winget install Microsoft.VisualStudioCode`).
- [ ] **2.5.** PostgreSQL v14+ instalado y ejecutándose localmente en el puerto `5432`.
- [ ] **2.6.** Docker Desktop (WSL2 Backend) instalado e iniciado (opcional).

### Fase 3: Despliegue de OpenClaw
- [ ] **3.1.** Ejecutar el script `Install-OpenClawFromScratch.ps1` ingresando una API Key válida de Google Gemini.
- [ ] **3.2.** Directorio `C:\OpenClaw` creado y con permisos NTFS securizados.
- [ ] **3.3.** Launcher `start-openclaw.bat` generado en el directorio base.
- [ ] **3.4.** Archivo de configuración `openclaw.json` generado en `%USERPROFILE%\.openclaw`.
- [ ] **3.5.** Comprobación de que no existe ninguna tarea programada obsoleta que inicie el Gateway de forma descontrolada.

### Fase 4: Playwright & Skill Perplexity
- [ ] **4.1.** Playwright instalado de forma global o local en `C:\OpenClaw`.
- [ ] **4.2.** Navegador Chromium Headless descargado en la ruta `%LOCALAPPDATA%\ms-playwright` (`npx playwright install chromium`).
- [ ] **4.3.** Archivos `skill.json` y `perplexity-search.mjs` ubicados bajo `C:\OpenClaw\skills\perplexity-search\`.

---

## 2. CHECKLIST DE AUDITORÍA PERIÓDICA
*Propósito: Evaluaciones semanales/mensuales de la salud del sistema.*

### Comprobación de Puertos y Sockets (Cada lunes)
- [ ] **1.** El puerto `18789` está en escucha exclusiva para localhost (`127.0.0.1`), garantizando que el Gateway no está expuesto a la red local.
- [ ] **2.** El puerto `3002` (API) y el puerto `3001` (WebSocket) están respondiendo correctamente sin cuellos de botella.
- [ ] **3.** El motor de base de datos PostgreSQL (`5432`) no acepta conexiones externas directas (firewall bloquea).

### Control de Crecimiento de Archivos y Logs
- [ ] **4.** Log del Gateway `C:\OpenClaw\logs\gateway.log` rotando de forma diaria.
- [ ] **5.** Espacio en disco C:\ mayor a 15 GB (libre) para garantizar operaciones seguras de Playwright.
- [ ] **6.** Carpeta temporal del sistema (`%TEMP%`) limpia de cachés antiguas de Chromium.

### Auditoría de Rendimiento de Procesos
- [ ] **7.** Procesos huérfanos de Chromium eliminados periódicamente (semana) para evitar fugas de memoria RAM.
- [ ] **8.** El proceso `node.exe` del Gateway consume menos de 1 GB de memoria en reposo y la CPU está bajo el 5% en idle.
- [ ] **9.** Los tiempos de respuesta del skill `perplexity-search` están bajo los 15 segundos para búsquedas pesadas.

---

## 3. CHECKLIST DE SEGURIDAD (HARDENING)
*Propósito: Auditoría y aseguramiento ante vulnerabilidades e intrusiones.*

- [ ] **S.1. Servicios Innecesarios Deshabilitados:** `RemoteRegistry`, `RemoteAccess`, `upnphost` y `SSDPSRV` inhabilitados en Windows Services.
- [ ] **S.2. Protocolo SMBv1 Inactivo:** SMB v1 desinstalado a nivel de características del sistema para mitigar malware propagado por red.
- [ ] **S.3. Reglas Strict Firewall:** Creada regla que bloquea explícitamente cualquier puerto entrante al gateway de OpenClaw desde cualquier dirección IP externa.
- [ ] **S.4. Permisos NTFS:** Control de herencia y ACLs restringidas en `C:\OpenClaw` y `%USERPROFILE%\.openclaw` donde solo el Administrador y el Usuario Actual tienen permisos completos. El grupo "Everyone" o "Users" estándar no tiene acceso.
- [ ] **S.5. Protección de API Keys (Plaintext):** Eliminada cualquier clave API de repositorios Git. Claves almacenadas en variables de entorno locales protegidas o en archivos `.env` NTFS-protegidos.
- [ ] **S.6. Eliminación de google:manual:** Confirmado que en el archivo `openclaw.json` no existe ningún perfil con método de autenticación browser manual, utilizando exclusivamente `api_key` para Gemini.
- [ ] **S.7. Auditoría de Eventos Activada:** Directivas locales de auditoría configuradas para registrar inicios de sesión exitosos y fallidos en el Visor de Sucesos de Windows.

---

## 4. CHECKLIST DE MIGRACIÓN Y CLONACIÓN
*Propósito: Realizar una migración de servidor sin fisuras en menos de 30 minutos.*

### Paso A: Preparación en Máquina Origen
- [ ] **A.1.** Detener el Gateway de OpenClaw y cerrar terminales activas.
- [ ] **A.2.** Asegurarse de que el workspace de memoria está sincronizado y ordenado.
- [ ] **A.3.** Ejecutar `Export-OpenClawEnvironment.ps1` con permisos de administrador.
- [ ] **A.4.** Verificar la creación exitosa del archivo ZIP en `C:\` o unidad externa y validación del tamaño del archivo.
- [ ] **A.5.** Realizar un volcado completo de la base de datos de trading PostgreSQL con `pg_dump`.

### Paso B: Despliegue en Máquina Destino
- [ ] **B.1.** Transferir el archivo ZIP del backup y el archivo `.sql` de base de datos a la nueva máquina.
- [ ] **B.2.** Asegurar que Node.js LTS, Git y PostgreSQL están instalados en el destino.
- [ ] **B.3.** Ejecutar `Import-OpenClawEnvironment.ps1 -BackupZipPath "ruta-al-zip"` con permisos de administrador.
- [ ] **B.4.** Crear la base de datos vacía `trading_db` y restaurar los datos con `psql -U postgres -d trading_db -f backup_file.sql`.
- [ ] **B.5.** Configurar las credenciales y variables de entorno reales en el archivo `.env` de la aplicación de trading.
- [ ] **B.6.** Validar el puerto `18789` libre en el destino y levantar el Gateway de OpenClaw.

---

## 5. CHECKLIST DE VALIDACIÓN POST-INSTALACIÓN
*Propósito: Certificar que el sistema clonado/restaurado se encuentra 100% operativo.*

### Prueba de Inicialización
- [ ] **V.1.** El script `start-openclaw.bat` se ejecuta de forma fluida sin lanzar warnings de variables de entorno nulas.
- [ ] **V.2.** La interfaz Web del Panel de Control de OpenClaw abre de forma automática al acceder a `http://127.0.0.1:18789`.

### Prueba de Motor de Inteligencia Artificial (Prompting)
- [ ] **V.3.** Al enviar el prompt de verificación: `Hola, ¿quién eres y qué modelo usas?`, el asistente responde de forma rápida identificando que opera bajo Gemini.
- [ ] **V.4.** Verificación de que no existen retrasos mayores a 5 segundos en respuestas conversacionales simples.

### Prueba de Skill e Internet (Playwright Integration)
- [ ] **V.5.** Al enviar el prompt de búsqueda: `busca en perplexity el precio del btc de hoy`, el sistema inicia un navegador Chromium de fondo, extrae la respuesta y la presenta al usuario.
- [ ] **V.6.** Se valida que el JSON devuelto por el script de Playwright no genera errores de parsing en la consola de OpenClaw.

### Prueba de Memoria Activa
- [ ] **V.7.** Enviar un dato arbitrario de memoria: `recuerda que mi fruta favorita es el mango`.
- [ ] **V.8.** Reiniciar completamente el gateway de OpenClaw (cerrar bat y reabrir).
- [ ] **V.9.** Enviar prompt de comprobación: `¿cuál es mi fruta favorita?` y verificar que el asistente recuerde que es el mango, leyendo del archivo persistente en disco.

---
**Fecha de Certificación de Infraestructura:** `____ / ____ / ________`  
**SRE / Ingeniero Responsable:** `_____________________________________`  
**Firma:** `_________________________`
