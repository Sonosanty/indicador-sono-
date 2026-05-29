// useScore.js — Score Maestro con throttle inteligente
// Solo recalcula si el precio cambió más de 0.02% entre velas
// Evita recálculos costosos en cada mensaje de WebSocket
import { useMemo, useRef } from 'react'
import { computeScore } from '../engine/indicators.js'

const PRICE_CHANGE_THRESHOLD = 0.0002 // 0.02%

export function useScore(candles) {
  const lastPriceRef = useRef(null)
  const lastScoreRef = useRef(null)

  return useMemo(() => {
    if (!candles || candles.length < 10) return null
    const currentPrice = candles.at(-1)?.close
    if (!currentPrice) return null

    // Si el precio no cambió lo suficiente, devuelve el score anterior
    if (lastPriceRef.current && lastScoreRef.current) {
      const change = Math.abs(currentPrice - lastPriceRef.current) / lastPriceRef.current
      if (change < PRICE_CHANGE_THRESHOLD) return lastScoreRef.current
    }

    const score = computeScore(candles)
    lastPriceRef.current = currentPrice
    lastScoreRef.current = score
    return score
  }, [candles])
}
