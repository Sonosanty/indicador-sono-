// ═══════════════════════════════════════════════════════════════
// useSignals.js — historial de señales con localStorage + alertas
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'sono_signals_v3'
const MAX_SIGNALS = 100

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw).map(s => ({ ...s, time: new Date(s.time) }))
  } catch { return [] }
}

const playAlert = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)

    const freq = { buy_strong: [660, 880], sell_strong: [520, 330], buy: 600, sell: 400 }[type] ?? 440
    if (Array.isArray(freq)) {
      osc.frequency.setValueAtTime(freq[0], ctx.currentTime)
      osc.frequency.setValueAtTime(freq[1], ctx.currentTime + 0.15)
      gain.gain.value = 0.08
      osc.start(); osc.stop(ctx.currentTime + 0.35)
    } else {
      osc.frequency.value = freq
      gain.gain.value = 0.06
      osc.start(); osc.stop(ctx.currentTime + 0.15)
    }
  } catch {}
}

const sendNotification = (title, body) => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body })
    })
  }
}

export function useSignals(score, asset, price, alertsOn) {
  const [signals, setSignals] = useState(loadFromStorage)
  const prevRef = useRef(null)

  useEffect(() => {
    if (!score || !score.label) return
    const curr = `${asset}:${score.label}`
    if (curr === prevRef.current) return
    prevRef.current = curr

    const newSig = {
      id: Date.now(),
      time: new Date(),
      asset, price,
      label: score.label,
      level: score.level,
      action: score.action,
      total: score.total,
      p1: score.p1, p2: score.p2, p3: score.p3,
      biasColor: score.biasColor,
    }

    setSignals(prev => {
      const updated = [newSig, ...prev].slice(0, MAX_SIGNALS)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })

    if (!alertsOn) return
    const l = score.label
    if (l === 'COMPRA FUERTE')                   { playAlert('buy_strong');  sendNotification(`🟢 ${asset}`, `${l} · Score ${score.total} · $${price?.toFixed(0)}`) }
    else if (l === 'VENTA' || l === 'CAPITULACIÓN'){ playAlert('sell_strong');sendNotification(`🔴 ${asset}`, `${l} · Score ${score.total} · $${price?.toFixed(0)}`) }
    else if (l === 'COMPRA')                      { playAlert('buy') }
    else if (l === 'DISTRIBUCIÓN')                { playAlert('sell') }
  }, [score?.label, asset])

  const clear = () => {
    setSignals([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return { signals, clearSignals: clear }
}
