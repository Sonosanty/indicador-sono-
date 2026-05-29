// ══════════════════════════════════════════════════════════════
// AgentsPage.jsx — Agentes de trading Sono Pro
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar.jsx'
import './pages.css'

const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
const nf = (n) => n == null || isNaN(n) ? '—' : Number(n).toFixed(2)

// ─── Hook: leer log del bot ─────────────────────────────────
function useBotLog() {
  const [log, setLog] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => {
    const fetchLog = async () => {
      try {
        // Leer log vía endpoint local
        const r = await fetch('/api/bot-log')
        if (!r.ok) throw new Error('API no disponible')
        const lines = await r.text()
        setLog(lines.split('\n').filter(Boolean).slice(-30))
        setError(null)
      } catch {
        setError('Bot log no accesible desde web. Ver en servidor: sono_bot.log')
      }
    }
    fetchLog()
    const iv = setInterval(fetchLog, 60000)
    return () => clearInterval(iv)
  }, [])
  return { log, error }
}

// ─── Hook: ticker 4 cripto ──────────────────────────────────
function useFourTicker() {
  const [tickers, setTickers] = useState({})
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT"]')
        if (!r.ok) return
        const d = await r.json()
        const m = {}
        d.forEach(x => { const a = x.symbol.replace('USDT',''); m[a] = { price: parseFloat(x.lastPrice), change: parseFloat(x.priceChangePercent) } })
        setTickers(m)
      } catch {}
    }
    fetchAll()
    return () => {}
  }, [])
  return tickers
}

