// ═══════════════════════════════════════════════════════════════
// vix-proxy-worker — Proxy Yahoo Finance ^VIX con CORS
// v2.0: + Logs + KV caching + error tracking
// ═══════════════════════════════════════════════════════════════

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d'
const EUR_RATE_URL = 'https://api.exchangerate-api.com/v4/latest/USD'
const CACHE_TTL = 120 // segundos (2 min, en vez de 5 min para más frescura)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const startTime = Date.now()

    // ── OPTIONS (preflight CORS) ──────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    // ── Proxy para exchangerate-api ──────────────────────────
    if (url.pathname === '/eur') {
      const cached = env.VIX_CACHE ? await env.VIX_CACHE.get('eur', { type: 'json' }) : null
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return new Response(JSON.stringify(cached), {
          headers: { ...CORS_HEADERS, 'X-Cache': 'HIT' },
        })
      }
      try {
        const res = await fetch(EUR_RATE_URL)
        if (!res.ok) throw new Error(res.status)
        const data = await res.json()
        const rate = data.rates?.EUR
        if (rate == null) throw new Error('EUR rate not found')
        const payload = { eur: +rate, timestamp: Date.now() }
        if (env.VIX_CACHE) {
          await env.VIX_CACHE.put('eur', JSON.stringify(payload), { expirationTtl: CACHE_TTL + 30 })
        }
        return new Response(JSON.stringify(payload), { headers: { ...CORS_HEADERS, 'X-Cache': 'MISS' } })
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers: CORS_HEADERS })
      }
    }

    // ── Endpoint de health check ──────────────────────────────
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), {
        headers: CORS_HEADERS,
      })
    }

    // ── VIX: intentar cache ───────────────────────────────────
    if (env.VIX_CACHE) {
      const cached = await env.VIX_CACHE.get('vix', { type: 'json' })
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        console.log(`[VIX_PROXY] Cache HIT · ${cached.vix} · age=${Math.round((Date.now() - cached.timestamp) / 1000)}s`)
        return new Response(JSON.stringify(cached), {
          headers: { ...CORS_HEADERS, 'X-Cache': 'HIT', 'X-Age': String(Math.round((Date.now() - cached.timestamp) / 1000)) },
        })
      }
      console.log(`[VIX_PROXY] Cache MISS`)
    }

    // ── Fetch a Yahoo Finance ─────────────────────────────────
    try {
      const yahoo = await fetch(YAHOO_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VIX-Proxy-Worker/2.0)' },
      })

      if (!yahoo.ok) {
        console.error(`[VIX_PROXY] Yahoo respondió ${yahoo.status} ${yahoo.statusText}`)
        return new Response(JSON.stringify({ error: `Yahoo responded ${yahoo.status}`, vix: null }), {
          status: 502, headers: CORS_HEADERS,
        })
      }

      const data = await yahoo.json()
      const elapsed = Date.now() - startTime
      console.log(`[VIX_PROXY] Yahoo OK · ${elapsed}ms`)

      const result = data?.chart?.result?.[0]
      const vix = result?.meta?.regularMarketPrice
      const prevClose = result?.meta?.previousClose ?? result?.meta?.chartPreviousClose

      if (vix == null) {
        console.warn(`[VIX_PROXY] Yahoo respondió sin datos de precio`)
        return new Response(JSON.stringify({ error: 'VIX no disponible', vix: null }), {
          status: 502, headers: CORS_HEADERS,
        })
      }

      const change = prevClose ? +(((vix - prevClose) / prevClose) * 100).toFixed(2) : null

      const payload = {
        vix: +vix.toFixed(2),
        change,
        prevClose: prevClose ? +prevClose.toFixed(2) : null,
        source: 'Yahoo Finance ^VIX',
        timestamp: Date.now(),
        elapsed_ms: elapsed,
      }

      // ── Guardar en cache ────────────────────────────────────
      if (env.VIX_CACHE) {
        await env.VIX_CACHE.put('vix', JSON.stringify(payload), {
          expirationTtl: CACHE_TTL + 30,
        })
        console.log(`[VIX_PROXY] Cache SET · ${payload.vix} · TTL=${CACHE_TTL}s`)
      }

      return new Response(JSON.stringify(payload), {
        headers: { ...CORS_HEADERS, 'X-Cache': 'MISS' },
      })

    } catch (err) {
      console.error(`[VIX_PROXY] Error: ${err.message}`)
      return new Response(JSON.stringify({ error: String(err), vix: null }), {
        status: 500, headers: CORS_HEADERS,
      })
    }
  },
}
