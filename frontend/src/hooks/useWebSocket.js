// ═══════════════════════════════════════════════════════════════
// useWebSocket.js — Hook de WebSocket robusto con state machine
//
// State machine:
//   DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → DISCONNECTED
//
// Features:
//   - Reconnect exponencial con jitter (1s→2s→4s→8s→16s→30s, máx 10)
//   - Heartbeat ping cada 3 min
//   - Stale data detection (60s sin mensaje → reconectar)
//   - Indicador de estado visual
//
// Uso:
//   const { status, lastMessage, connect, disconnect } = useWebSocket(url, subscriptions)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'

// ── Estados de la state machine ───────────────────────────────
export const WS_STATES = {
  DISCONNECTED:  'disconnected',
  CONNECTING:    'connecting',
  CONNECTED:     'live',
  RECONNECTING:  'reconnecting',
  STALLED:       'stalled',
  ERROR:         'error',
}

// ── Constantes de configuración ───────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 10
const BASE_DELAY = 1000        // 1s
const MAX_DELAY  = 30000       // 30s cap
const HEARTBEAT_INTERVAL = 180_000  // 3 min
const STALE_TIMEOUT     = 60_000   // 60s
const JITTER_FACTOR = 0.2     // ±20%

/**
 * Calcula backoff exponencial con jitter.
 * @param {number} attempt - Intento actual (0-indexed)
 * @returns {number} Delay en ms
 */
function exponentialBackoff(attempt) {
  const base = BASE_DELAY * Math.pow(2, attempt)
  const jitter = base * (1 + (Math.random() - 0.5) * 2 * JITTER_FACTOR)
  return Math.min(jitter, MAX_DELAY)
}

/**
 * Hook de WebSocket con reconexión automática y heartbeat.
 *
 * @param {string} url - URL del WebSocket (ej: wss://stream.binance.com:9443/ws)
 * @param {string[]} [subscriptions] - Lista de streams a suscribir
 * @param {object} [options]
 * @param {number} [options.heartbeatInterval=180000] - Intervalo de ping en ms
 * @param {number} [options.staleTimeout=60000] - Timeout de stale data en ms
 * @param {number} [options.maxReconnects=10] - Máximo de reconexiones
 * @returns {object} { status, lastMessage, connect, disconnect, reconnectAttempt }
 */
