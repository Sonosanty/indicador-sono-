// ═══════════════════════════════════════════════════════════════
// useBinance.js — Datos de Binance con SWR + WebSocket robusto
//
// Usa useWebSocket.js para conexión live con reconexión automática.
// Mantiene SWR como capa de cache (stale-while-revalidate).
// Muestra indicador de estado de conexión.
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useWebSocket, WS_STATES } from './useWebSocket.js'

export const ASSETS = {
  BTC: { symbol: 'BTCUSDT', cgId: 'bitcoin',  color: '#f7931a', dec: 2 },
  ETH: { symbol: 'ETHUSDT', cgId: 'ethereum', color: '#627eea', dec: 2 },
  SOL: { symbol: 'SOLUSDT', cgId: 'solana',   color: '#9945ff', dec: 3 },
  XRP: { symbol: 'XRPUSDT', cgId: 'ripple',   color: '#00aae4', dec: 4 },
}

const BINANCE_REST   = 'https://api.binance.com/api/v3'
const BINANCE_WS     = 'wss://stream.binance.com:9443/ws'
const CANDLE_LIMIT   = 350

/**
 * Hook principal que expone velas, ticker y estado de conexión.
 *
 * @param {string} activeAsset - Activo seleccionado (BTC, ETH, SOL, XRP)
 * @param {string} interval - Intervalo de velas (ej: '3m', '15m')
 * @returns {object} { candles, ticker, wsStatus, latency, lastUpdate, apiSource, connectionStatus, assetCandles, assetTicker }
 */
export function useBinance(activeAsset, interval = '3m') {
  const [candles,    setCandles]    = useState({})
  const [ticker,     setTicker]     = useState({})
  const [latency,    setLatency]    = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [apiSource,  setApiSource]  = useState('binance')

  const mountedRef = useRef(true)
  const throttleRef = useRef(null)
  const candleCache = useRef({}) // cache local para throttle WS

  // ── Configurar WebSocket para el activo activo ──────────────
  const sym = ASSETS[activeAsset]?.symbol?.toLowerCase()
  const wsUrl = sym ? `${BINANCE_WS}/${sym}@kline_${interval}` : ''
  const subscriptions = useMemo(() => 
    sym ? [`${sym}@kline_${interval}`] : []
  , [sym, interval])

  const ws = useWebSocket(wsUrl, subscriptions, {
    staleTimeout: 60_000,    // 60s sin datos → stalled
    heartbeatInterval: 180_000, // ping cada 3min
  })

  // ── Mapear estado WebSocket a indicador visual ──────────────
  const connectionStatus = useMemo(() => {
    switch (ws.status) {
      case WS_STATES.CONNECTED:     return 'live'
      case WS_STATES.CONNECTING:    return 'connecting'
      case WS_STATES.RECONNECTING:  return 'reconnecting'
      case WS_STATES.STALLED:       return 'stalled'
      case WS_STATES.ERROR:         return 'error'
      default:                      return 'disconnected'
    }
  }, [ws.status])

  // El wsStatus legacy (para compatibilidad)
  const wsStatus = connectionStatus

  // ── Cargar velas iniciales vía REST ─────────────────────────
  const loadCandles = useCallback(async (asset) => {
    const { symbol } = ASSETS[asset]
    const t0 = Date.now()
    try {
      const res = await fetch(
        `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_LIMIT}`
      )
      if (!res.ok) throw new Error(res.status)
      const raw = await res.json()
      if (!mountedRef.current) return
      setLatency(Date.now() - t0)
      setApiSource('binance')
      const parsed = raw.map(k => ({
        time: k[0], open: +k[1], high: +k[2],
        low: +k[3], close: +k[4], volume: +k[5]
      }))
      setCandles(prev => ({ ...prev, [asset]: parsed }))
      // Actualizar cache para throttle
      candleCache.current[asset] = parsed
    } catch {
      if (mountedRef.current) setApiSource('error')
    }
  }, [interval])

  // ── Cargar ticker vía REST ──────────────────────────────────
  const loadTicker = useCallback(async (asset) => {
    try {
      const res = await fetch(`${BINANCE_REST}/ticker/24hr?symbol=${ASSETS[asset].symbol}`)
      const d = await res.json()
      if (!mountedRef.current) return
      setTicker(prev => ({
        ...prev,
        [asset]: {
          close: +d.lastPrice, high: +d.highPrice, low: +d.lowPrice,
          change: +d.priceChangePercent, volume: +d.quoteVolume
        }
      }))
    } catch {}
  }, [])

  // ── Efecto: cargar datos iniciales y ticker periódico ───────
  useEffect(() => {
    mountedRef.current = true
    loadCandles(activeAsset)
    loadTicker(activeAsset)
    const tickerInt = setInterval(() => loadTicker(activeAsset), 12_000)
    return () => {
      mountedRef.current = false
      clearInterval(tickerInt)
    }
  }, [activeAsset, interval, loadCandles, loadTicker])

  // ── Efecto: procesar mensajes WebSocket ─────────────────────
  useEffect(() => {
    if (!ws.lastMessage) return

    const msg = ws.lastMessage
    if (!msg.k) return

    const k = msg.k
    const candle = {
      time: k.t, open: +k.o, high: +k.h,
      low: +k.l, close: +k.c, volume: +k.v
    }

    setLastUpdate(Date.now())

    // Throttle: max 1 actualización cada 500ms
    // Usamos una closure para la vela pendiente
    candleCache.current._pending = candle
    if (!throttleRef.current) {
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
        const c = candleCache.current._pending
        if (!mountedRef.current || !c) return
        candleCache.current._pending = null

        setCandles(prev => {
          const cur = [...(prev[activeAsset] || [])]
          const last = cur.at(-1)
          if (last && last.time === c.time) {
            cur[cur.length - 1] = c
          } else if (c.time > (last?.time ?? 0)) {
            cur.push(c)
            if (cur.length > CANDLE_LIMIT) cur.shift()
          }
          return { ...prev, [activeAsset]: cur }
        })
        setTicker(prev => ({
          ...prev,
          [activeAsset]: { ...prev[activeAsset], close: +c.close }
        }))
      }, 500)
    }
  }, [ws.lastMessage, activeAsset])

  // ── Limpiar throttle en desmontaje ──────────────────────────
  useEffect(() => () => {
    clearTimeout(throttleRef.current)
  }, [])

  // ── Cargar velas cuando reconnect ───────────────────────────
  useEffect(() => {
    if (ws.status === WS_STATES.CONNECTED) {
      loadCandles(activeAsset)
      loadTicker(activeAsset)
    }
  }, [ws.status, activeAsset, loadCandles, loadTicker])

  return {
    candles,
    ticker,
    wsStatus,
    latency,
    lastUpdate,
    apiSource,
    connectionStatus, // campo nuevo: indicador visual
    assetCandles: candles[activeAsset] || [],
    assetTicker:  ticker[activeAsset]  || {},
  }
}
