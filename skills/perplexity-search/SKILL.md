---
slug: perplexity-search
name: Perplexity Search
version: 1.0.10
description: Busca informacion actualizada en internet usando Perplexity.ai.
run:
  command: node
  args:
    - perplexity-search.mjs
    - "{{query}}"
inputs:
  query:
    type: string
    description: La consulta en lenguaje natural
    required: true
output:
  type: json
---

# Perplexity Search Skill (Auto-Browser Edition 👒)

Busca información en tiempo real con Playwright utilizando perfiles de navegador persistentes.

Esta versión implementa la arquitectura de **LvcidPsyche/Auto-Browser**, permitiendo mantener sesiones activas y eludir bloqueos de Cloudflare mediante un navegador persistente e intervención manual por única vez.

## Características

1. **Perfiles Persistentes:** Almacena cookies, sesiones de inicio y tokens en `.openclaw/profiles/perplexity-profile`.
2. **Modo Setup (Manual):** Permite abrir la ventana del navegador visible para iniciar sesión o resolver retos de Cloudflare manualmente.
3. **Detección Dinámica de Stream:** Mide el tamaño de la respuesta asíncronamente y frena el scrapeo al terminar el streaming de texto.

## Cómo solucionar bloqueos de Cloudflare o Iniciar Sesión

Si el scraper falla, debes realizar un setup manual de la sesión. Desde la consola del workspace, ejecuta:

```bash
node perplexity-search.mjs --visible
```

*Esto abrirá una ventana de Chrome visible en tu escritorio. Resuelve el captcha de Cloudflare, inicia sesión en tu cuenta si lo deseas, y cuando estés listo, simplemente cierra la ventana del navegador. El perfil persistente guardará todo el estado para futuras búsquedas automáticas.*

## Uso General

- **Automático (Headless):** `node perplexity-search.mjs "precio bitcoin hoy"`
- **Ver lo que hace el agente:** `node perplexity-search.mjs "precio bitcoin hoy" --visible`