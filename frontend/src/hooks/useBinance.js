// ═══════════════════════════════════════════════════════════════
// useBinance.js — WebSocket + REST con reconexión automática
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'

export const ASSETS = {
  BTC: { symbol: 'BTCUSDT', cgId: 'bitcoin',  color: '#f7931a', dec: 2 },
  ETH: { symbol: 'ETHUSDT', cgId: 'ethereum', color: '#627eea', dec: 2 },
  SOL: { symbol: 'SOLUSDT', cgId: 'solana',   color: '#9945ff', dec: 3 },
  XRP: { symbol: 'XRPUSDT', cgId: 'ripple',   color: '#00aae4', dec: 4 },
}

const BINANCE_REST   = 'https://api.binance.com/api/v3'
const BINANCE_WS     = 'wss://stream.binance.com:9443/ws'
const CANDLE_LIMIT   = 350

export function useBinance(activeAsset, interval = '3m') {
  const [candles,    setCandles]    = useState({})
  const [ticker,     setTicker]     = useState({})
  const [wsStatus,   setWsStatus]   = useState('connecting')
  const [latency,    setLatency]    = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [apiSource,  setApiSource]  = useState('binance')

  const wsRef      = useRef(null)
  const pingRef    = useRef(null)
  const reconnRef  = useRef(null)
  const staleRef   = useRef(null)
  const mountedRef = useRef(true)
  const throttleRef = useRef(null) // throttle para ws onmessage

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
    } catch {
      setApiSource('error')
    }
  }, [interval])

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

  const connectWS = useCallback((asset) => {
    if (wsRef.current) wsRef.current.close()
    clearInterval(pingRef.current)
    clearTimeout(reconnRef.current)
    clearTimeout(staleRef.current)

    const sym = ASSETS[asset].symbol.toLowerCase()
    let ws
    try {
      ws = new WebSocket(`${BINANCE_WS}/${sym}@kline_${interval}`)
    } catch {
      setWsStatus('error')
      reconnRef.current = setTimeout(() => connectWS(asset), 8000)
      return
    }
    wsRef.current = ws
    setWsStatus('connecting')

    ws.onopen = () => {
      if (!mountedRef.current) return
      setWsStatus('live')
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'ping' }))
      }, 20000)
    }

    // Throttle: max 1 actualización cada 500ms para evitar re-renderizados excesivos
    let pendingCandle = null
    ws.onmessage = ({ data }) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(data)
        if (!msg.k) return
        const k = msg.k
        const candle = {
          time: k.t, open: +k.o, high: +k.h,
          low: +k.l, close: +k.c, volume: +k.v
        }

        setLastUpdate(Date.now())
        clearTimeout(staleRef.current)
        staleRef.current = setTimeout(() => mountedRef.current && setWsStatus('stalled'), 4*60*1000)

        // Throttle: si hay un tick pendiente, actualiza el dato
        pendingCandle = candle
        if (!throttleRef.current) {
          throttleRef.current = setTimeout(() => {
            throttleRef.current = null
            if (!mountedRef.current || !pendingCandle) return
            const c = pendingCandle
            pendingCandle = null
            setCandles(prev => {
              const cur  = [...(prev[asset] || [])]
              const last = cur.at(-1)
              if (last && last.time === c.time) cur[cur.length-1] = c
              else if (c.time > (last?.time ?? 0)) {
                cur.push(c)
                if (cur.length > CANDLE_LIMIT) cur.shift()
              }
              return { ...prev, [asset]: cur }
            })
            setTicker(prev => ({ ...prev, [asset]: { ...prev[asset], close: +c.close } }))
          }, 500)
        }
      } catch {}
    }

    ws.onerror = () => mountedRef.current && setWsStatus('error')
    ws.onclose = () => {
      if (!mountedRef.current) return
      clearInterval(pingRef.current)
      setWsStatus('stalled')
      reconnRef.current = setTimeout(() => connectWS(asset), 4000)
    }
  }, [interval])

  useEffect(() => {
    mountedRef.current = true
    loadCandles(activeAsset)
    loadTicker(activeAsset)
    connectWS(activeAsset)
    const tickerInt = setInterval(() => loadTicker(activeAsset), 12000)
    return () => {
      clearInterval(tickerInt)
      clearInterval(pingRef.current)
      clearTimeout(reconnRef.current)
      clearTimeout(staleRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [activeAsset, interval, loadCandles, loadTicker, connectWS])

  useEffect(() => () => { mountedRef.current = false }, [])

  return {
    candles, ticker, wsStatus, latency, lastUpdate, apiSource,
    assetCandles: candles[activeAsset] || [],
    assetTicker:  ticker[activeAsset]  || {},
  }
}
