# 👒 MiFuturApp - Indicador BTC Pro (Edición Especial Fino)

¡Bienvenido! Este es el clon completo, optimizado y de nivel empresarial del sistema de análisis de confluencias de **MiFuturApp Indicador BTC**.

Esta versión unifica la potencia de un backend en tiempo real (FastAPI + WebSockets) con la robustez y sencillez de un compilador de datos estático offline (`process_indicador_data.py`), brindándote la solución definitiva tanto para despliegues dinámicos como para servidores de archivos estáticos (Nginx / Apache).

---

## 📂 Organización del Proyecto

El proyecto está estructurado de manera modular y limpia en las siguientes carpetas y archivos:

```markdown
indicador_btc/
├── data/
│   ├── db/
│   │   └── indicador_btc.sqlite     # Base de datos relacional con 71+ snapshots reales
│   ├── macro/
│   │   ├── 2026-05-19.json         # Snapshot diario del 19 de mayo
│   │   ├── 2026-05-20.json         # Snapshot diario del 20 de mayo
│   │   └── 2026-05-21.json         # Snapshot diario del 21 de mayo
│   ├── ejemplo_long.json           # Plantilla de señal de compra (LONG)
│   ├── ejemplo_short.json          # Plantilla de señal de venta (SHORT)
│   └── indicador_data.json         # Archivo unificado y consolidado de producción (97KB)
│
├── indicador-btc-pro.html          # Dashboard principal (Carga dinámica de datos reales)
├── indicador-btc-dashboard.html    # Versión Demo (Con datos pre-cargados para pruebas de diseño)
├── ejemplos-senales.html           # Biblioteca de señales institucionales lado a lado
│
├── main.py                         # Servidor en tiempo real (FastAPI + WebSockets en puerto 8000)
├── process_indicador_data.py       # Compilador de datos sincrónico SQLite -> JSON consolidado
├── db_utils.py                     # Utilidades asíncronas para lectura/escritura en SQLite
├── indicators.py                   # Calculador nativo de indicadores técnicos (Binance API)
├── scoring.py                      # Algoritmo de puntuación de confluencia avanzado (0-100)
│
├── actualizar.sh                   # Automatizador de segundo plano para Linux/Bash
├── actualizar.ps1                  # Automatizador de segundo plano para Windows/PowerShell
└── README.md                       # Este archivo de documentación (Español)
```

---

## 🚀 Cómo Usar en 3 Pasos

### Opción Rápida (Prueba de Diseño / Sin Dependencias)
Abre directamente **`indicador-btc-dashboard.html`** en cualquier navegador (Firefox, Chrome, Edge). Funciona de forma instantánea con datos de ejemplo precargados para testear animaciones y diseño responsivo.

---

### Opción de Producción Estática (Con tus Datos Reales)

#### Paso 1: Consolidar Datos Reales de SQLite y JSON
Ejecuta el script procesador para unificar todas las fuentes de datos (la base de datos SQLite y los archivos macro históricos) en un único archivo consolidado de producción:
```bash
python indicador_btc/process_indicador_data.py
```
*Esto generará el archivo `indicador_btc/indicador_data.json` conteniendo el historial completo de 71 registros, medias móviles, volatilidad VIX, Fear & Greed y dominancia.*

#### Paso 2: Ejecutar Automatización (Cada 10 Minutos)
Para mantener el archivo `indicador_data.json` actualizado automáticamente con las nuevas lecturas de la base de datos de forma indefinida:

* **En Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\indicador_btc\actualizar.ps1
  ```
* **En Linux (Bash):**
  ```bash
  chmod +x indicador_btc/actualizar.sh
  ./indicador_btc/actualizar.sh
  ```

#### Paso 3: Lanzar Dashboard Pro
Abre **`indicador-btc-pro.html`** en tu navegador. El dashboard cargará dinámicamente `indicador_data.json` y se auto-refrescará de forma silenciosa cada 60 segundos sin necesidad de recargar la página completa.

---

### Opción de Producción Dinámica (FastAPI Real-Time WebSockets)
Si prefieres un servicio con streaming de datos en vivo desde Binance y comunicación por WebSockets bidireccional en tiempo real:
```bash
python indicador_btc/main.py
```
*Esto levantará el servidor en `http://localhost:8000`. Al acceder a esa URL, verás el panel web conectado directamente al socket en tiempo real (`/ws`), actualizándose segundo a segundo.*

---

## 🎨 Características Destacadas del Dashboard Pro

1. **Diseño Tipo Terminal Financiero:** Estética en Dark Mode premium con tipografías dedicadas (`Outfit` para lectura suave + `Space Mono` para datos numéricos duros) y efectos glow animados para alertas.
2. **Sistema de Señales Dinámicas:** 
   * 🚀 **LONG (Compra)** ante pánico extremo, soporte de medias móviles y RSI sobrevendido.
   * ⚠️ **SHORT (Venta)** ante codicia desmedida, resistencias fuertes de canales y RSI sobrecomprado.
   * ➖ **NEUTRAL** para mercados oscilatorios o fases de acumulación lateral.
3. **Gráficos Históricos Interactivos:** Gráficos de área interactivos que muestran la cotización de BTC junto al comportamiento histórico de tu Score de Confluencia para auditoría visual instantánea.
4. **Análisis de Medias Móviles (MA):** Tabla multi-timeframe de 7 intervalos con semáforos verdes/rojos que indican si el precio actual está por encima o por debajo de las medias móviles exponenciales e institucionales (MA20, MA50, MA200).

---

Desarrollado y optimizado con mucho detalle por **Fino 👒** para **sparreno**. ¡A por ese ARR millonario de Ultrafino! 📈
