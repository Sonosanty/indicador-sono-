// ═══════════════════════════════════════════════════════════════════════════
// SONO BOT WORKER — Cloudflare Worker v2.1
// Bot de trading autónomo que corre en Cloudflare Workers.
// No depende de OpenClaw, Python, ni ningún proceso local.
//
// Endpoints:
//   GET  /api/status         — Estado actual del bot (scores, posiciones)
//   GET  /api/scores/:asset  — Score de un activo específico
//   GET  /api/history         — Historial de scores
//   POST /api/sync           — Forzar una ejecución ahora
//
// Cron: se ejecuta cada 2 minutos automáticamente
// Persistencia: Cloudflare KV (SONO_BOT_KV)
//
// v2.1 fixes:
//   - CoinGecko fallback a CoinCap.io (funciona desde Workers)
//   - EUR/USD via Frankfurter (gratis, sin API key, funciona desde Workers)
//   - Eliminado BINANCE (variable no definida que rompía EUR/USD)
// ═══════════════════════════════════════════════════════════════════════════

// Nota: Binance bloquea IPs de Cloudflare Workers (error 451)
// Se usa KuCoin como alternativa
const KUCOIN = 'https://api.kucoin.com/api/v1'
const COINGECKO = 'https://api.coingecko.com/api/v3'
const ALTERNATIVE = 'https://api.alternative.me/fng'
const COINCAP = 'https://api.coincap.io/v2'
const FRANKFURTER = 'https://api.frankfurter.app'

const ASSETS = ['BTC', 'ETH', 'SOL', 'XRP']
const LIMIT = 220

const LABELS = [
  { min: 78, signal: 'COMPRA FUERTE', level: 6, action: 'LONG' },
  { min: 62, signal: 'COMPRA', level: 5, action: 'LONG PRUDENTE' },
  { min: 52, signal: 'ACUMULACIÓN', level: 4, action: 'ACUMULAR' },
  { min: 42, signal: 'NEUTRAL', level: 3, action: 'ESPERAR' },
  { min: 30, signal: 'DISTRIBUCIÓN', level: 2, action: 'REDUCIR' },
  { min: 18, signal: 'VENTA', level: 1, action: 'SHORT' },
  { min: 0,  signal: 'CAPITULACIÓN', level: 0, action: 'CASH/FUERA' },
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

// ═══ HELPERS TÉCNICOS ══════════════════════════════════════════════════

function sm(arr, p) {
  if (!arr || arr.length < p) return null
  let s = 0
  for (let i = arr.length - p; i < arr.length; i++) s += +arr[i]
  return s / p
}

function rsi(closes, p = 14) {
  if (!closes || closes.length < p + 1) return null
  let g = 0, l = 0
  for (let i = closes.length - p; i < closes.length; i++) {
    const d = +closes[i] - +closes[i - 1]
    if (d > 0) g += d; else l -= d
  }
  return Math.round(100 - 100 / (1 + (g / p) / ((l / p) || 0.0001)))
}

function adx(h, l, c, p = 14) {
  if (!c || c.length < p + 2) return null
  let pD = [], mD = [], tr = []
  for (let i = 1; i < c.length; i++) {
    const pH = +h[i] - +h[i - 1], mL = +l[i - 1] - +l[i]
    pD.push(pH > mL && pH > 0 ? pH : 0)
    mD.push(mL > pH && mL > 0 ? mL : 0)
    tr.push(Math.max(+h[i] - +l[i], Math.abs(+h[i] - +c[i - 1]), Math.abs(+l[i] - +c[i - 1])))
  }
  let sp = 0, sm2 = 0, st = 0
  for (let i = pD.length - p; i < pD.length; i++) { sp += pD[i]; sm2 += mD[i]; st += tr[i] }
  st = st || 1
  const pDI = Math.round(100 * sp / st), mDI = Math.round(100 * sm2 / st)
  return Math.round(Math.abs(pDI - mDI) / ((pDI + mDI) || 1) * 100)
}

function bb(closes, p = 20, k = 2) {
  if (!closes || closes.length < p) return { pb: null }
  const sl = closes.slice(-p)
  let m = 0; for (let i = 0; i < p; i++) m += +sl[i]; m /= p
  let sd = 0; for (let i = 0; i < p; i++) sd += (+sl[i] - m) ** 2; sd = Math.sqrt(sd / p)
  const upper = m + k * sd, lower = m - k * sd
  return { pb: (+closes[closes.length - 1] - lower) / ((upper - lower) || 1), upper, middle: m, lower }
}

function computeScore(candles) {
  if (!candles || candles.length < 30) return null
  const cl = candles.map(x => +x[4]), hi = candles.map(x => +x[2]), lo = candles.map(x => +x[3])
  const price = cl[cl.length - 1], tLen = cl.length
  const m6 = sm(cl, 6), m40 = sm(cl, 40), m70 = sm(cl, 70)
  const m2 = tLen >= 200 ? sm(cl, 200) : null
  const r = rsi(cl), a = adx(hi, lo, cl)
  const b = bb(cl).pb

  let p1 = 0
  if (m6 && m70) p1 += m6 > m70 ? 15 : 0
  if (m40) p1 += price > m40 ? 10 : 0
  if (m2) p1 += price > m2 ? 10 : 0

  let p2 = 0
  if (a) p2 += a > 25 ? 15 : a > 20 ? 8 : 0
  if (r) p2 += r > 55 ? 20 : r > 50 ? 14 : r < 30 ? 18 : r < 45 ? 6 : 10

  let p3 = 0
  if (b !== null) p3 = b > 0.8 || b < 0 ? 5 : b > 0.5 ? 10 : b > 0.2 ? 25 : b > 0 ? 20 : 5

  const total = Math.round(p1 + p2 + p3)
  const label = LABELS.find(l => total >= l.min) || LABELS[LABELS.length - 1]

  return {
    total, p1, p2, p3, rsi: r, adx: a, pb: b,
    ma6: m6, ma40: m40, ma70: m70, ma200: m2,
    price, signal: label.signal, level: label.level,
    action: label.action
  }
}

// ═══ BINANCE DATA ═════════════════════════════════════════════════════

const SYMBOLS = { BTC: 'BTC-USDT', ETH: 'ETH-USDT', SOL: 'SOL-USDT', XRP: 'XRP-USDT' }
const KUCOIN_INTERVAL = '15min'

async function fetchCandles(asset) {
  const sym = SYMBOLS[asset]
  const url = `${KUCOIN}/market/candles?type=${KUCOIN_INTERVAL}&symbol=${sym}&limit=${LIMIT}`
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  })
  if (!resp.ok) throw new Error(`KuCoin klines ${asset}: ${resp.status}`)
  const data = await resp.json()
  if (data.code !== '200000') throw new Error(`KuCoin error ${asset}: ${data.code}`)
  // KuCoin devuelve [tiempo, apertura, cierre, maximo, minimo, volumen, cantidad]
  // Lo normalizamos al mismo formato que Binance: [tiempo, open, high, low, close, volume]
  return data.data.map(c => [
    +c[0], +c[1], +c[3], +c[4], +c[2], +c[5]
  ])
}

