import { useState, useEffect, useRef } from 'react'
import TopBar from '../components/TopBar.jsx'
import './pages.css'

// ─── CONSTANTS ────────────────────────────────────────────────
const SYMBOLS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT' }
const DECIMALS = { BTC: 2, ETH: 2, SOL: 3, XRP: 4 }
const TF_MAP = { '1m': 1, '5m': 5, '1h': 60, '4h': 240, '1d': '1d' }
const CANDLE_LIMITS = { 1: 48, 5: 72, 60: 48, 240: 48, '1d': 50 }

const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

// ─── DRAWER DATA ─────────────────────────────────────────────
const DRAWER_DATA = {
  filosofia: {
    title: 'Filosofía Sono',
    body: '<strong>El trading es un maratón, no un sprint.</strong> Ajram y el Método Sono comparten la misma base mental: disciplina absoluta, paciencia para esperar el setup correcto y humildad para aceptar pérdidas sin perder la cabeza.<br><br>El ego mata al trader. Quien no sabe perder de forma controlada, nunca ganará de forma consistente.',
    kpis: [{ l: 'Pilar mental', v: 'Disciplina' }, { l: 'Horizonte', v: 'Intradía' }, { l: 'Clave', v: 'Paciencia' }, { l: 'Error #1', v: 'Revenge trade', c: 'kv-stop' }]
  },
  mandamientos: {
    title: '10 Mandamientos Sono',
    body: '<strong>Las 10 reglas que nunca se rompen:</strong><br>1. Nunca sin stop loss · 2. Nunca overnight · 3. Sin revenge trading · 4. Sin FOMO · 5. Riesgo máx 2% · 6. Seguir el plan · 7. Analizar perdedores · 8. Aceptar el 40-50% de fallos · 9. Diario de trading · 10. Desconectar fuera de horario',
    kpis: [{ l: 'Reglas', v: '10 fijas' }, { l: 'Excepciones', v: 'Ninguna', c: 'kv-stop' }, { l: 'Riesgo/op', v: 'Máx 2%' }, { l: 'Overnight', v: 'PROHIBIDO', c: 'kv-stop' }]
  },
  capital: {
    title: 'Gestión de Capital',
    body: '<strong>Sistema de stops en cascada.</strong> El capital es el único recurso que no se recupera solo con trabajo.<br><br>— Stop / operación: -2%<br>— Stop diario: si pierdes -3%, PARAR ese día<br>— Stop semanal: -8% → PARAR la semana<br>— Stop mensual: -15% → revisar todo el método',
    kpis: [{ l: 'Riesgo/trade', v: '-2%', c: 'kv-stop' }, { l: 'Stop diario', v: '-3%', c: 'kv-stop' }, { l: 'Stop semanal', v: '-8%', c: 'kv-stop' }, { l: 'Stop mensual', v: '-15%', c: 'kv-stop' }]
  },
  estrategias: {
    title: '8 Estrategias del Método',
    body: '<strong>Tres pilares técnicos:</strong> Gaps de apertura, Cruces de medias móviles (MA6×MA70) y Bandas de Bollinger. De la combinación de estos tres elementos nacen las 8 estrategias.<br><br>No son excluyentes: puedes tener gap + cruce + Bollinger al mismo tiempo, lo que eleva la confluencia.',
    kpis: [{ l: 'Pilar 1', v: 'Gaps' }, { l: 'Pilar 2', v: 'MA6×MA70' }, { l: 'Pilar 3', v: 'Bollinger' }, { l: 'Total', v: '8 estrategias', c: 'kv-go' }]
  },
  adaptacion: {
    title: 'Adaptación Cripto Sono',
    body: '<strong>Método Ajram adaptado a mercados cripto 24/7:</strong><br>— BTC, ETH, SOL, XRP en Binance / Pionex<br>— Sin overnight: cierre antes de medianoche<br>— Score Sono reemplaza el contexto del mercado español<br>— Fear & Greed como filtro macro adicional<br>— Velas 1h en lugar de 5m españolas',
    kpis: [{ l: 'Activos', v: 'BTC ETH SOL XRP' }, { l: 'Horario', v: '9h – 23h' }, { l: 'Exchange', v: 'Binance/Pionex' }, { l: 'Entrada', v: 'Score ≥62', c: 'kv-go' }]
  },
  rentabilidad: {
    title: 'Objetivos de Rentabilidad',
    body: '<strong>Métricas mínimas para pasar a real:</strong><br>Necesitas mínimo 30 operaciones en paper trading con:<br>— Win rate > 55%<br>— Profit factor > 1.5<br>— Max drawdown < 15%<br>— Ratio R:R de 1:2 (stop -2%, target +4%)',
    kpis: [{ l: 'Win Rate mín', v: '>55%', c: 'kv-go' }, { l: 'Profit Factor', v: '>1.5', c: 'kv-go' }, { l: 'R:R mínimo', v: '1 : 2' }, { l: 'ROI anual', v: '+30-50%', c: 'kv-go' }]
  },
  beneficios: {
    title: 'Gestión de Beneficios',
    body: '<strong>Sistema de salida Sono:</strong><br>— Trailing stop siguiendo la MA6 en tiempo real<br>— Mientras precio > MA6: mantener<br>— Cuando precio < MA6: CERRAR<br>— Opción parcial: 50% en +2%, 50% con trailing<br>— Cierre forzado a las 22:55h en cripto: cerrar TODO',
    kpis: [{ l: 'Método', v: 'Trailing MA6' }, { l: 'Target típico', v: '+4%', c: 'kv-go' }, { l: 'Stop fijo', v: '-2%', c: 'kv-stop' }, { l: 'Cierre forzado', v: '22:55h' }]
  },
  score: {
    title: 'Score Maestro Sono',
    body: '<strong>Suma de los 3 pilares (máx 100 puntos):</strong><br><strong>P1</strong> — Cruce MA6×MA70 (señal técnica) · hasta 40 pts<br><strong>P2</strong> — Fear & Greed + VIX (macro) · hasta 30 pts<br><strong>P3</strong> — Bollinger + RSI (zona precio) · hasta 30 pts<br><br>Score ≥ 62 → Entrar LONG. Score < 35 → Pánico extremo.',
    kpis: [{ l: 'P1 técnico', v: 'MA6×MA70' }, { l: 'P2 macro', v: 'F&G + VIX' }, { l: 'P3 precio', v: 'BB + RSI' }, { l: 'Entrada', v: 'Score ≥ 62', c: 'kv-go' }]
  },
  reglas: {
    title: 'Reglas de Oro Sono',
    body: '<strong>Las 8 reglas operativas diarias:</strong><br>1. Máximo 1-3 trades por día<br>2. Stop loss obligatorio en cada entrada<br>3. Diario de trading después de cada sesión<br>4. Sin posiciones overnight nunca<br>5. No operar en noticias macro importantes<br>6. Paper trading 30 días antes de ir a real<br>7. Validar: winrate >55% y PF >1.5<br>8. Si pierdes el stop diario (-3%), parar el día',
    kpis: [{ l: 'Trades/día', v: '1 a 3 máx' }, { l: 'Journal', v: 'Obligatorio' }, { l: 'Overnight', v: 'PROHIBIDO', c: 'kv-stop' }, { l: 'Paper primero', v: '30 días', c: 'kv-go' }]
  },
  dashboard: {
    title: 'Sono PRO Dashboard',
    body: '<strong>Dashboard premium tipo terminal Bloomberg</strong> con datos macro calculados a través de 6 zonas integradas:<br>— Zona 1: Score Maestro Sono en tiempo real<br>— Zona 2: Gráfico multi-timeframe (1m, 5m, 1h, 4h, 1d)<br>— Zona 3: Pilares P1 + P2 + P3 desglosados<br>— Zona 4: Calculadora de posición (regla Ajram 2%)<br>— Zona 5: Historial de señales<br>— Zona 6: Alertas automáticas Telegram',
    kpis: [{ l: 'Zonas', v: '6 módulos' }, { l: 'Timeframes', v: '1m a 1d' }, { l: 'Alertas', v: 'Telegram' }, { l: 'Datos', v: 'Tiempo real', c: 'kv-go' }]
  }
}

