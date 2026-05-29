// ═══════════════════════════════════════════════════════════════
// RangesPage.jsx — "Range Intelligence" (replica range_explorer.php)
// v3.1 — con Asset Selector multicoin
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import TopBar from '../components/TopBar.jsx'
import RangeChart from '../components/RangeChart.jsx'
import { useBinanceMulti } from '../hooks/useBinanceMulti.js'
import { useMultiTicker } from '../hooks/useMultiTicker.js'
import { ASSETS } from '../hooks/useBinance.js'
import { computeScore, calcBB, calcATR } from '../engine/indicators.js'
import './pages.css'

const TIMEFRAMES = ['15m', '5m', '3m', '1m']
const fmt = (n, d=2) => n==null||isNaN(n) ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits:d, maximumFractionDigits:d })
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—'

function PressureGauge({ pressure, strength }) {
  // pressure: 'COMPRADORA' | 'VENDEDORA' | 'COMPRESIÓN'
  // strength: 0-100 (50 neutral, >50 compradora, <50 vendedora)
  const val = strength ?? 50
  const col = pressure === 'COMPRADORA' ? 'var(--success)'
            : pressure === 'VENDEDORA' ? 'var(--danger)'
            : 'var(--warning)'
  const intensity = Math.abs(val - 50) > 30 ? 'FUERTE' : Math.abs(val - 50) > 15 ? 'MEDIA' : 'NEUTRA'

  return (
    <div className="gauge">
      <div className="gauge__label">PRESIÓN DEL MERCADO</div>
      <div className="gauge__pressure" style={{ color: col }}>
        {pressure}
      </div>
      <div className="gauge__intensity" style={{ color: col }}>{intensity}</div>
      <div className="gauge__bar">
        <div className="gauge__bar-track">
          <div className="gauge__bar-fill" style={{
            left: '50%',
            width: `${Math.abs(val - 50)}%`,
            transform: val < 50 ? 'translateX(-100%)' : 'none',
            background: col,
          }} />
          <div className="gauge__bar-marker" style={{ left: `${val}%`, background: col }} />
        </div>
        <div className="gauge__bar-legend">
          <span>VENDEDORA</span>
          <span>NEUTRA</span>
          <span>COMPRADORA</span>
        </div>
      </div>
    </div>
  )
}

function TimeframeCard({ tf, candles, isDominant }) {
  if (!candles || !candles.length) {
    return <div className="mc" style={{padding:18}}><div className="mc__label" style={{fontSize:13}}>{tf}</div><div style={{fontSize:11,color:'var(--text-faint)',marginTop:8}}>Cargando…</div></div>
  }
  const score = useMemo(() => computeScore(candles), [candles])
  const bb = useMemo(() => candles.length >= 20 ? calcBB(candles.map(c => c.close), 20) : null, [candles])

  const lastPrice = candles.at(-1)?.close
  const pctB = bb && lastPrice ? (lastPrice - bb.lower) / (bb.upper - bb.lower) : 0.5

  const zone = pctB < 0.3 ? 'Zona baja del rango'
             : pctB < 0.7 ? 'Zona media del rango'
             : 'Zona alta del rango'

  const pressure = score?.label === 'COMPRA FUERTE' || score?.label === 'COMPRA' ? 'COMPRADORA'
                 : score?.label === 'VENTA' || score?.label === 'CAPITULACIÓN' ? 'VENDEDORA'
                 : 'COMPRESIÓN'

  const strength = score ? 50 + ((score.total - 50) * 0.8) : 50

  const reaccion = pctB < 0.2 || pctB > 0.8 ? 'Posible reacción'
                 : pctB < 0.35 || pctB > 0.65 ? 'Esperar confirmación'
                 : 'Sin sesgo claro'

  return (
    <div className="tf-card">
      <div className="tf-card__head">
        <div>
          <div className="tf-card__tf">
            {tf}
            {isDominant && <span className="chip chip--primary" style={{ marginLeft: 10, fontSize: 9 }}>DOMINANTE</span>}
          </div>
          <div className="tf-card__sub">{reaccion === 'Posible reacción' ? 'POSIBLE REACCIÓN' : 'RANGO · ESPERA'}</div>
        </div>
        <PressureGauge pressure={pressure} strength={strength} />
      </div>

      <div className="tf-card__chart">
        <RangeChart candles={candles} height={200} />
      </div>

      <div className="tf-card__chips">
        <div className="tf-chip">
          <div className="tf-chip__label">CONTEXTO</div>
          <div className="tf-chip__value">{zone}</div>
        </div>
        <div className="tf-chip">
          <div className="tf-chip__label">LIQUIDEZ</div>
          <div className="tf-chip__value">
            {pctB < 0.5 ? 'Liquidez compradora' : 'Liquidez vendedora'}
          </div>
        </div>
        <div className="tf-chip">
          <div className="tf-chip__label">SWEEP</div>
          <div className="tf-chip__value">Sin barrido claro</div>
        </div>
        <div className="tf-chip">
          <div className="tf-chip__label">REACCIÓN ESPERADA</div>
          <div className="tf-chip__value">{reaccion}</div>
        </div>
      </div>

      <p className="tf-card__note">
        Precio en {zone.toLowerCase()}. {reaccion}.
      </p>
    </div>
  )
}

