// ═══════════════════════════════════════════════════════════════
// CandleChart.jsx — gráfico de velas SVG con MAs + Bollinger
// ═══════════════════════════════════════════════════════════════
import { calcMA, calcBB } from '../engine/indicators.js'

export default function CandleChart({ candles, height = 280 }) {
  const W = 800, H = height, PR = 60, PT = 12, PB = 28
  const display = candles.slice(-100)

  if (display.length < 5) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-faint)',
        fontSize: 13,
      }}>
        Cargando datos Binance · {candles.length}/350
      </div>
    )
  }

  const prices = display.flatMap(c => [c.high, c.low])
  const minP = Math.min(...prices), maxP = Math.max(...prices)
  const pad = (maxP - minP) * 0.08
  const pY = p => PT + (1 - (p - (minP - pad)) / ((maxP + pad) - (minP - pad))) * (H - PT - PB)
  const gap = (W - PR) / display.length
  const cw  = Math.max(1.5, gap * 0.62)
  const cX  = i => i * gap + gap / 2

  const closes = candles.map(c => c.close)

  // MA paths
  const maConf = [
    { p: 6,   col: '#fbbf24', w: 1.0 },
    { p: 40,  col: '#22d3ee', w: 1.2 },
    { p: 200, col: '#f97316', w: 1.4 },
  ]
  const maPaths = maConf.map(({ p, col, w }) => {
    const pts = display.map((_, di) => {
      const ci = candles.length - display.length + di
      const sl = closes.slice(0, ci + 1)
      const v  = sl.length >= p ? sl.slice(-p).reduce((s,v)=>s+v,0) / p : null
      return v ? `${di===0?'M':'L'}${cX(di).toFixed(1)},${pY(v).toFixed(1)}` : null
    }).filter(Boolean)
    return { path: pts.join(' '), col, w }
  })

  // Bollinger paths
  const bbPaths = ['upper', 'middle', 'lower'].map((k, ki) => {
    const col = ['rgba(239,68,68,0.4)', 'rgba(245,158,11,0.45)', 'rgba(34,197,94,0.4)'][ki]
    const pts = display.map((_, di) => {
      const ci = candles.length - display.length + di
      const bbv = calcBB(closes.slice(0, ci+1), 20)
      if (!bbv) return null
      return `${di===0?'M':'L'}${cX(di).toFixed(1)},${pY(bbv[k]).toFixed(1)}`
    }).filter(Boolean)
    return { path: pts.join(' '), col, dash: ki===1 ? '4,4' : '0' }
  })

  // Grid
  const grids = Array.from({ length: 5 }, (_, i) => {
    const p = minP - pad + ((maxP + pad - (minP - pad)) * i) / 4
    return { p, y: pY(p) }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cg-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(96,165,250,0.04)" />
          <stop offset="100%" stopColor="rgba(96,165,250,0)" />
        </linearGradient>
      </defs>
      <rect x="0" y={PT} width={W-PR} height={H-PT-PB} fill="url(#cg-bg)" />

      {grids.map(({ p, y }, i) => (
        <g key={i}>
          <line x1="0" y1={y} x2={W-PR} y2={y} stroke="rgba(120,160,220,0.06)" strokeWidth="0.6" strokeDasharray="3,8" />
          <text x={W-PR+6} y={y+3} fill="var(--text-faint)" fontSize="9" fontFamily="JetBrains Mono, monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {p > 1000 ? (p/1000).toFixed(2)+'k' : p.toFixed(2)}
          </text>
        </g>
      ))}

      {bbPaths.map(({ path, col, dash }, i) =>
        <path key={`bb${i}`} d={path} fill="none" stroke={col} strokeWidth="0.8" strokeDasharray={dash} />
      )}

      {maPaths.map(({ path, col, w }, i) =>
        path && <path key={`ma${i}`} d={path} fill="none" stroke={col} strokeWidth={w} opacity="0.85" />
      )}

      {display.map((c, i) => {
        const isG = c.close >= c.open
        const col = isG ? '#22c55e' : '#ef4444'
        const bT = pY(Math.max(c.open, c.close))
        const bB = pY(Math.min(c.open, c.close))
        return (
          <g key={i}>
            <line x1={cX(i)} y1={pY(c.high)} x2={cX(i)} y2={pY(c.low)} stroke={col} strokeWidth="0.7" opacity="0.7" />
            <rect x={cX(i) - cw/2} y={bT} width={cw} height={Math.max(0.8, bB-bT)} fill={col} opacity="0.92" />
          </g>
        )
      })}

      <g transform={`translate(8, ${H - 10})`}>
        {[['MA6','#fbbf24'],['MA40','#22d3ee'],['MA200','#f97316'],['BB','rgba(245,158,11,0.6)']].map(([l,c],i) => (
          <g key={l} transform={`translate(${i * 58}, 0)`}>
            <rect y={-5} width={14} height={2} fill={c} />
            <text x={18} y={0} fill="var(--text-faint)" fontSize="9" fontFamily="JetBrains Mono, monospace">{l}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