// ─── HOOKS ────────────────────────────────────────────────────
function useRealTickers() {
  const [tickers, setTickers] = useState({})
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT"]')
        if (!res.ok) return
        const data = await res.json()
        const map = {}
        data.forEach(d => {
          const asset = d.symbol.replace('USDT', '')
          map[asset] = { price: parseFloat(d.lastPrice), change: parseFloat(d.priceChangePercent) }
        })
        setTickers(map)
      } catch {}
    }
    fetchAll()
    const iv = setInterval(fetchAll, 10000)
    return () => clearInterval(iv)
  }, [])
  return tickers
}

function useFNG() {
  const [fg, setFg] = useState(null)
  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await fetch('https://api.alternative.me/fng/?limit=1')
        const d = await r.json()
        setFg({ value: parseInt(d.data[0].value), label: d.data[0].value_classification })
      } catch {}
    }
    fetch()
    const iv = setInterval(fetch, 60000)
    return () => clearInterval(iv)
  }, [])
  return fg
}

// ─── SCORE CALC ──────────────────────────────────────────────
function calcScoreFromIndicators(fg, maRatio, rsi) {
  let p1 = 15
  if (maRatio != null) {
    if (maRatio > 1.02) p1 = 35
    else if (maRatio > 1.005) p1 = 25
    else if (maRatio < 0.98) p1 = 5
    else if (maRatio < 0.995) p1 = 10
  }
  let p2 = 15
  if (fg != null) {
    if (fg < 20) p2 = 28
    else if (fg < 40) p2 = 22
    else if (fg < 55) p2 = 15
    else if (fg < 75) p2 = 5
    else p2 = 0
  }
  let p3 = 13
  if (rsi != null) {
    if (rsi < 30) p3 = 25
    else if (rsi < 40) p3 = 20
    else if (rsi < 50) p3 = 13
    else if (rsi < 60) p3 = 8
    else if (rsi < 70) p3 = 5
    else p3 = 0
  }
  const total = Math.min(100, Math.max(0, p1 + p2 + p3))
  let label = 'NEUTRO'
  let color = 'var(--caution)'
  if (fg != null && fg < 30) label = 'PÁNICO'
  else if (total >= 65) label = 'ACUMULACIÓN'
  else if (total >= 50) label = 'NEUTRAL'
  else if (total >= 35) label = 'MIEDO'
  else label = 'PÁNICO'
  if (total >= 60) color = 'var(--go)'
  else if (total < 40) color = 'var(--stop)'
  else color = 'var(--caution)'
  return { total, p1, p2, p3, label, color }
}

