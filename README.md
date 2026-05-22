# 👒 Fino BTC Advanced Indicator - Sistema de Indicadores y Scoring para BTC

Este proyecto es una suite completa, portátil y escalable de herramientas cuantitativas para clonar y mejorar el sistema de indicadores de **MiFuturApp**. Implementa cálculos de indicadores técnicos en tiempo real, un motor de puntuación (Scoring) de confluencia avanzado, APIs REST/WebSockets listas para producción y un diseño arquitectónico alineado con prácticas de trading de nivel institucional.

---

## 🏗️ Componentes del Sistema

El proyecto se compone de los siguientes módulos funcionales, desarrollados bajo una arquitectura limpia y portable:

1.  **`main.py` (FastAPI Server):**
    *   Servidor web asíncrono que ofrece endpoints REST e interfaces WebSockets de streaming de datos en tiempo real.
    *   Ejecuta bucles automáticos en segundo plano para actualizar indicadores consultando las APIs de exchanges sin bloquear peticiones.
    *   Dispone de fallback en memoria para un despliegue inmediato sin dependencias complejas de bases de datos.
2.  **`indicators.py` (Technical Indicators Engine):**
    *   Implementa algoritmos numéricos eficientes para calcular **RSI**, **MACD**, **Bandas de Bollinger**, **ATR** y **ADX** desde cero usando Pandas y NumPy.
    *   Evita el uso de librerías binarias nativas pesadas (como TA-Lib), previniendo errores de compilación habituales en sistemas operativos Windows.
    *   Incluye un autotest que descarga velas en vivo (OHLCV) de la API pública de Binance para certificar el cálculo matemático correcto.
3.  **`scoring.py` (Confluence Scoring System):**
    *   Implementa un algoritmo de consolidación matemática para generar una puntuación definitiva de **0 a 100** para el mercado de Bitcoin.
    *   Fusiona cuatro factores críticos: **Momentum Multi-timeframe (30%)**, **Tendencia Estructural (30%)**, **Sentimiento de Mercado (20%)** y **Volatilidad Adaptativa (20%)**.
    *   Traduce la puntuación a zonas de mercado inequívocas (`PÁNICO EXTREMO`, `ACUMULACIÓN`, `NEUTRAL`, `OPTIMISMO`, `EUFORIA EXTREMA`) e instrucciones automáticas (`LONG`, `SHORT`, `WAIT/SCALPING`).
4.  **`historico.json` (Dataset Histórico Saneado):**
    *   Contiene 175 registros continuos de snapshots de 10 minutos (desde el 19 de mayo al 20 de mayo de 2026), debidamente reparados y estructurados como un array de objetos JSON estándar tras un análisis cuantitativo de confluencia.

---

## 🚀 Requisitos e Instalación Rápida

El código base es compatible con **Python 3.11+**, y ha sido verificado para funcionar tanto en **Windows** como en **Linux**.

### 1. Clonar o Colocar los Archivos en el Workspace
Coloca `main.py`, `indicators.py`, `scoring.py`, `requirements.txt` e `historico.json` en tu carpeta de trabajo.

### 2. Configurar el Entorno Virtual de Python
```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# En Linux/macOS:
source venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

---

## ⚙️ Cómo Ejecutar el Sistema

### Paso 1: Certificar el Cálculo Matemático
Antes de levantar el servidor de producción, puedes probar el motor de cálculo matemático conectando con Binance:
```bash
python indicators.py
```
*Deberías ver una descarga exitosa de velas de Binance y la impresión de una tabla de Pandas con los indicadores calculados.*

### Paso 2: Ejecutar el Motor de Scoring
Puedes probar la clasificación de escenarios de mercado simulando condiciones extremas de pánico u optimismo de la siguiente manera:
```bash
python scoring.py
```

### Paso 3: Lanzar el Servidor API de Producción
```bash
python main.py
```
*El servidor se iniciará en `http://localhost:8000`. Puede dejarse corriendo localmente de forma indefinida.*

---

## 📊 Endpoints de la API y Consumo de Datos

Una vez el servidor esté corriendo, puedes interactuar con él mediante cualquier cliente HTTP (como Curl, Postman o navegadores web):

*   **API Principal / Documentación Interactiva (Swagger UI):** `http://localhost:8000/docs`
*   **Obtener Estado Completo de Métricas:** `GET http://localhost:8000/api/latest`
*   **Obtener Señal y Confianza Directa de Trading:** `GET http://localhost:8000/api/signal`
    *   *Ejemplo de respuesta:*
        ```json
        {
          "timestamp": "2026-05-21 10:25:01",
          "price": 78012.4,
          "signal": "LONG",
          "confidence_pct": 75.5,
          "score": 12.2,
          "estado": "ACUMULACIÓN",
          "reasoning": "El mercado se encuentra en fase de acumulacion. RSI e indicadores de tendencia muestran debilidad controlada y miedo. Excelente relacion riesgo/beneficio para LONG."
        }
        ```
*   **Canal WebSockets (Streaming de Tiempo Real):** `ws://localhost:8000/ws`
    *   Envía un payload de evento cada vez que los datos del mercado cambian para que las aplicaciones de frontend actualicen sus gráficos de forma instantánea.

---

## 🤖 Integración con OpenClaw y Agentes de IA

Este sistema ha sido diseñado como un microservicio local para alimentar a agentes inteligentes de OpenClaw. Desde un script o habilidad (`skill`) de OpenClaw, puedes consumir la señal para automatizar decisiones de trading:

```javascript
// Ejemplo de Skill en JS para OpenClaw
const response = await fetch('http://localhost:8000/api/analysis');
const analysis = await response.json();

if (analysis.scoring.recommended_action === "LONG") {
    console.log(`Fino recomienda abrir LONG. Confianza: ${analysis.scoring.value}`);
    // Integración de compra con API de Binance, Hyperliquid, etc.
}
```

---

## 🗺️ Roadmap de Implementación (8 Semanas)

*   **Semanas 1-2:** Recolección sistemática de instantáneas de mercado cada 10 minutos y almacenamiento persistente en PostgreSQL.
*   **Semanas 3-4:** Conexión de APIs de sentimiento social (Alternative.me para Fear & Greed, APIs de Reddit/X). Integración de Coinglass para variables de orden superior (Open Interest y liquidaciones).
*   **Semanas 5-6:** Desarrollo de un Dashboard visual en React/Next.js consumiendo las APIs y WebSockets de `main.py`.
*   **Semanas 7-8:** Entrenamiento de modelos de clasificación ML (XGBoost/LightGBM) utilizando el dataset de snapshots recolectado, y habilitación de simulación Paper Trading automatizada con control de Drawdown.
