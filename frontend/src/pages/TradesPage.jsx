// ═══════════════════════════════════════════════════════════════
// TradesPage.jsx — "Trades Realtime" v3 (con Chart.js)
// Equity Curve · Histograma R · Color coding · Filtros + Paginación
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import TopBar from '../components/TopBar.jsx'
import { useBinance, ASSETS } from '../hooks/useBinance.js'
import { useSignals } from '../hooks/useSignals.js'
import { useMultiTicker } from '../hooks/useMultiTicker.js'
import { computeScore } from '../engine/indicators.js'
import './pages.css'

Chart.register(...registerables)

const fmt = (n, d=2) => n==null||isNaN(n) ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits:d, maximumFractionDigits:d })
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

// ─── Componente Histograma de R ──────────────────────────────
function RHistogram({ trades }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const closed = trades.filter(t => t.status === 'CLOSED')
    if (closed.length === 0) return

    const buckets = ['<-1.0R','-1.0','-0.75','-0.50','-0.25','0','+0.25','+0.50','+0.75','+1.0','>+1.0R']
    const counts = new Array(buckets.length).fill(0)
    closed.forEach(t => {
      const r = t.r ?? 0
      if (r < -1) counts[0]++
      else if (r < -0.75) counts[1]++
      else if (r < -0.50) counts[2]++
      else if (r < -0.25) counts[3]++
      else if (r < 0) counts[4]++
      else if (r === 0) counts[5]++
      else if (r < 0.25) counts[6]++
      else if (r < 0.50) counts[7]++
      else if (r < 0.75) counts[8]++
      else if (r < 1) counts[9]++
      else counts[10]++
    })

    const colors = counts.map((_, i) =>
      i < 5 ? 'rgba(220,38,38,0.7)' : i === 5 ? 'rgba(234,179,8,0.7)' : 'rgba(22,163,74,0.7)'
    )

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: buckets,
        datasets: [{
          label: '# Trades',
          data: counts,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.7','1')),
          borderWidth: 0.5,
          borderRadius: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f1d35',
            titleFont: { size: 10 },
            bodyFont: { size: 11, family: 'JetBrains Mono, monospace' },
            cornerRadius: 6,
            padding: 8,
            callbacks: { label: ctx => ctx.raw + ' trades' }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8, family: 'JetBrains Mono, monospace' }, maxRotation: 45 } },
          y: { grid: { color: 'rgba(120,160,220,0.06)' }, ticks: { color: '#64748b', font: { size: 9 }, stepSize: 1 } }
        },
        animation: { duration: 400 }
      }
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [trades])

  if (trades.filter(t => t.status === 'CLOSED').length === 0) {
    return <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Esperando trades cerrados para generar el histograma…</div>
  }

  return (
    <div style={{ position: 'relative', height: 220, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ─── Componente Equity Curve con Chart.js ────────────────────
function EquityCurveChart({ trades }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    const closed = trades.filter(t => t.status === 'CLOSED')
    if (closed.length === 0) return

    const labels = []
    const data = []
    let cum = 0
    closed.slice().reverse().forEach((t, i) => {
      cum += t.r ?? 0
      labels.push(`#${t.id}`)
      data.push(+cum.toFixed(2))
    })

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Equity (R)',
          data,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96,165,250,0.08)',
          fill: true,
          tension: 0.15,
          pointRadius: 0,
          pointHitRadius: 6,
          borderWidth: 1.6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#0f1d35', titleFont: { size: 10 }, bodyFont: { size: 11, family: 'JetBrains Mono, monospace' }, cornerRadius: 6, padding: 8 }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: {
            grid: { color: 'rgba(120,160,220,0.06)' },
            ticks: { color: '#64748b', font: { size: 9, family: 'JetBrains Mono, monospace' }, callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) }
          }
        },
        animation: { duration: 400 }
      }
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [trades])

  if (trades.filter(t => t.status === 'CLOSED').length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        Esperando trades cerrados para generar la curva de equity…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: 220, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ─── Barra de progreso R para trades activos ─────────────────
function RProgressBar({ current, entry, sl, side }) {
  const risk = Math.abs(entry - sl)
  const pct = risk > 0 ? Math.min(100, Math.max(0, ((current - entry) / risk) * (side === 'LONG' ? 1 : -1) * 100)) : 0
  const barClass = pct >= 60 ? 'pos' : pct <= 30 ? 'neg' : 'be'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(120,160,220,0.08)', borderRadius: 2, overflow: 'hidden', minWidth: 50 }}>
        <div style={{ height: '100%', borderRadius: 2, width: Math.abs(pct) + '%', background: barClass === 'pos' ? 'var(--green)' : barClass === 'neg' ? 'var(--red)' : 'var(--gold)', transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 9, color: 'var(--dim)' }}>{Math.round(pct)}%</span>
    </div>
  )
}

