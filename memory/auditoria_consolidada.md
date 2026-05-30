# Auditoría Sono PRO — 30 Mayo 2026 (20:15 CET)

## Resumen consolidado (3 agentes)

| Agente | 🔴 Críticos | 🟡 Altos | 🟢 Leves | ✅ OK |
|---|---|---|---|---|
| Frontend | 5 | 7 | 12 | 24 |
| Backend + Git | 4 | 5 | 5 | 9 |
| Cloudflare + GitHub | 0 | 1 | 1 | 16 |
| **Total** | **9** | **13** | **18** | **49** |

## 🔴 Críticos (9)

### Frontend (5)
1. **sono-boot.js huérfano** — 3.8KB de código que no se usa en ninguna página (sobrante de implantación anterior)
2. **Event listeners duplicados** — cada clic en asset selector dispara 2 fetches idénticos = 4 llamadas API
3. **ADX incorrecto** — usa solo close prices en vez de high/low según Wilder. P2 del score recibe datos sesgados
4. **Fórmulas de Score diferentes** entre pagina.html y metodo.html — un mismo mercado da señales distintas (pagina usa ADX+RSI+BB, metodo usa solo RSI+ADX)
5. **Range Explorer señales mecánicas** — niveles S/R sintéticos cuando faltan pivots reales

### Backend (4)
6. **API keys en pionex_credentials.json/rar** — NO en .gitignore, riesgo de commit
7. **Signature mismatches** entre telegram_alerts.py y sono_bot.py — 3 funciones llamadas con argumentos incorrectos → TypeError (cazado por try/except, pero alertas nunca se envían)
8. **parse_mode='Markdown' pero envía HTML** — tags &lt;b&gt; se ven crudos en Telegram
9. **Scripts legacy con keys hardcodeadas** — archivos Python antiguos en workspace que pueden tener credenciales

## 🟡 Altos (13)

### Frontend (7)
- Sin AbortController en fetchs (excepto metodo.html)
- VIX proxy ficticio basado en Fear & Greed, no real
- Trades 100% datos demo hardcodeados (no conectados a bot real)
- WS sin cleanup ni control de reconexión múltiple
- Score no se refresca periódicamente en pagina.html (solo al cargar o al clicar activo)
- _routes.json no incluye páginas HTML estáticas
- Post-build con dead code (return prematuro mata generación de index.html SPA)

### Backend (5)
- scoring.py división por cero con fix parcial (loss=0.001 pero gain=0 da RSI=100)
- Submodules con modified content (ruido en git status)
- Riesgo de commit accidental de credenciales
- Dos motores de scoring distintos (intencional pero confuso para debugging)
- parse_mode mismatch entre Markdown y HTML en Telegram

### Cloudflare (1)
- CSP faltante en Cloudflare Pages (recomendación: _headers)

## 🟢 Leves (18)
- CSS: 19 clases que pagina.html usa pero no están definidas en style.css
- SPA React compilado (~550KB) nunca cargado (sobrescrito por pagina.html)
- Navegación con rutas absolutas en metodo.html
- lucide-react instalado pero no usado
- activeAsset sin declaración en strict mode
- Encoding warnings en Windows (cp1252 vs UTF-8)
- Dead import (SonoStrategy en main.py)
- Backups como submodules en git
- Latencia precio en web_fetch (no real)
- Variables sin usar (varias)
- Y otros menores...

## ✅ OK (49)
- Build exitoso ✅
- Asset hashing correcto ✅
- APIs reales: Binance, CoinGecko, Alternative.me ✅
- WS conecta ✅
- RSI correcto ✅
- Bollinger %B correcto ✅
- CSS design system completo ✅
- Paper mode activo ✅
- API keys via .env (sono_bot.py) ✅
- .env existe ✅
- Todos los módulos importables ✅
- Divisiones protegidas ✅
- Timeouts en todos los requests ✅
- main.py arranca ✅
- sono_bot.py arranca ✅
- Git al día con origin, sin push pendiente ✅
- Bot PID 13624 activo ✅
- Dashboard: datos macro, score, precio, dominancias ✅
- Range Explorer: Chart.js, 4 TFs ✅
- Trades Explorer: WS ONLINE, equity chart ✅
- Método: Score completo ✅
- /v2/ redirige correctamente ✅
- /style.css HTTP 200 ✅
- GitHub remote correcto ✅
- OpenClaw Gateway running ✅
- Telegram plugin enabled ✅
- Skill indicador-sono enabled ✅
- Asset selector funcional (BTC/ETH/SOL/XRP) ✅