export default function RangesPage() {
  const [activeAsset, setActiveAsset] = useState('BTC')
  const [showAllTimeframes, setShowAllTimeframes] = useState(false)
  const tickers = useMultiTicker()
  const symbol = ASSETS[activeAsset]?.symbol ?? 'BTCUSDT'
  // UN solo hook en vez de 4 — 1 WS + 4 fetches en paralelo
  const { candlesByTf, livePrice, wsStatus: wsStatusMulti, lastUpdate: lastUpdateMulti } = useBinanceMulti(symbol, ['15m','5m','3m','1m'])

  // Lazy mount: 15m inmediato, 5m a 200ms, 3m y 1m a 400ms
  useEffect(() => {
    const t = setTimeout(() => setShowAllTimeframes(true), 400)
    return () => clearTimeout(t)
  }, [])

  // Confianza global agregada (combinación de los 4 TFs)
  const aggregateConfidence = useMemo(() => {
    const scores = Object.values(candlesByTf).filter(c => c && c.length).map(c => computeScore(c)?.total).filter(s => s != null)
    if (!scores.length) return null
    const avg = scores.reduce((s,v) => s+v, 0) / scores.length
    return Math.round(avg * 1.5)
  }, [candlesByTf])

  // Contexto principal
  const mainContext = useMemo(() => {
    if (!livePrice || !aggregateConfidence) return null
    const tf15Score = (candlesByTf['15m'] && candlesByTf['15m'].length) ? computeScore(candlesByTf['15m']) : null
    const bb = tf15Score?.bb
    if (!bb) return null
    const pctB = (livePrice - bb.lower) / (bb.upper - bb.lower)
    if (pctB < 0.25) return { label: 'NEAR SUPPORT', desc: 'Precio cerca de extremos inferiores en varias temporalidades. Cuidado con perseguir cortos tardíos.' }
    if (pctB > 0.75) return { label: 'NEAR RESISTANCE', desc: 'Precio cerca de extremos superiores. Cuidado con perseguir largos tardíos.' }
    return { label: 'NEUTRAL', desc: 'Precio en zona media sin confluencia clara entre timeframes.' }
  }, [livePrice, aggregateConfidence, candlesByTf])

  const wsStatus = wsStatusMulti

  return (
    <>
      <TopBar
        title="Range Intelligence"
        subtitle="Radar automático de extremos, rangos, zonas y barridos BTC."
        status={{ type: wsStatus, label: wsStatus === 'live' ? 'BINANCE WEBSOCKET · ONLINE' : 'CONECTANDO…' }}
        lastUpdate={fmtTime(lastUpdateMulti)}
      />

      <main className="page page--ranges">

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

        {/* Header banner verde con precio + confianza global */}
        <div className="range-banner">
          <div>
            <div className="range-banner__label">BTC RANGE INTELLIGENCE</div>
            <div className="range-banner__price mono">{livePrice ? fmt(livePrice, 2) : '—'}</div>
            <div className="range-banner__context">{mainContext?.label ?? 'NEUTRAL'}</div>
            <div className="range-banner__desc">{mainContext?.desc ?? 'Cargando contexto…'}</div>
          </div>
          <div className="range-banner__confidence">
            <div className="range-banner__conf-label">CONFIANZA</div>
            <div className="range-banner__conf-value mono">{aggregateConfidence ?? '—'}</div>
            <div className="range-banner__conf-max mono">/100</div>
          </div>
        </div>

        {/* Grid 2x2 de timeframes — 15m inmediato, el resto lazy */}
        <div className="range-grid">
          {TIMEFRAMES.map((tf, i) => (
            i <= 1 || showAllTimeframes ? (
              <TimeframeCard
                key={tf}
                tf={tf}
                candles={candlesByTf[tf]}
                isDominant={i === 0}
              />
            ) : (
              <div key={tf} className="mc" style={{padding:18}}>
                <div className="mc__label" style={{fontSize:13}}>{tf}</div>
                <div style={{fontSize:11,color:'var(--text-faint)',marginTop:8}}>Preparando…</div>
              </div>
            )
          ))}
        </div>

        <p className="page__footer" style={{ textAlign: 'center', marginTop: 32 }}>
          Lectura automática basada en rangos recientes, presión percentil, divisores de soporte/resistencia, POC,
          rotación, volumen relativo y patrón de compresión.
        </p>
      </main>
    </>
  )
}