export default function TradesPage() {
  const [activeAsset, setActiveAsset] = useState('BTC')
  const { assetCandles, assetTicker, wsStatus, lastUpdate } = useBinance(activeAsset, '3m')
  const tickers = useMultiTicker()
  const score = useMemo(() => computeScore(assetCandles), [assetCandles])
  const livePrice = assetTicker.close ?? assetCandles.at(-1)?.close
  const { signals } = useSignals(score, 'BTC', livePrice, false)

  const [demoMode, setDemoMode] = useState(false)
  const [tab, setTab] = useState('open')
  const [filtroR, setFiltroR] = useState('')
  const [filtroSide, setFiltroSide] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [pag, setPag] = useState(0)
  const PAGE = 10

  // Trades reales desde señales
  const realTrades = useMemo(() => {
    return signals.map((s, i, arr) => {
      const label = s.label || ''
      const isLong = label.includes('COMPRA')
      const isShort = label.includes('VENTA') || label.includes('CAPIT')
      const side = isLong ? 'LONG' : isShort ? 'SHORT' : 'NEUTRAL'
      const entry = s.price
      const slPct = 0.003
      const sl = entry ? entry * (isLong ? 1 - slPct : 1 + slPct) : null
      const risk = entry ? Math.abs(entry - sl) : 0
      const exitPrice = i === 0 ? livePrice : arr[i - 1]?.price
      let r = 0
      if (entry && exitPrice && risk > 0) {
        const move = isLong ? exitPrice - entry : entry - exitPrice
        r = move / risk
      }
      const tp1 = entry ? entry * (isLong ? 1.005 : 0.995) : null
      return {
        id: s.id,
        time: s.time,
        asset: s.asset,
        setup: side === 'LONG' ? 'bullish_impulse' : side === 'SHORT' ? 'bearish_impulse' : 'range_neutral',
        side, entry, sl,
        tp1,
        tp2: entry ? entry * (isLong ? 1.012 : 0.988) : null,
        tp3: entry ? entry * (isLong ? 1.02 : 0.98) : null,
        r: +r.toFixed(2),
        hi: entry,
        lo: entry,
        duration: '—',
        tf: 'candles_3m',
        status: i === 0 ? 'OPEN' : 'CLOSED',
        result: i === 0 ? '' : r > 0.05 ? 'TP' : r < -0.05 ? 'SL' : 'BE',
        pnl: r,
        isDemo: false,
      }
    })
  }, [signals, livePrice])

  const demoTrades = useMemo(() => {
    if (!demoMode) return []
    const setups = ['bullish_impulse','sell_absorption','upper_rejection','bullish_impulse','lower_rejection','buy_absorption']
    return setups.map((setup, i) => ({
      id: `demo-${i}`,
      time: new Date(Date.now() - i * 3600000),
      asset: 'BTC',
      setup,
      side: i % 2 === 0 ? 'LONG' : 'SHORT',
      entry: 75000 + i * 50,
      sl: 74800,
      tp1: 75500, tp2: 76000, tp3: 76500,
      hi: 75600, lo: 74900,
      r: [+2.27, +1.04, +0.34, -0.74, -1.09, -2.72][i],
      duration: `~${10 + i * 5}m`,
      tf: 'candles_3m',
      status: 'CLOSED',
      result: [+2.27, +1.04, +0.34, -0.74, -1.09, -2.72][i] > 0.05 ? 'TP' : 'SL',
      pnl: [+2.27, +1.04, +0.34, -0.74, -1.09, -2.72][i],
      isDemo: true,
    }))
  }, [demoMode])

  const trades = useMemo(() => [...realTrades, ...demoTrades], [realTrades, demoTrades])

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades])
  const openTrades = useMemo(() => trades.filter(t => t.status === 'OPEN'), [trades])

  // Stats
  const stats = useMemo(() => {
    if (!closedTrades.length) return null
    const wins = closedTrades.filter(t => t.r > 0)
    const losses = closedTrades.filter(t => t.r < 0)
    const be = closedTrades.filter(t => Math.abs(t.r) < 0.05)
    const winrate = (wins.length / closedTrades.length * 100).toFixed(1)
    const rTotal = closedTrades.reduce((s, t) => s + t.r, 0)
    const rMedio = rTotal / closedTrades.length
    const sumWin = wins.reduce((s, t) => s + t.r, 0)
    const sumLoss = Math.abs(losses.reduce((s, t) => s + t.r, 0)) || 1
    const pf = sumWin / sumLoss
    let dd = 0, peak = 0, cum = 0
    closedTrades.slice().reverse().forEach(t => {
      cum += t.r
      if (cum > peak) peak = cum
      if (cum - peak < dd) dd = cum - peak
    })
    return {
      winrate, rTotal, rMedio, pf,
      maxDD: dd,
      expectancy: rMedio,
      bestR: Math.max(...closedTrades.map(t => t.r)),
      worstR: Math.min(...closedTrades.map(t => t.r)),
      cerrados: closedTrades.length,
      tp: wins.length,
      sl: losses.length,
      be: be.length,
    }
  }, [closedTrades])

  // Performance por setup
  const bySetup = useMemo(() => {
    const groups = {}
    closedTrades.forEach(t => {
      const sg = t.setup || 'sin_setup'
      if (!groups[sg]) groups[sg] = { trades: [], w: 0, l: 0, be: 0 }
      groups[sg].trades.push(t)
      if (t.r > 0.05) groups[sg].w++
      else if (t.r < -0.05) groups[sg].l++
      else groups[sg].be++
    })
    return Object.entries(groups).map(([setup, g]) => {
      const rTotal = g.trades.reduce((s, t) => s + t.r, 0)
      const winRate = g.w / g.trades.length * 100
      const winSum = g.trades.filter(t => t.r > 0).reduce((s, t) => s + t.r, 0)
      const lossSum = Math.abs(g.trades.filter(t => t.r < 0).reduce((s, t) => s + t.r, 0)) || 0.01
      return {
        setup,
        count: g.trades.length,
        wsl: `${g.w} / ${g.l} / ${g.be}`,
        winrate: winRate,
        rTotal,
        rMedio: rTotal / g.trades.length,
        pf: winSum / lossSum,
      }
    }).sort((a, b) => b.rTotal - a.rTotal)
  }, [closedTrades])

  // Trades cerrados filtrados para la tabla
  const filteredClosed = useMemo(() => {
    return closedTrades.filter(t => {
      if (filtroR && t.result !== filtroR) return false
      if (filtroSide && t.side !== filtroSide) return false
      if (filtroBuscar && t.setup && !t.setup.toLowerCase().includes(filtroBuscar.toLowerCase())) return false
      return true
    })
  }, [closedTrades, filtroR, filtroSide, filtroBuscar])

  const totalPages = Math.max(1, Math.ceil(filteredClosed.length / PAGE))
  const safePag = Math.min(Math.max(0, pag), totalPages - 1)
  const pageClosed = filteredClosed.slice(safePag * PAGE, (safePag + 1) * PAGE)

  // Reset pag on filter change
  useEffect(() => { setPag(0) }, [filtroR, filtroSide, filtroBuscar])

  const status = {
    type: wsStatus,
    label: wsStatus === 'live' ? 'BINANCE AGGTRADE · ONLINE' : 'CONECTANDO…'
  }

  const rowClass = (t) => {
    if (t.status === 'OPEN') {
      if (t.r >= 0.5) return 'status-tp'
      if (t.r <= -0.5) return 'status-sl'
      return 'status-open'
    }
    return `status-${t.result?.toLowerCase() || 'be'}`
  }

  return (
    <>
      <TopBar
        title="Trades Realtime"
        subtitle="Auditoría de señales abiertas y cerradas por websocket"
        status={status}
        lastUpdate={fmtTime(lastUpdate)}
      />

      <main className="page page--trades">

        {/* Asset Selector */}
        <div className="asset-selector">
          {Object.keys(ASSETS).map(asset => {
            const info = ASSETS[asset]
            const tick = tickers[asset]
            const price = tick ? tick.close : null
            return (
              <button key={asset}
                className={`asset-selector__btn ${asset === activeAsset ? 'asset-selector__btn--active' : ''}`}
                onClick={() => setActiveAsset(asset)}
              >
                <span className="asset-selector__label">{asset}</span>
                <span className="asset-selector__price">
                  {price ? `$${fmt(price, info.dec)}` : '—'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Demo toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderRadius: 'var(--r-md)',
          background: demoMode ? 'var(--warning-bg)' : 'var(--surface)',
          border: `0.5px solid ${demoMode ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
        }}>
          <span style={{ fontSize: 12, color: demoMode ? 'var(--warning)' : 'var(--text-mute)' }}>
            {demoMode ? '⚠ MODO DEMO ACTIVO' : 'Mostrando solo señales reales.'}
          </span>
          <button onClick={() => setDemoMode(d => !d)} style={{
            fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 999,
            border: `0.5px solid ${demoMode ? 'rgba(245,158,11,0.4)' : 'var(--border-hi)'}`,
            background: demoMode ? 'var(--warning-bg)' : 'transparent',
            color: demoMode ? 'var(--warning)' : 'var(--text-dim)',
          }}>{demoMode ? 'Desactivar Demo' : 'Activar Demo'}</button>
        </div>

        {/* Row 1: KPIs principales */}
        <div className="page__grid page__grid--four">
          <div className="mc mc--md">
            <div className="mc__head"><span className="mc__label">BTC Live</span></div>
            <div className="mc__value mono">{livePrice ? fmt(livePrice, 2) : '—'}</div>
            <div className="mc__sub">Binance aggTrade</div>
          </div>
          <div className="mc mc--md">
            <div className="mc__head"><span className="mc__label">Abiertos</span></div>
            <div className="mc__value mono">{openTrades.length}</div>
          </div>
          <div className="mc mc--md">
            <div className="mc__head"><span className="mc__label">Realtime</span></div>
            <div className="mc__value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="topbar__dot" style={{ background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>ONLINE</span>
            </div>
            <div className="mc__sub">Último tick: <span className="mono">{fmtTime(lastUpdate)}</span></div>
          </div>
          <div className="mc mc--md">
            <div className="mc__head"><span className="mc__label">Cerrados</span></div>
            <div className="mc__value mono">{stats?.cerrados ?? 0}</div>
          </div>
        </div>

        {/* Row 2: Sidebar KPIs + Equity Curve */}
        <div className="page__split">
          <aside className="page__sidebar">
            {[
              { l: 'TP / SL / BE',      v: stats ? `${stats.tp} / ${stats.sl} / ${stats.be}` : '—' },
              { l: 'Winrate',           v: stats ? `${stats.winrate}%` : '—' },
              { l: 'R gestionado total', v: stats ? `${stats.rTotal.toFixed(2)}R` : '—' },
              { l: 'R gestionado medio', v: stats ? `${stats.rMedio.toFixed(2)}R` : '—' },
              { l: 'Profit Factor',     v: stats ? stats.pf.toFixed(2) : '—' },
              { l: 'Max DD',            v: stats ? `${stats.maxDD.toFixed(2)}R` : '—' },
            ].map(({ l, v }) => (
              <div key={l} className="mc mc--sm">
                <div className="mc__head"><span className="mc__label">{l}</span></div>
                <div className="mc__value mono" style={{ fontSize: 22 }}>{v}</div>
              </div>
            ))}
          </aside>

          <div className="mc mc--md" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Equity Curve</h3>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Evolución acumulada del sistema en múltiplos R.</p>
            </div>
            {/* Mini KPIs sobre equity */}
            <div className="page__minikpis">
              {[
                { l: 'Max DD',        v: stats ? `${stats.maxDD.toFixed(2)}R` : '—', col: 'var(--danger)' },
                { l: 'Profit Factor', v: stats ? stats.pf.toFixed(2) : '—', col: 'var(--text)' },
                { l: 'Expectancy',    v: stats ? `${stats.expectancy.toFixed(2)}R` : '—', col: 'var(--text)' },
                { l: 'Mejor R',       v: stats ? `${stats.bestR.toFixed(2)}R` : '—', col: 'var(--success)' },
                { l: 'Peor R',        v: stats ? `${stats.worstR.toFixed(2)}R` : '—', col: 'var(--danger)' },
              ].map(({ l, v, col }) => (
                <div key={l} className="page__minikpi">
                  <div className="page__minikpi-label">{l}</div>
                  <div className="page__minikpi-value mono" style={{ color: col }}>{v}</div>
                </div>
              ))}
            </div>
            <EquityCurveChart trades={closedTrades} />
          </div>
        </div>

        {/* Row 3: Histograma de R */}
        <div className="mc mc--md">
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Histograma de Resultados (R)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>
              Distribución de R múltiple — detecta outliers y concentración de pérdidas.
              {stats && <> <b style={{ color: 'var(--success)' }}>{stats.tp}</b> TP · <b style={{ color: 'var(--danger)' }}>{stats.sl}</b> SL · <b style={{ color: 'var(--gold)' }}>{stats.be}</b> BE</>}
            </p>
          </div>
          <RHistogram trades={closedTrades} />
        </div>

        {/* Rendimiento por Setup */}
        {bySetup.length > 0 && (
          <div className="mc mc--md">
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Rendimiento por Setup</h3>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Agrupación estadística por estructura detectada.</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="page__table">
                <thead>
                  <tr>
                    <th>Setup</th><th>Trades</th><th>TP / SL / BE</th><th>Winrate</th><th>R total</th><th>R medio</th><th>Profit Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {bySetup.map((s) => (
                    <tr key={s.setup}>
                      <td>{s.setup}</td>
                      <td className="mono">{s.count}</td>
                      <td className="mono">{s.wsl}</td>
                      <td className="mono">{s.winrate.toFixed(1)}%</td>
                      <td className="mono" style={{ color: s.rTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {s.rTotal >= 0 ? '+' : ''}{s.rTotal.toFixed(2)}R
                      </td>
                      <td className="mono" style={{ color: s.rMedio >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {s.rMedio >= 0 ? '+' : ''}{s.rMedio.toFixed(2)}R
                      </td>
                      <td className="mono">{s.pf.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabs + Filtros */}
        <div className="mc mc--md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Trades en Vivo</h3>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Datos de Binance · SL/TP automáticos · Simulación</p>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Última actualización: <span className="mono">{fmtTime(lastUpdate)}</span></span>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <button className={`chip ${tab === 'open' ? 'chip--success' : ''}`} onClick={() => setTab('open')}
              style={{ cursor: 'pointer' }}>ABIERTOS <span className="mono">{openTrades.length}</span></button>
            <button className={`chip ${tab === 'closed' ? 'chip--warning' : ''}`} onClick={() => setTab('closed')}
              style={{ cursor: 'pointer' }}>CERRADOS <span className="mono">{closedTrades.length}</span></button>

            {tab === 'closed' && (
              <>
                <select value={filtroR} onChange={e => setFiltroR(e.target.value)}
                  style={{ marginLeft: 'auto', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font)' }}>
                  <option value="">Todos</option>
                  <option value="TP">TP</option>
                  <option value="SL">SL</option>
                  <option value="BE">BE</option>
                </select>
                <select value={filtroSide} onChange={e => setFiltroSide(e.target.value)}
                  style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font)' }}>
                  <option value="">Lado</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
                <input value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)}
                  placeholder="Buscar setup..." style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font)', width: 130 }} />
              </>
            )}
          </div>

          {/* Tabla ABIERTOS con color coding y barra de progreso */}
          {tab === 'open' && (
            <>
              {openTrades.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="page__table">
                    <thead>
                      <tr>
                        <th>ID</th><th>Estado</th><th>TF</th><th>Side</th><th>Setup</th>
                        <th>Entry</th><th>SL</th><th>R actual</th><th>Progreso</th><th>MFE</th><th>MAE</th><th>Dur.</th><th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map(t => (
                        <tr key={t.id} className={rowClass(t)}>
                          <td className="mono">{String(t.id).slice(-2)}</td>
                          <td><span className={`chip chip--${t.isDemo ? 'warning' : 'success'}`}>{t.isDemo ? 'DEMO' : 'OPEN'}</span></td>
                          <td className="mono">{t.tf}</td>
                          <td><span className={`chip chip--${t.side === 'LONG' ? 'success' : 'danger'}`}>{t.side}</span></td>
                          <td>{t.setup}</td>
                          <td className="mono">{fmt(t.entry, 2)}</td>
                          <td className="mono" style={{ color: 'var(--danger)' }}>{fmt(t.sl, 2)}</td>
                          <td className="mono" style={{ fontWeight: 600, color: t.r >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {t.r >= 0 ? '+' : ''}{t.r.toFixed(2)}R
                          </td>
                          <td><RProgressBar current={livePrice} entry={t.entry} sl={t.sl} side={t.side} /></td>
                          <td className="mono" style={{ color: 'var(--success)' }}>
                            +{(Math.abs((t.hi ?? t.entry) - t.entry) / Math.abs(t.entry - t.sl) * (t.side === 'LONG' ? 1 : -1)).toFixed(2)}R
                          </td>
                          <td className="mono" style={{ color: 'var(--danger)' }}>
                            {(Math.abs((t.lo ?? t.entry) - t.entry) / Math.abs(t.entry - t.sl) * (t.side === 'LONG' ? 1 : -1)).toFixed(2)}R
                          </td>
                          <td className="mono" style={{ color: 'var(--text-faint)' }}>{t.duration}</td>
                          <td className="mono">{livePrice ? fmt(livePrice, 2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="em">Esperando señal del Score Maestro...</div>
              )}
            </>
          )}

          {/* Tabla CERRADOS con paginación */}
          {tab === 'closed' && (
            <>
              {filteredClosed.length > 0 ? (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="page__table">
                      <thead>
                        <tr>
                          <th>ID</th><th>Res.</th><th>Side</th><th>Setup</th><th>Entry</th><th>Close</th><th>R</th><th>MFE</th><th>MAE</th><th>Dur.</th><th>PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageClosed.map(t => (
                          <tr key={t.id} className={`status-${(t.result || 'be').toLowerCase()} ${t.isDemo ? 'demo-row' : ''}`}>
                            <td className="mono">{String(t.id).slice(-2)}</td>
                            <td>
                              <span className={`chip chip--${t.result === 'TP' ? 'success' : t.result === 'SL' ? 'danger' : 'mute'}`}>
                                {t.result || 'BE'}
                              </span>
                            </td>
                            <td><span className={`chip chip--${t.side === 'LONG' ? 'success' : 'danger'}`}>{t.side}</span></td>
                            <td>{t.setup}</td>
                            <td className="mono">{fmt(t.entry, 2)}</td>
                            <td className="mono">{fmt(t.tp1 || t.entry, 2)}</td>
                            <td className="mono" style={{ fontWeight: 600, color: t.r >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {t.r >= 0 ? '+' : ''}{t.r.toFixed(2)}R
                            </td>
                            <td className="mono" style={{ color: 'var(--success)' }}>
                              +{(Math.abs(t.hi - t.entry) / Math.abs(t.entry - t.sl) * (t.side === 'LONG' ? 1 : -1)).toFixed(2)}R
                            </td>
                            <td className="mono" style={{ color: 'var(--danger)' }}>
                              {(Math.abs(t.lo - t.entry) / Math.abs(t.entry - t.sl) * (t.side === 'LONG' ? 1 : -1)).toFixed(2)}R
                            </td>
                            <td className="mono" style={{ color: 'var(--text-faint)' }}>{t.duration}</td>
                            <td className="mono" style={{ fontWeight: 600, color: t.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginacion */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12, fontSize: 11, color: 'var(--dim)' }}>
                    <button disabled={safePag <= 0} onClick={() => setPag(p => Math.max(0, p - 1))}
                      style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--txt)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', opacity: safePag <= 0 ? 0.4 : 1 }}>
                      &lsaquo;
                    </button>
                    <span>{safePag + 1}/{totalPages} ({filteredClosed.length})</span>
                    <button disabled={safePag >= totalPages - 1} onClick={() => setPag(p => Math.min(totalPages - 1, p + 1))}
                      style={{ background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--txt)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', opacity: safePag >= totalPages - 1 ? 0.4 : 1 }}>
                      &rsaquo;
                    </button>
                  </div>
                </>
              ) : (
                <div className="em">Esperando trades cerrados...</div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}