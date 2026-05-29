// useMacro.js — todas las llamadas en PARALELO con Promise.all
// Antes: await F&G → await CoinGecko → await EUR = 1.4-2.5s en serie
// Ahora: Promise.all([F&G, CoinGecko, EUR]) = 0.5-0.9s en paralelo
import { useState, useEffect, useRef } from 'react'

const VIX_PROXY_URL = 'https://vix-proxy.sonosanty.workers.dev'

// Caché con TTL para datos que cambian lentamente
const CACHE = {
  _store: {},
  get(key, ttlMs) {
    const entry = this._store[key]
    if (entry && Date.now() - entry.ts < ttlMs) return entry.data
    return null
  },
  set(key, data) {
    this._store[key] = { data, ts: Date.now() }
  }
}

export function useMacro() {
  const [data, setData] = useState({
    fearGreed: null, btcDom: null, ethDom: null, altsDom: null,
    marketCap: null, volume24h: null, vix: null, vixAvailable: false,
    eurRate: null, lastUpdate: null, sources: {}
  })
  const mountedRef = useRef(true)

  // Funciones fetch con caché
  const fetchFG = async () => {
    const cached = CACHE.get('fear_greed', 60 * 60 * 1000) // 1h, cambia una vez al día
    if (cached) return cached
    const r = await fetch('https://api.alternative.me/fng/?limit=1')
    const d = await r.json()
    const item = d?.data?.[0]
    const result = item ? { value: +item.value, label: item.value_classification } : null
    if (result) CACHE.set('fear_greed', result)
    return result
  }

  const fetchCG = async () => {
    const cached = CACHE.get('coingecko_global', 5 * 60 * 1000) // 5min
    if (cached) return cached
    const r = await fetch('https://api.coingecko.com/api/v3/global')
    const d = await r.json()
    const result = d?.data ?? null
    if (result) CACHE.set('coingecko_global', result)
    return result
  }

  const fetchEUR = async () => {
    if (!VIX_PROXY_URL) return null
    const cached = CACHE.get('eur_rate', 15 * 60 * 1000) // 15min
    if (cached) return cached
    const r = await fetch(VIX_PROXY_URL + '/eur')
    const d = await r.json()
    const result = d?.eur ?? null
    if (result) CACHE.set('eur_rate', result)
    return result
  }

  const fetchVIX = async () => {
    if (!VIX_PROXY_URL) return null
    const cached = CACHE.get('vix', 15 * 60 * 1000) // 15min
    if (cached) return cached
    const r = await fetch(VIX_PROXY_URL)
    const d = await r.json()
    const result = d?.vix ?? null
    if (result) CACHE.set('vix', result)
    return result
  }

  const load = async () => {
    const [fg, cg, eur, vix] = await Promise.allSettled([
      fetchFG(), fetchCG(), fetchEUR(), fetchVIX()
    ])

    if (!mountedRef.current) return

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
    const int = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(int)
  }, [])

  useEffect(() => () => { mountedRef.current = false }, [])
  return data
}
