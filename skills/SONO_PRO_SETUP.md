# Identidad y propósito
- **Nombre:** jarvisClaw 👒 — El Tejedor Digital
- **Proyecto principal:** Sono Pro Terminal de Trading
- **Propietario:** Santy (sparreno) — Madrid, España

# Skills instaladas para Sono Pro

## 1. sono-pro (skill personalizada)
- **Ruta:** `skills/sono-pro/skill.json`
- **Script:** `sono-deploy.mjs`
- **Triggers:** "despliega sono", "deploy sono pro", "actualiza sono", "estado sono", "monitorea sono"
- **Funciones:**
  - `deploy` → Verifica JS con Node, hace backup, despliega a Cloudflare
  - `status` → Muestra URLs y estado del proyecto
  - `monitor` → Verifica endpoints HTTP

## 2. Perplexity Search (ya instalada)
- **Ruta:** `~/.openclaw/workspace/skills/perplexity-search/`
- **Uso:** Buscar información actualizada de mercado, cripto, VIX, etc.
- **Setup:** Si falla por Cloudflare, ejecutar `node perplexity-search.mjs --visible`

## 3. Node.js
- JS engine para verificar sintaxis de scripts

# Agentes disponibles
- **main:** modelo deepseek/deepseek-v4-flash (agente principal)
- **Spawn sub-agentes:** Usar `sessions_spawn` para tareas aisladas

# Tareas automáticas (cron)

## Tarea 1: Revisión matutina (7:00 AM Europe/Madrid)
```json
{
  "name": "sono-revision-manana",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "Europe/Madrid" },
  "sessionTarget": "main",
  "payload": {
    "kind": "systemEvent",
    "text": "Son las 7:00 AM. Revisa Sono Pro: mercado nocturno, bot trading, dashboard, y cualquier alerta pendiente del proyecto."
  }
}
```

## Tarea 2: Revisión nocturna (20:00 Europe/Madrid)
```json
{
  "name": "sono-revision-noche",
  "schedule": { "kind": "cron", "expr": "0 20 * * *", "tz": "Europe/Madrid" },
  "sessionTarget": "main",
  "payload": {
    "kind": "systemEvent",
    "text": "Son las 20:00. Revisa Sono Pro: resumen del día, trades ejecutados, estado del bot, y plan para mañana."
  }
}
```

# URLs de producción
- **Landing:** https://indicador-sono.pages.dev/
- **Dashboard:** https://indicador-sono.pages.dev/dashboard_sono/
- **Trades:** https://indicador-sono.pages.dev/trades/

# Stack técnico
- **Hosting:** Cloudflare Pages (proyecto `indicador-sono`)
- **Frontend:** HTML + CSS + JS inline (sin frameworks)
- **Backend:** Cero backend — 100% client-side
- **Datos:** Binance REST API (ticker/24hr, klines)
- **Persistencia:** localStorage (trades, señales)
- **Bot trading:** Python local (`sono_bot.py`)

# Referencia: mifuturapp.com (competidor)
- Suite de 3 páginas PHP que Sono Pro debe emular
- Macro (index.php), Trades (trades_explorer.php), Range (range_explorer.php)
- Sistema "Number-First" con Fuente, Última actualización, min/max/Δ
- Equity curve real con 61 trades, Profit Factor 1.26, Winrate 48.4%
- Multi-timeframe simultáneo (1m/3m/5m/15m)

# Reglas operativas
1. Backup antes de cada deploy
2. Verificar JS con Node antes de subir
3. NO editar HTML con PowerShell
4. Deploy directo a producción
5. Responder siempre en español
