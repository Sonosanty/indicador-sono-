// useBinanceMulti.js — UN solo hook para TODOS los timeframes a la vez
// Soluciona: RangesPage usaba 4× useBinance → 4 WS + 4 fetch REST separados
// Ahora: 1 hook → todas las velas en paralelo + 1 WS para el TF principal
import { useState, useEffect, useRef, useCallback } from 'react'

const BINANCE_REST = 'https://api.binance.com/api/v3'
const BINANCE_WS   = 'wss://stream.binance.com:9443/ws'

const TF_LIMITS = { '1m': 120, '3m': 200, '5m': 200, '15m': 200 }

export function useBinanceMulti(symbol = 'BTCUSDT', timeframes = ['15m','5m','3m','1m']) {
  const [candlesByTf, setCandlesByTf] = useState({})
  const [livePrice, setLivePrice]     = useState(null)
  const [wsStatus, setWsStatus]       = useState('connecting')
  const [lastUpdate, setLastUpdate]   = useState(null)

  const wsRef     = useRef(null)
  const pingRef   = useRef(null)
  const reconnRef = useRef(null)
  const mountedRef = useRef(true)
  const throttleRef = useRef(null)

  // Carga TODOS los timeframes en paralelo
  const loadAll = useCallback(async () => {
    const fetches = timeframes.map(tf =>
      fetch(`${BINANCE_REST}/klines?symbol=${symbol}&interval=${tf}&limit=${TF_LIMITS[tf] ?? 200}`)
        .then(r => r.json())
        .then(raw => ({
          tf,
          candles: raw.map(k => ({
            time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5]
          }))
        }))
        .catch(() => ({ tf, candles: [] }))
    )

    const results = await Promise.all(fetches)
    if (!mountedRef.current) return

    const map = {}
    results.forEach(({ tf, candles }) => { map[tf] = candles })
    setCandlesByTf(map)

    // Precio inicial desde el TF más rápido disponible
    const first = results.find(r => r.candles.length > 0)
    if (first) setLivePrice(first.candles.at(-1)?.close)
  }, [symbol, timeframes.join(',')])

  // WebSocket solo para el TF principal (el primero = 15m da señales lentas,
  // conectamos al 1m para tener precio más actualizado)
  const connectWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    clearInterval(pingRef.current)
    clearTimeout(reconnRef.current)

    const sym = symbol.toLowerCase()
    let ws
    try { ws = new WebSocket(`${BINANCE_WS}/${sym}@kline_1m`) }
    catch { setWsStatus('error'); reconnRef.current = setTimeout(connectWS, 8000); return }

    wsRef.current = ws
    setWsStatus('connecting')

    ws.onopen = () => {
      if (!mountedRef.current) return
      setWsStatus('live')
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'ping' }))
      }, 20000)
    }

    // Throttle: max 1 actualización cada 300ms para evitar re-renders excesivos
    let pendingCandle = null
    ws.onmessage = ({ data }) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(data)
        if (!msg.k) return
        const k = msg.k

        pendingCandle = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v }

        if (!throttleRef.current) {
          throttleRef.current = setTimeout(() => {
            throttleRef.current = null
            if (!mountedRef.current || !pendingCandle) return
            const candle = pendingCandle
            pendingCandle = null

            setLivePrice(+candle.close)
            setLastUpdate(Date.now())

            setCandlesByTf(prev => {
              const cur = [...(prev['1m'] || [])]
              const last = cur.at(-1)
              if (last && last.time === candle.time) cur[cur.length-1] = candle
              else if (candle.time > (last?.time ?? 0)) {
                cur.push(candle)
                if (cur.length > 120) cur.shift()
              }
              return { ...prev, '1m': cur }
            })
          }, 300)
        }
      } catch {}
    }

    ws.onerror = () => mountedRef.current && setWsStatus('error')
    ws.onclose = () => {
      if (!mountedRef.current) return
      clearInterval(pingRef.current)
      setWsStatus('stalled')
      reconnRef.current = setTimeout(connectWS, 4000)
    }
  }, [symbol])

  useEffect(() => {
    mountedRef.current = true
    loadAll()
    connectWS()
    // Refrescar velas cada 3 minutos (los TF más lentos no necesitan RT)
    const refreshInt = setInterval(loadAll, 3 * 60 * 1000)
    return () => {
      clearInterval(refreshInt)
      clearInterval(pingRef.current)
      clearTimeout(reconnRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [symbol])

  useEffect(() => () => { mountedRef.current = false }, [])

  return { candlesByTf, livePrice, wsStatus, lastUpdate }
}
