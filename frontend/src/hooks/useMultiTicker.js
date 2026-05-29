// ═══════════════════════════════════════════════════════════════
// useMultiTicker.js — ticker REST periódico para múltiples assets
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { ASSETS } from './useBinance.js'

const BINANCE_REST = 'https://api.binance.com/api/v3'
const SYMBOLS = Object.values(ASSETS).map(a => a.symbol).join(',')

export function useMultiTicker() {
  const [tickers, setTickers] = useState({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const fetchAll = async () => {
      try {
        const res = await fetch(
          `${BINANCE_REST}/ticker/24hr?symbols=[${SYMBOLS.split(',').map(s => `"${s}"`).join(',')}]`
        )
        if (!res.ok) throw new Error(res.status)
        const data = await res.json()
        if (!mountedRef.current) return
        const map = {}
        data.forEach(d => {
          const key = Object.keys(ASSETS).find(k => ASSETS[k].symbol === d.symbol)
          if (key) {
            map[key] = {
              close: +d.lastPrice,
              high: +d.highPrice,
              low: +d.lowPrice,
              change: +d.priceChangePercent,
              volume: +d.quoteVolume,
            }
          }
        })
        setTickers(map)
      } catch {}
    }
    fetchAll()
    const int = setInterval(fetchAll, 15000)
    return () => {
      mountedRef.current = false
      clearInterval(int)
    }
  }, [])

  return tickers
}
