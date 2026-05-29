// ═══════════════════════════════════════════════════════════════
// useMacro.js — Caché SWR (Stale-While-Revalidate) + TTL
//
// Patrón: entrega dato cacheado al instante, si está viejo
// pero aceptable, refresca en background sin bloquear la UI.
//
// TTL sugeridos:
//   Binance spot/klines : 10-15s
//   VIX proxy           : 120-180s (alineado con Worker)
//   Fear & Greed        : 5 min (cambia 1x/día, pero seguro)
//   CoinGecko macro     : 3-5 min
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'

const VIX_PROXY_URL = 'https://vix-proxy.sonosanty.workers.dev'

// ── SWR Cache ──────────────────────────────────────────
const cache = new Map()

function swrFetch(key, fetcher, freshMs, staleMs) {
  const now = Date.now()
  const hit = cache.get(key)

  if (hit && now < hit.freshUntil) {
    return Promise.resolve(hit.data)
  }

  if (hit && now < hit.staleUntil) {
    // refresh en background, devuelve dato stale
    fetcher()
      .then((data) => {
        cache.set(key, {
          data,
          freshUntil: now + freshMs,
          staleUntil: now + staleMs,
        })
      })
      .catch(() => {}) // falla silenciosa, el dato stale es mejor que nada
    return Promise.resolve(hit.data)
  }

  // Sin caché o expirado del todo: fetch blocking
  return fetcher().then((data) => {
    cache.set(key, {
      data,
      freshUntil: now + freshMs,
      staleUntil: now + staleMs,
    })
    return data
  })
}

// ── Fetchers individuales con TTL ──────────────────────
const TTL = {
  fearGreed:   { fresh:  5 * 60 * 1000, stale: 60 * 60 * 1000 }, // 5min fresh, 1h stale
  coinGecko:   { fresh:  3 * 60 * 1000, stale:  5 * 60 * 1000 }, // 3min fresh, 5min stale
  eurRate:     { fresh: 15 * 60 * 1000, stale: 30 * 60 * 1000 }, // 15min fresh, 30min stale
  vix:         { fresh:  2 * 60 * 1000, stale:  3 * 60 * 1000 }, // 2min fresh, 3min stale (alineado Worker 120s)
}

async function fetchFG() {
  const r = await fetch('https://api.alternative.me/fng/?limit=1')
  const d = await r.json()
  const item = d?.data?.[0]
  return item ? { value: +item.value, label: item.value_classification } : null
}

async function fetchCG() {
  const r = await fetch('https://api.coingecko.com/api/v3/global')
  const d = await r.json()
  return d?.data ?? null
}

async function fetchEUR() {
  if (!VIX_PROXY_URL) return null
  const r = await fetch(VIX_PROXY_URL + '/eur')
  const d = await r.json()
  return d?.eur ?? null
}

async function fetchVIX() {
  if (!VIX_PROXY_URL) return null
  const r = await fetch(VIX_PROXY_URL)
  const d = await r.json()
  return d?.vix ?? null
}

// ── Hook principal ─────────────────────────────────────
export function useMacro() {
  const [data, setData] = useState({
    fearGreed: null, btcDom: null, ethDom: null, altsDom: null,
    marketCap: null, volume24h: null, vix: null, vixAvailable: false,
    eurRate: null, lastUpdate: null, sources: {}
  })
  const mountedRef = useRef(true)

  const load = async () => {
    const results = await Promise.allSettled([
      swrFetch('fear_greed',   fetchFG, TTL.fearGreed.fresh,  TTL.fearGreed.stale),
      swrFetch('coingecko',    fetchCG, TTL.coinGecko.fresh,  TTL.coinGecko.stale),
      swrFetch('eur_rate',     fetchEUR, TTL.eurRate.fresh,   TTL.eurRate.stale),
      swrFetch('vix',          fetchVIX, TTL.vix.fresh,       TTL.vix.stale),
    ])

    if (!mountedRef.current) return

    const [fg, cg, eur, vix] = results
    const updates = { sources: {} }

    if (fg.status === 'fulfilled' && fg.value) {
      updates.fearGreed = fg.value
      updates.sources.fearGreed = 'Alternative.me · API'
    }

    if (cg.status === 'fulfilled' && cg.value) {
      const g = cg.value
      updates.btcDom    = +g.market_cap_percentage?.btc?.toFixed(2)
      updates.ethDom    = +g.market_cap_percentage?.eth?.toFixed(2)
      updates.altsDom   = +(100 - g.market_cap_percentage.btc - g.market_cap_percentage.eth).toFixed(2)
      updates.marketCap = g.total_market_cap?.usd
      updates.volume24h = g.total_volume?.usd
      updates.sources.dominance = 'CoinGecko Global · API'
    }

    if (eur.status === 'fulfilled' && eur.value) {
      updates.eurRate = eur.value
      updates.sources.eur = 'exchangerate-api · Worker proxy'
    }

    if (vix.status === 'fulfilled' && vix.value != null) {
      updates.vix = vix.value
      updates.vixAvailable = true
      updates.sources.vix = 'Yahoo Finance · ^VIX · Worker proxy'
    } else {
      updates.vix = null
      updates.vixAvailable = false
    }

    updates.lastUpdate = Date.now()
    setData(prev => ({ ...prev, ...updates, sources: { ...prev.sources, ...updates.sources } }))
  }

  useEffect(() => {
    mountedRef.current = true
    load()
    const int = setInterval(load, 60 * 1000) // 1 min poll (SWR decide si realmente fetch)
    return () => clearInterval(int)
  }, [])

  useEffect(() => () => { mountedRef.current = false }, [])
  return data
}