function calcMA(data, period) {
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i + 1 - period), i + 1)
    return slice.length < period ? null : +(slice.reduce((a, b) => a + b.c, 0) / period).toFixed(2)
  })
}

function calcRSI(data, period) {
  const gains = [], losses = []
  for (let i = 1; i < data.length; i++) {
    const d = data[i].c - data[i - 1].c
    gains.push(Math.max(0, d))
    losses.push(Math.max(0, -d))
  }
  const rsi = [null]
  for (let i = period; i <= gains.length; i++) {
    const avgG = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    const avgL = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period
    const rs = avgL === 0 ? 100 : avgG / avgL
    rsi.push(+Math.round(100 - 100 / (1 + rs)))
  }
  while (rsi.length < data.length) rsi.unshift(null)
  return rsi
}

// ─── COMPONENTS ──────────────────────────────────────────────
function Modal({ card, onClose }) {
  if (!card) return null
  return (
    <div className="modal-bg open" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-title">{card.title}</div>
          <button className="drawer-close" onClick={onClose}>✕ cerrar</button>
        </div>
        <div className="drawer-body" dangerouslySetInnerHTML={{ __html: card.body }} />
        <div className="drawer-kpis">
          {card.kpis.map((k, i) => (
            <div key={i} className="kpi">
              <div className="kpi-l">{k.l}</div>
              <div className={`kpi-v ${k.c || ''}`}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── METHOD CARDS ────────────────────────────────────────────
const METHOD_CARDS = [
  { key: 'filosofia', icon: '🧠', name: 'Filosofía Sono', badge: 'PSICOLOGÍA', desc: 'Disciplina, paciencia y humildad. El trading es un maratón.' },
  { key: 'mandamientos', icon: '🔟', name: '10 Mandamientos', badge: 'REGLAS', desc: 'Las 10 reglas sagradas del trader. Sin excepción.' },
  { key: 'capital', icon: '📊', name: 'Gestión Capital', badge: 'RIESGO', desc: 'Capital único recurso. Stop en cascada. Máx 2%.' },
  { key: 'estrategias', icon: '⚡', name: '8 Estrategias', badge: 'TRADING', desc: 'Gaps, MA6×70, Bollinger, breakouts. Confluencia.' },
  { key: 'adaptacion', icon: '🔄', name: 'Adaptación Cripto', badge: 'SONO', desc: 'BTC, ETH, SOL, XRP. 24/7. Sin overnight.' },
  { key: 'rentabilidad', icon: '📈', name: 'Rentabilidad', badge: 'OBJETIVOS', desc: '+30-50% anual. Winrate 55%. R:R 1:2.' },
  { key: 'beneficios', icon: '💰', name: 'Gestión Beneficios', badge: 'TP/SL', desc: 'Trailing MA6. TP parcial. Cierre 22:55.' },
  { key: 'score', icon: '🎯', name: 'Score Maestro Sono', badge: 'SONO', desc: 'P1+P2+P3. Score 0-100. Entrar ≥62.' },
  { key: 'reglas', icon: '🧠', name: 'Reglas de Oro Sono', badge: '8 REGLAS', desc: '1-3 trades/día, stop, journal, sin overnight.' },
  { key: 'dashboard', icon: '📟', name: 'Sono PRO Dashboard', badge: 'CÓDIGO', desc: 'Dashboard premium con 6 zonas integradas.' },
]

// ═══ MAIN PAGE ═══════════════════════════════════════════════
export default function MetodoPage({ activeAsset = 'BTC', onSetAsset = () => {} }) {
  const [selectedAsset, setSelectedAsset] = useState('BTC')
  const [currentTF, setCurrentTF] = useState('1h')
  const [modalCard, setModalCard] = useState(null)
  const [chart, setChart] = useState(null)
  const [tickerData, setTickerData] = useState({})
  const [score, setScore] = useState({ total: 0, p1: 0, p2: 0, p3: 0, label: '—', color: 'var(--txt2)' })
  const [fg, setFg] = useState(null)
  const [maSignal, setMaSignal] = useState({ text: '—', cls: 'sv-warn' })
  const [bbSignal, setBbSignal] = useState({ text: '—', cls: 'sv-warn' })
  const [rsi, setRsi] = useState(null)
  const chartRef = useRef(null)
  const asset = selectedAsset

  // FNG
  useEffect(() => {
    const f = async () => {
      try {
        const r = await fetch('https://api.alternative.me/fng/?limit=1')
        const d = await r.json()
        setFg({ value: parseInt(d.data[0].value), label: d.data[0].value_classification })
      } catch {}
    }
    f(); const iv = setInterval(f, 60000)
    return () => clearInterval(iv)
  }, [])

  // Tickers
  useEffect(() => {
    const f = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT"]')
        if (!res.ok) return
        const data = await res.json()
        const map = {}
        data.forEach(d => {
          const a = d.symbol.replace('USDT', '')
          map[a] = { price: parseFloat(d.lastPrice), change: parseFloat(d.priceChangePercent) }
        })
        setTickerData(map)
      } catch {}
    }
    f(); const iv = setInterval(f, 10000)
    return () => clearInterval(iv)
  }, [])

  // Cargar velas + calcular indicadores + chart
  useEffect(() => {
    const interval = TF_MAP[currentTF]
    const limit = CANDLE_LIMITS[typeof interval === 'number' ? interval : interval] || 48

    const load = async () => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${SYMBOLS[asset]}&interval=${currentTF}&limit=${limit}`)
        const d = await r.json()
        const candles = d.map(k => ({ t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) }))

        if (candles.length < 10) return
        const prices = candles.map(c => c.c)
        const labels = candles.map(c => {
          const dt = new Date(c.t)
          return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
        })
        const ma6 = calcMA(candles, 6).map(v => v != null ? parseFloat(v) : null)
        const ma70 = calcMA(candles, 70).map(v => v != null ? parseFloat(v) : null)
        const rsiArr = calcRSI(candles, 14)
        const lastMA6 = ma6[ma6.length - 1]
        const lastMA70 = ma70[ma70.length - 1]
        const lastRSI = rsiArr[rsiArr.length - 1]
        const lastPrice = candles[candles.length - 1].c
        const lastCandle = candles[candles.length - 1]

        setRsi(lastRSI)

        // MA signal
        if (lastMA6 != null && lastMA70 != null && lastMA70 > 0) {
          const ratio = lastMA6 / lastMA70
          if (ratio > 1.01) setMaSignal({ text: 'LONG ↑', cls: 'sv-go' })
          else if (ratio < 0.99) setMaSignal({ text: 'SHORT ↓', cls: 'sv-stop' })
          else setMaSignal({ text: 'NEUTRO', cls: 'sv-warn' })

          // Score
          const s = calcScoreFromIndicators(fg?.value, ratio, lastRSI)
          setScore(s)
        }

        // BB signal (simplified)
        if (lastRSI != null) {
          if (lastRSI < 30) setBbSignal({ text: 'Sobreventa', cls: 'sv-go' })
          else if (lastRSI > 70) setBbSignal({ text: 'Sobrecompra', cls: 'sv-stop' })
          else if (lastRSI < 45) setBbSignal({ text: 'Zona baja', cls: 'sv-warn' })
          else if (lastRSI > 55) setBbSignal({ text: 'Zona alta', cls: 'sv-warn' })
          else setBbSignal({ text: 'NEUTRO', cls: 'sv-warn' })
        }

        // Chart.js
        if (window.Chart) {
          const ctx = chartRef.current?.getContext('2d')
          if (!ctx) return
          if (chart) chart.destroy()
          const newChart = new window.Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [
                { label: 'Precio', data: prices, borderColor: '#4da6ff', borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: false },
                { label: 'MA6', data: ma6, borderColor: '#00d68f', borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: false },
                { label: 'MA70', data: ma70, borderColor: '#ffb800', borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: false, borderDash: [5, 4] }
              ]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1d2535', borderColor: '#ffffff28', borderWidth: 1,
                  titleColor: '#8795aa', bodyColor: '#dde4f0',
                  callbacks: { label: c => `${c.dataset.label}: $${c.raw != null ? fmt(c.raw, DECIMALS[asset]) : '—'}` }
                }
              },
              scales: {
                x: { ticks: { color: '#4f5e72', font: { size: 10, family: 'Space Mono' }, maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,.04)' } },
                y: { ticks: { color: '#4f5e72', font: { size: 10, family: 'Space Mono' }, callback: v => '$' + v.toLocaleString() }, grid: { color: 'rgba(255,255,255,.04)' } }
              }
            }
          })
          setChart(newChart)
        }

        // Stop / Target
        const stopEl = document.getElementById('sig-stop')
        const targetEl = document.getElementById('sig-target')
        if (stopEl) stopEl.textContent = '$' + fmt(lastPrice * 0.98, DECIMALS[asset])
        if (targetEl) targetEl.textContent = '$' + fmt(lastPrice * 1.04, DECIMALS[asset])

      } catch {}
    }
    load()
  }, [asset, currentTF, fg])

  const currentTicker = tickerData[asset]
  const currentPrice = currentTicker?.price || 0

  const handleSelectCoin = (sym) => {
    setSelectedAsset(sym)
    if (onSetAsset) onSetAsset(sym)
  }

  return (
    <>
      <TopBar
        title={`Método Sono ${asset}`}
        subtitle="Chart.js · Score real · Señales en vivo"
        status={{ type: 'live', label: 'SONO PRO · v3' }}
        activeAsset={asset}
        onSetAsset={handleSelectCoin}
        tickers={tickerData}
        lastUpdate={null}
      />

      <div className="price-bar" style={{ display: 'flex', gap: 6, padding: '8px 20px', background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        {['BTC', 'ETH', 'SOL', 'XRP'].map(sym => {
          const t = tickerData[sym]
          const isActive = asset === sym
          return (
            <div key={sym}
              className="pb"
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px',
                background: isActive ? 'var(--surface-hi)' : 'var(--surface)',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', flex: 1, justifyContent: 'center',
                transition: 'all .15s'
              }}
              onClick={() => handleSelectCoin(sym)}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.5 }}>{sym}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                ${t ? fmt(t.price, DECIMALS[sym]) : '—'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="page">
        <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 294px', gap: 10, marginBottom: 20 }}>
          {/* CHART */}
          <div className="chart-box" style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16
          }}>
            <div className="chart-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="chart-lbl" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {SYMBOLS[asset]} — MA6 · MA70 · Precio
              </div>
              <div className="tf-row" style={{ display: 'flex', gap: 3 }}>
                {['1m', '5m', '1h', '4h', '1d'].map(tf => (
                  <button key={tf}
                    className="tf"
                    style={{
                      padding: '5px 10px', background: currentTF === tf ? 'var(--surface-hi)' : 'none',
                      border: currentTF === tf ? '1px solid var(--border-hi)' : '1px solid transparent',
                      borderRadius: 4, color: currentTF === tf ? 'var(--text)' : 'var(--text-faint)',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all .13s'
                    }}
                    onClick={() => setCurrentTF(tf)}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="legend" style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              {[
                { color: '#4da6ff', label: 'Precio' },
                { color: '#00d68f', label: 'MA6' },
                { color: '#ffb800', label: 'MA70', dashed: true }
              ].map(l => (
                <div key={l.label} className="leg-item" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <div style={{ width: 14, height: l.dashed ? 0 : 2, borderRadius: 1, background: l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : 'none' }}></div>
                  {l.label}
                </div>
              ))}
            </div>
            <div className="chart-wrap" style={{ position: 'relative', height: 250 }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* RIGHT COL */}
          <div className="right-col" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* SCORE */}
            <div className="score-box" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16
            }}>
              <div className="score-row1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div className="score-tag-lbl" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-faint)', fontWeight: 700 }}>Score Maestro Sono</div>
                <div className="score-chip" style={{
                  fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  background: score.color + '22', color: score.color
                }}>{score.label}</div>
              </div>
              <div className="score-big" style={{
                fontFamily: "'Syne',sans-serif", fontSize: 72, fontWeight: 800,
                letterSpacing: -5, lineHeight: 1,
                background: 'linear-gradient(135deg,var(--go) 0%,var(--info) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 6
              }}>{score.total}</div>
              <div className="score-sub" style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
                P1:{score.p1} + P2:{score.p2} + P3:{score.p3} · Entrar ≥ 62
              </div>
              <div className="pbar-bg" style={{
                height: 5, background: 'var(--surface-hi)', borderRadius: 3,
                overflow: 'hidden', marginBottom: 5
              }}>
                <div className="pbar" style={{
                  height: '100%', borderRadius: 3,
                  background: `linear-gradient(90deg,${score.color},${score.color === 'var(--go)' ? 'var(--info)' : score.color === 'var(--stop)' ? '#ff4757' : '#ffb800'})`,
                  width: `${score.total}%`, transition: 'width .9s cubic-bezier(.4,0,.2,1)'
                }} />
              </div>
              <div className="pbar-zones" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-faint)', fontWeight: 700 }}>
                <span>Pánico</span><span>Miedo</span><span>Neutral</span><span>Euforia</span>
              </div>
            </div>

            {/* SEÑALES */}
            <div className="sigs-box" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 14
            }}>
              <div className="sigs-hd" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 10 }}>Señales activas</div>
              {[
                { n: 'MA6 × MA70', v: maSignal.text, c: maSignal.cls },
                { n: 'Bollinger', v: bbSignal.text, c: bbSignal.cls },
                { n: 'Fear & Greed', v: fg ? `${fg.value} — ${fg.label}` : '—', c: fg && fg.value < 30 ? 'sv-go' : fg && fg.value > 70 ? 'sv-stop' : 'sv-warn' },
              ].map((s, i) => (
                <div key={i} className="sig" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span className="sig-n" style={{fontSize:10,color:'var(--text-dim)'}}>{s.n}</span>
                  <span className={"sig-v " + s.c} style={{fontSize:10,fontWeight:700}}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DRAWER MODAL */}
        <Modal card={modalCard} onClose={() => setModalCard(null)} />

        {/* CARDS DEL MÉTODO */}
        <div className="sh" style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,marginTop:8,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:2,color:'var(--text-faint)'}}>
          <div className="sh-dot" style={{width:5,height:5,borderRadius:'50%',background:'var(--primary)',flexShrink:0}}></div>
          MÉTODO SONO — TARJETAS INTERACTIVAS
          <div className="sh-line" style={{flex:1,height:1,background:'var(--border)'}}></div>
        </div>

        <div className="mgrid" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:8}}>
          {METHOD_CARDS.map(card => (
            <div key={card.key} className="mc"
              style={{
                background:'var(--surface)',border:'1px solid var(--border)',
                borderRadius:10,padding:16,cursor:'pointer',
                transition:'all .2s'
              }}
              onClick={() => setModalCard(DRAWER_DATA[card.key])}
            >
              <div style={{width:38,height:38,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:10}}>
                {card.icon}
              </div>
              <div className="mc-name" style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:5}}>{card.name}</div>
              <div className="mc-pill" style={{
                display:'inline-block',fontSize:8,fontWeight:700,padding:'2px 7px',
                borderRadius:3,textTransform:'uppercase',letterSpacing:.6,marginBottom:6,
                background:'var(--primary-glow)',color:'var(--primary)'
              }}>{card.badge}</div>
              <div className="mc-desc" style={{fontSize:10,color:'var(--text-faint)',lineHeight:1.6}}>{card.desc}</div>
            </div>
          ))}
        </div>

        <div className="foot" style={{textAlign:'center',padding:20,fontSize:9,color:'var(--text-faint)',borderTop:'1px solid var(--border)',marginTop:8,letterSpacing:.5}}>
          Fino Edition  👒 &nbsp;·&nbsp; Sono PRO Terminal v3  &nbsp;·&nbsp; <span id="ts">{new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>
    </>
  )
}
