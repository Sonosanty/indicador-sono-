// ═══════════════════════════════════════════════════════════════
// RangeChart.jsx — mini-gráfico para Range Intelligence
// Replica el estilo de mifuturapp/range_explorer: línea azul cyan
// con marcadores de TP/Mecha arriba y abajo del rango
// ═══════════════════════════════════════════════════════════════
import { calcBB, calcATR } from '../engine/indicators.js'

export default function RangeChart({ candles, height = 200 }) {
  const W = 600, H = height, PT = 16, PB = 24, PL = 38, PR = 12

  if (!candles || candles.length < 20) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-faint)', fontSize: 12 }}>
        Calculando rango…
      </div>
    )
  }

  const display = candles.slice(-90)
  const closes = display.map(c => c.close)
  const lastPrice = closes.at(-1)
  const bb = calcBB(closes, 20) || { upper: lastPrice * 1.005, lower: lastPrice * 0.995, middle: lastPrice }
  const atr = calcATR(display, 14) || (lastPrice * 0.003)

  // Niveles dinámicos (en deltas desde el precio actual)
  const levels = {
    tpHigh:    +(bb.upper - lastPrice).toFixed(2),
    mechaHigh: +(bb.upper * 1.003 - lastPrice).toFixed(2),
    tpLow:     +(lastPrice - bb.lower).toFixed(2),
    mechaLow:  +(lastPrice - bb.lower * 0.997).toFixed(2),
  }

  // Escala Y centrada en el precio
  const maxDelta = Math.max(levels.mechaHigh, levels.mechaLow) * 1.1
  const yScale = d => H/2 - (d / maxDelta) * (H/2 - PT)

  // Escala X
  const gap = (W - PL - PR) / display.length
  const cX = i => PL + i * gap + gap/2

  // Línea principal (deltas vs precio actual)
  const linePath = display.map((c, i) => {
    const delta = c.close - lastPrice
    return `${i===0?'M':'L'}${cX(i).toFixed(1)},${yScale(delta).toFixed(1)}`
  }).join(' ')

  // Eje Y labels
  const yLabels = [
    { v:  Math.round(maxDelta * 0.8), label: `+${Math.round(maxDelta * 0.8)}` },
    { v:  Math.round(maxDelta * 0.4), label: `+${Math.round(maxDelta * 0.4)}` },
    { v:  0, label: lastPrice.toFixed(2) },
    { v: -Math.round(maxDelta * 0.4), label: `-${Math.round(maxDelta * 0.4)}` },
    { v: -Math.round(maxDelta * 0.8), label: `-${Math.round(maxDelta * 0.8)}` },
  ]

  // Eje X (offsets)
  const xLabels = [-80, -60, -40, -20, 0, 20, 40, 60, 80]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      {/* Líneas del eje Y */}
      {yLabels.map(({ v, label }, i) => (
        <g key={i}>
          <line x1={PL} y1={yScale(v)} x2={W-PR} y2={yScale(v)}
            stroke="rgba(120,160,220,0.05)" strokeWidth="0.5"
            strokeDasharray={v === 0 ? "0" : "2,5"} />
          <text x={PL-4} y={yScale(v)+3} fill="var(--text-faint)" fontSize="9"
            fontFamily="JetBrains Mono, monospace" textAnchor="end"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {label}
          </text>
        </g>
      ))}

      {/* Líneas eje X */}
      {xLabels.map((x, i) => {
        const xPos = PL + (i / (xLabels.length-1)) * (W - PL - PR)
        return (
          <text key={i} x={xPos} y={H-6} fill="var(--text-faint)" fontSize="9"
            fontFamily="JetBrains Mono, monospace" textAnchor="middle">
            {x}
          </text>
        )
      })}

      {/* Marcadores TP/Mecha arriba */}
      <g>
        <rect x={PL+8} y={yScale(levels.tpHigh)-9} width={140} height={16} rx="3"
          fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.4)" strokeWidth="0.5" />
        <text x={PL+18} y={yScale(levels.tpHigh)+2} fill="#22c55e" fontSize="9" fontWeight="600"
          fontFamily="JetBrains Mono, monospace">
          +{Math.round(levels.tpHigh)} · {(lastPrice + levels.tpHigh).toFixed(2)} · EXTREME
        </text>

        <rect x={W-PR-150} y={yScale(levels.mechaHigh)-9} width={138} height={16} rx="3"
          fill="rgba(239,68,68,0.18)" stroke="rgba(239,68,68,0.4)" strokeWidth="0.5" />
        <text x={W-PR-140} y={yScale(levels.mechaHigh)+2} fill="#ef4444" fontSize="9" fontWeight="600"
          fontFamily="JetBrains Mono, monospace">
          +{Math.round(levels.mechaHigh)} · {(lastPrice + levels.mechaHigh).toFixed(2)} · EXTREME
        </text>
      </g>

      {/* Línea de precio */}
      <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="1.4" opacity="0.85" />

      {/* Punto actual con brillo */}
      <circle cx={cX(display.length - 1)} cy={H/2} r="6"
        fill="rgba(96,165,250,0.2)" />
      <circle cx={cX(display.length - 1)} cy={H/2} r="3"
        fill="#60a5fa" />
    </svg>
  )
}