// ─── Card Agente ─────────────────────────────────────────────
function AgentCard({ nombre, icono, frecuencia, desc, datos, estado }) {
  return (
    <div className="mc" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>{icono}</span>
        <div>
          <div className="mc__label" style={{ fontSize: 14 }}>{nombre}</div>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{frecuencia}</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{desc}</p>
      {datos && (
        <div style={{ fontSize: 12, color: 'var(--text)', backgroundColor: 'var(--surface)', borderRadius: 8, padding: '10px 12px', fontFamily: 'var(--mono-font)' }}>
          {datos}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span className={`topbar__dot ${estado === 'activo' ? 'topbar__dot--live' : 'topbar__dot--paused'}`}></span>
        <span style={{ fontSize: 11, color: estado === 'activo' ? 'var(--success)' : 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {estado === 'activo' ? 'Activo' : 'Pausado'}
        </span>
      </div>
    </div>
  )
}

// ═══ PÁGINA ═══════════════════════════════════════════════════
export default function AgentsPage({ activeAsset = 'BTC', onSetAsset = () => {} }) {
  const { log, error } = useBotLog()
  const tickers = useFourTicker()

  // Extraer scores del log
  const parseScores = () => {
    if (!log.length) return null
    const scores = {}
    for (const line of log) {
      const m = line.match(/(\w+): Score=(\d+)/)
      if (m) scores[m[1]] = parseInt(m[2])
      const pm = line.match(/Position:\s*(\w+)/)
      if (pm) scores[pm[1]] = scores[pm[1]] || {}
    }
    return scores
  }
  const scores = parseScores()

  // Extraer últimas acciones del bot
  const lastActions = log.filter(l => l.includes('PAPER BUY') || l.includes('PAPER SELL') || l.includes('COMPRANDO') || l.includes('VENDIENDO') || l.includes('Error compra')).slice(-5)

  return (
    <>
      <TopBar
        title="Agentes Sono"
        subtitle="Swing trading autónomo · 24/7"
        status={{ type: 'live', label: 'AGENTES · v3' }}
        activeAsset={activeAsset}
        onSetAgent={onSetAsset}
        tickers={tickers}
        lastUpdate={null}
      />

      <main className="page">
        {/* ═══ PANEL 4 CRIPTO ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.7 }}>
          💹 MERCADO EN VIVO
        </h2>
        <div className="page__grid page__grid--four">
          {['BTC','ETH','SOL','XRP'].map(asset => {
            const t = tickers[asset]
            if (!t) return (
              <div key={asset} className="mc" style={{ padding: '14px 16px' }}>
                <div className="mc__label" style={{ fontSize: 12 }}>{asset}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>—</div>
              </div>
            )
            return (
              <div key={asset} className="mc" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="mc__label" style={{ fontSize: 12 }}>{asset}</div>
                  <span style={{ fontSize: 11, color: t.change >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {t.change >= 0 ? '▲' : '▼'} {Math.abs(t.change).toFixed(2)}%
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>${fmt(t.price)}</div>
                {scores && scores[asset] != null && (
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                    Score: <strong style={{ color: scores[asset] >= 68 ? 'var(--success)' : scores[asset] >= 35 ? 'var(--warning)' : 'var(--danger)' }}>{scores[asset]}</strong>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ═══ AGENTES ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '22px 0 10px', color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.7 }}>
          🤖 AGENTES DE TRADING
        </h2>
        <div className="page__grid page__grid--four">
          <AgentCard
            nombre="Bot Pionex"
            icono="🤖"
            frecuencia="Cada 2 min · 24/7"
            desc="Ejecuta órdenes reales en Pionex. Swing trading con Score Maestro Sono. Trailing stop 2%. Máx 2 posiciones."
            datos={log.length ? `Último: ${log[log.length-1]?.substring(0, 90)}` : error || 'Conectando...'}
            estado={error ? 'pausado' : 'activo'}
          />
          <AgentCard
            nombre="Señales"
            icono="📡"
            frecuencia="Cada 30 min"
            desc="Analiza scores + datos macro. Alerta si hay oportunidad de compra/venta. Compara con Fear & Greed y VIX."
            datos={scores ? `Scores: BTC ${scores.BTC||'?'} · ETH ${scores.ETH||'?'} · SOL ${scores.SOL||'?'} · XRP ${scores.XRP||'?'}` : 'Esperando datos...'}
            estado="activo"
          />
          <AgentCard
            nombre="Market Intel"
            icono="📊"
            frecuencia="Cada hora"
            desc="Monitoriza Fear & Greed, VIX, Market Cap y dominancia. Detecta cambios bruscos de mercado."
            datos="Analizando datos macro..."
            estado="activo"
          />
          <AgentCard
            nombre="Reporte Diario"
            icono="📈"
            frecuencia="22:00 CET"
            desc="Resumen del día con scores finales, trades ejecutados, PnL y recomendación para mañana."
            datos="Disponible después de las 22:00"
            estado="activo"
          />
        </div>

        {/* ═══ ÚLTIMAS ACCIONES ═══ */}
        {lastActions.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: '22px 0 10px', color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.7 }}>
              ⚡ ÚLTIMAS ACCIONES DEL BOT
            </h2>
            <div style={{ backgroundColor: 'var(--surface)', borderRadius: 14, padding: 16, fontSize: 12, fontFamily: 'var(--mono-font)', color: 'var(--text-dim)', lineHeight: 1.8 }}>
              {lastActions.reverse().map((l, i) => {
                const isBuy = l.includes('COMPRANDO') || l.includes('PAPER BUY')
                const isSell = l.includes('VENDIENDO') || l.includes('PAPER SELL')
                const isError = l.includes('ERROR') || l.includes('Error')
                return (
                  <div key={i} style={{
                    color: isError ? 'var(--danger)' : isBuy ? 'var(--success)' : isSell ? 'var(--warning)' : 'var(--text-dim)',
                    padding: '2px 0'
                  }}>
                    {l.substring(0, 100)}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ═══ CONFIGURACIÓN ═══ */}
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '22px 0 10px', color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.7 }}>
          ⚙️ CONFIGURACIÓN SWING TRADING
        </h2>
        <div className="page__grid page__grid--four">
          {[
            { label: 'Timeframe', value: '15 min', desc: 'Velas para cálculo de scores' },
            { label: 'Entrada COMPRA_FUERTE', value: 'Score ≥ 80', desc: 'Compra inmediata, ignora prioridad' },
            { label: 'Entrada COMPRA', value: 'Score ≥ 68', desc: 'Compra si es el mejor activo' },
            { label: 'Salida', value: 'Score < 35', desc: 'Vende posición (DISTRIBUCIÓN o peor)' },
            { label: 'Máx posiciones', value: '2', desc: 'Máximo de operaciones simultáneas' },
            { label: 'Trailing stop', value: '2%', desc: 'Desde precio máximo alcanzado' },
            { label: 'Riesgo por trade', value: '50%', desc: 'Del saldo disponible en quote' },
            { label: 'Prioridad activos', value: 'XRP > ETH > SOL > BTC', desc: 'Mejor score primero' },
          ].map(c => (
            <div key={c.label} className="mc" style={{ padding: '14px 16px' }}>
              <div className="mc__label" style={{ fontSize: 11 }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