export function useWebSocket(url, subscriptions = [], options = {}) {
  const {
    heartbeatInterval = HEARTBEAT_INTERVAL,
    staleTimeout = STALE_TIMEOUT,
    maxReconnects = MAX_RECONNECT_ATTEMPTS,
  } = options

  // ── Estado ──────────────────────────────────────────────────
  const [status, setStatus] = useState(WS_STATES.DISCONNECTED)
  const [lastMessage, setLastMessage] = useState(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  // ── Refs (no causan re-render) ──────────────────────────────
  const wsRef             = useRef(null)
  const mountedRef        = useRef(true)
  const reconnectRef      = useRef(null)
  const heartbeatRef      = useRef(null)
  const staleRef          = useRef(null)
  const attemptRef        = useRef(0)
  const urlRef            = useRef(url)
  const subsRef           = useRef(subscriptions)
  const lastMessageTime   = useRef(0)
  const connectRequested  = useRef(false)

  // Actualizar refs cuando cambian props
  urlRef.current = url
  subsRef.current = subscriptions

  // ── Limpiar timers ──────────────────────────────────────────
  const clearTimers = useCallback(() => {
    clearInterval(heartbeatRef.current)
    clearTimeout(reconnectRef.current)
    clearTimeout(staleRef.current)
    heartbeatRef.current = null
    reconnectRef.current = null
    staleRef.current = null
  }, [])

  // ── Suscribir a streams ─────────────────────────────────────
  const subscribe = useCallback((ws) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || subsRef.current.length === 0) return
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: subsRef.current,
      id: Date.now(),
    }
    ws.send(JSON.stringify(subscribeMsg))
  }, [])

  // ── Enviar heartbeat ────────────────────────────────────────
  const sendHeartbeat = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ method: 'ping', id: Date.now() }))
      } catch {
        // Si falla el ping, la conexión está muerta
        if (mountedRef.current) {
          setStatus(prev => prev === WS_STATES.CONNECTED ? WS_STATES.STALLED : prev)
        }
      }
    }
  }, [])

  // ── Conectar ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!urlRef.current) return

    const currentAttempt = attemptRef.current
    connectRequested.current = true

    // Cerrar conexión existente
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
      wsRef.current = null
    }

    setStatus(currentAttempt > 0 ? WS_STATES.RECONNECTING : WS_STATES.CONNECTING)

    let ws
    try {
      ws = new WebSocket(urlRef.current)
    } catch (err) {
      console.warn('[useWebSocket] Error creating WebSocket:', err)
      setStatus(WS_STATES.ERROR)
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close()
        return
      }

      console.log(`[useWebSocket] Conectado a ${urlRef.current}`)
      setStatus(WS_STATES.CONNECTED)
      attemptRef.current = 0
      setReconnectAttempt(0)
      lastMessageTime.current = Date.now()

      // Suscribir a streams
      subscribe(ws)

      // Iniciar heartbeat
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval)
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(event.data)

        // Ignorar pong responses del servidor
        if (data.pong !== undefined || data.id === 'ping') return

        lastMessageTime.current = Date.now()
        setLastMessage(data)

        // Resetear stale timeout
        clearTimeout(staleRef.current)
        staleRef.current = setTimeout(() => {
          if (mountedRef.current && wsRef.current) {
            console.warn('[useWebSocket] Stale data detectado, reconectando...')
            setStatus(WS_STATES.STALLED)
            // Forzar reconexión cerrando el socket
            try { wsRef.current.close() } catch {}
            // El cleanup en onclose disparará la reconexión
          }
        }, staleTimeout)

        // Si estaba stalled o reconnecting, restaurar
        if (status === WS_STATES.STALLED || status === WS_STATES.RECONNECTING) {
          setStatus(WS_STATES.CONNECTED)
        }
      } catch {
        // Mensaje no JSON (ping/pong binario, etc.) — ignorar
      }
    }

    ws.onerror = (err) => {
      if (!mountedRef.current) return
      console.warn('[useWebSocket] Error en WebSocket:', err)
      setStatus(WS_STATES.ERROR)
    }

    ws.onclose = (event) => {
      if (!mountedRef.current) return

      clearTimers()

      if (event.code !== 1000 && connectRequested.current) {
        // Reconexión no intencional
        const attempt = attemptRef.current
        if (attempt < maxReconnects) {
          const delay = exponentialBackoff(attempt)
          console.log(`[useWebSocket] Reconexión en ${Math.round(delay)}ms (intento ${attempt + 1}/${maxReconnects})`)
          attemptRef.current = attempt + 1
          setReconnectAttempt(attempt + 1)
          setStatus(WS_STATES.RECONNECTING)
          reconnectRef.current = setTimeout(connect, delay)
        } else {
          console.warn(`[useWebSocket] Máximo de reconexiones (${maxReconnects}) alcanzado`)
          setStatus(WS_STATES.ERROR)
          setReconnectAttempt(maxReconnects)
          connectRequested.current = false
        }
      } else {
        setStatus(WS_STATES.DISCONNECTED)
        connectRequested.current = false
      }
    }
  }, [heartbeatInterval, staleTimeout, maxReconnects, subscribe, sendHeartbeat])

  // ── Desconectar ─────────────────────────────────────────────
  const disconnect = useCallback(() => {
    connectRequested.current = false
    clearTimers()
    attemptRef.current = 0
    setReconnectAttempt(0)
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Disconnected by user')
      } catch {}
      wsRef.current = null
    }
    setStatus(WS_STATES.DISCONNECTED)
  }, [clearTimers])

  // ── Efecto principal ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      connectRequested.current = false
      clearTimers()
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounted')
        } catch {}
        wsRef.current = null
      }
    }
  }, [url, ...subscriptions]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    lastMessage,
    connect,
    disconnect,
    reconnectAttempt,
    isConnected: status === WS_STATES.CONNECTED,
    isStalled: status === WS_STATES.STALLED || status === WS_STATES.RECONNECTING,
    isError: status === WS_STATES.ERROR,
  }
}

export default useWebSocket