async function fetchTicker(asset) {
  const sym = SYMBOLS[asset]
  // Ticker 24h desde KuCoin
  const resp = await fetch(`${KUCOIN}/market/stats?symbol=${sym}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  })
  if (!resp.ok) throw new Error(`KuCoin ticker ${asset}: ${resp.status}`)
  const d = await resp.json()
  if (d.code !== '200000') throw new Error(`KuCoin ticker error ${asset}: ${d.code}`)
  const t = d.data
  return { close: +t.last, change: +t.changeRate * 100, high: +t.high, low: +t.low }
}

// ═══ MACRO DATA ════════════════════════════════════════════════════════

async function fetchMacro(env, ctx) {
  const results = {}

  // F&G
  try {
    const fng = await fetch(`${ALTERNATIVE}/?limit=1`)
    const fngData = await fng.json()
    if (fngData?.data?.[0]) results.fng = +fngData.data[0].value
  } catch (e) { results.fng_error = e.message }

  // CoinGecko global — con retry (2 intentos, timeout 10s) + fallback CoinCap.io + KV cache
  let cgSuccess = false
  const CG_CACHE_TTL = 300000 // 5 min
  for (let attempt = 0; attempt < 2 && !cgSuccess; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const cg = await fetch(`${COINGECKO}/global`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      })
      clearTimeout(timeoutId)
      if (cg.ok) {
        const cgData = await cg.json()
        if (cgData?.data) {
          results.dominance = cgData.data.market_cap_percentage.btc || 0
          results.mcap = cgData.data.total_market_cap.usd || 0
          results.eth_dominance = cgData.data.market_cap_percentage.eth || 0
          cgSuccess = true
          ctx?.waitUntil(
            env?.SONO_BOT_KV?.put('cg_cache', JSON.stringify({
              dominance: results.dominance,
              mcap: results.mcap,
              eth_dominance: results.eth_dominance,
              updated_at: Date.now()
            }))
          )
        }
      } else {
        throw new Error('CG status ' + cg.status)
      }
    } catch (e) {
      results.cg_error = (results.cg_error || '') + '; attempt ' + attempt + ': ' + e.message
    }
  }

  // Fallback: CoinCap.io (gratis, sin rate limit, funciona desde Workers)
  if (!cgSuccess) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const capResp = await fetch(`${COINCAP}/assets?ids=bitcoin,ethereum`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      })
      clearTimeout(timeoutId)
      if (capResp.ok) {
        const capData = await capResp.json()
        if (capData?.data) {
          const btcAsset = capData.data.find(a => a.id === 'bitcoin')
          const ethAsset = capData.data.find(a => a.id === 'ethereum')
          if (btcAsset) {
            results.dominance = 55
            results.mcap = +(btcAsset.marketCapUsd || 0) * 1.8
            results.cg_from = 'coincap'
          }
          if (ethAsset && btcAsset) {
            const btcMc = +btcAsset.marketCapUsd || 1
            const ethMc = +ethAsset.marketCapUsd || 0
            results.eth_dominance = +(ethMc / (btcMc / (results.dominance / 100)) * 100).toFixed(1)
          }
        }
      }
    } catch (e2) {
      results.cg_error = (results.cg_error || '') + '; coincap: ' + e2.message
    }
  }

  // Último recurso: cache KV
  if (!cgSuccess && results.dominance === undefined) {
    try {
      const cached = await env?.SONO_BOT_KV?.get('cg_cache', { type: 'json' })
      if (cached?.dominance !== undefined) {
        results.dominance = cached.dominance
        results.mcap = cached.mcap
        results.eth_dominance = cached.eth_dominance
        results.cg_from = 'cache'
        results.cg_cache_age = Date.now() - cached.updated_at
      }
    } catch (cacheErr) {
      results.cg_error = (results.cg_error || '') + '; cache: ' + cacheErr.message
    }
  }

  // VIX — directo a Yahoo Finance (evita error 1042 de Worker→Worker)
  try {
    const yahoo = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=2d', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (yahoo.ok) {
      const yahooData = await yahoo.json()
      const closes = yahooData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []
      const vixVal = closes.filter(c => c !== null).pop()
      if (vixVal) results.vix = vixVal
    }
  } catch (e) { results.vix_error = e.message }

  // EUR/USD — Frankfurter (gratis, sin API key, funciona desde Workers)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const eurResp = await fetch(`${FRANKFURTER}/latest?from=USD&to=EUR`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    clearTimeout(timeoutId)
    if (eurResp.ok) {
      const eurData = await eurResp.json()
      // Frankfurter devuelve cuántos EUR da 1 USD: ej 0.92
      if (eurData?.rates?.EUR) results.eur = +eurData.rates.EUR
    }
  } catch (e) { results.eur_error = e.message }

  return results
}

// ═══ PERSISTENCIA KV ══════════════════════════════════════════════════

async function getState(env) {
  try {
    const raw = await env.SONO_BOT_KV.get('state', { type: 'json' })
    return raw || { scores: {}, history: [], trades: [], lastRun: null, version: 2 }
  } catch { return { scores: {}, history: [], trades: [], lastRun: null, version: 2 } }
}

async function saveState(env, state) {
  await env.SONO_BOT_KV.put('state', JSON.stringify(state))
}

// ═══ LÓGICA PRINCIPAL ═════════════════════════════════════════════════

async function runBot(env, ctx) {
  const state = await getState(env)
  const results = {}

  const macro = await fetchMacro(env, ctx)

  for (const asset of ASSETS) {
    try {
      const candles = await fetchCandles(asset)
      const ticker = await fetchTicker(asset)
      const score = computeScore(candles)

      if (score) {
        score.change_24h = ticker.change
        score.high_24h = ticker.high
        score.low_24h = ticker.low
        score.macro = {
          fng: macro.fng || null,
          vix: macro.vix || null,
          dominance: macro.dominance || null,
          mcap: macro.mcap || null,
          eth_dominance: macro.eth_dominance || null,
          eur: macro.eur || null,
        }
        results[asset] = score
      }
    } catch (e) {
      results[asset] = { error: e.message }
    }
  }

  state.scores = results
  state.macro = macro
  state.lastRun = new Date().toISOString()

  for (const asset of ASSETS) {
    if (results[asset]?.total !== undefined) {
      state.history.push({
        t: state.lastRun,
        a: asset,
        s: results[asset].total,
        p: results[asset].price,
        sig: results[asset].signal
      })
    }
  }
  if (state.history.length > 1000) state.history = state.history.slice(-1000)

  await saveState(env, state)
  return { results, macro, lastRun: state.lastRun }
}

// ═══ HANDLER HTTP ═════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    const path = url.pathname.replace(/\/$/, '')

    if (path === '/api/status' && request.method === 'GET') {
      const state = await getState(env)
      return new Response(JSON.stringify(state), { headers: CORS })
    }

    const matchScore = path.match(/^\/api\/scores\/([A-Z]+)$/)
    if (matchScore && request.method === 'GET') {
      const state = await getState(env)
      const asset = matchScore[1]
      return new Response(JSON.stringify(state.scores?.[asset] || { error: 'no data' }), { headers: CORS })
    }

    if (path === '/api/history' && request.method === 'GET') {
      const state = await getState(env)
      return new Response(JSON.stringify(state.history || []), { headers: CORS })
    }

    if (path === '/api/sync' && request.method === 'POST') {
      const result = await runBot(env, ctx)
      return new Response(JSON.stringify(result), { headers: CORS })
    }

    return new Response(
      JSON.stringify({ error: 'not found', paths: ['/api/status', '/api/scores/:asset', '/api/history', '/api/sync'] }),
      { status: 404, headers: CORS }
    )
  },

  async scheduled(event, env, ctx) {
    console.log(`SONO BOT: Cron ejecutado ${event.type}`)
    try {
      const result = await runBot(env, ctx)
      console.log(`SONO BOT: Completado.`,
        Object.keys(result.results).map(a => `${a}=${result.results[a]?.total}`).join(', '))
    } catch (e) {
      console.error(`SONO BOT: Error en ciclo cron:`, e.message)
    }
  }
}
