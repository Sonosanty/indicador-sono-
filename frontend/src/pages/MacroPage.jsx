// ═══════════════════════════════════════════════════════════════
// MacroPage.jsx — "Indicador BTC Macro"
// Replica de mifuturapp/indicador_btc/ con mejoras React
// VIX real, EUR real, links a fuentes, animaciones, hover
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef } from 'react'
import TopBar from '../components/TopBar.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { useBinance, ASSETS } from '../hooks/useBinance.js'
import { useMacro } from '../hooks/useMacro.js'
import { useMultiTicker } from '../hooks/useMultiTicker.js'
import { computeScore } from '../engine/indicators.js'
import './pages.css'

const fmt = (n, d = 2) => n == null || isNaN(n) ? '—'
  : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtTime = ts => ts ? new Date(ts).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : null

export default function MacroPage() {
  const [now, setNow] = useState(Date.now())
  const [updating, setUpdating] = useState(false)
  const [activeAsset, setActiveAsset] = useState('BTC')
  const prevMacroRef = useRef()
  const { assetCandles, assetTicker, wsStatus, lastUpdate, apiSource } = useBinance(activeAsset, '3m')
  const macro = useMacro()
  const tickers = useMultiTicker()
  const score = useMemo(() => computeScore(assetCandles), [assetCandles])
  const assetInfo = ASSETS[activeAsset]

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Animación pulse cuando se actualizan datos macro
  useEffect(() => {
    if (macro.lastUpdate && macro.lastUpdate !== prevMacroRef.current) {
      prevMacroRef.current = macro.lastUpdate
      setUpdating(true)
      const t = setTimeout(() => setUpdating(false), 1500)
      return () => clearTimeout(t)
    }
  }, [macro.lastUpdate])

  // Precio: primero ticker del WebSocket, luego velas, luego multiTicker (fallback rápido)
  const livePrice = assetTicker.close ?? assetCandles.at(-1)?.close ?? tickers[activeAsset]?.close
  const eurPrice  = livePrice ? livePrice * (macro.eurRate ?? 0.92) : null
  const change24h = assetTicker.change ?? tickers[activeAsset]?.change

  // min/max histórico
  const sessionStats = useMemo(() => {
    if (!assetCandles.length) return null
    const highs = assetCandles.map(c => c.high)
    const lows  = assetCandles.map(c => c.low)
    return {
      min: Math.min(...lows),
      max: Math.max(...highs),
      delta: livePrice ? livePrice - assetCandles[0].close : 0,
    }
  }, [assetCandles, livePrice])

  // Régimen crypto
  const regime = useMemo(() => {
    const fg = macro.fearGreed?.value
    if (!fg) return null
    if (fg < 25)      return { label: 'ACUMULACIÓN', desc: 'Contexto típico de acumulación macro progresiva.', bias: 'LONG SWING', risk: 'MEDIO', accent: 'primary' }
    if (fg < 45)      return { label: 'MIEDO', desc: 'Mercado precavido, posible suelo en formación.', bias: 'LONG GRADUAL', risk: 'MEDIO', accent: 'warning' }
    if (fg < 60)      return { label: 'NEUTRAL', desc: 'Mercado en equilibrio. Sin sesgo claro.', bias: 'NEUTRAL', risk: 'BAJO', accent: 'primary' }
    if (fg < 75)      return { label: 'OPTIMISMO', desc: 'Apetito por riesgo creciente.', bias: 'LONG TÁCTICO', risk: 'MEDIO', accent: 'success' }
    return                  { label: 'EUFORIA', desc: 'Sobrecalentamiento. Riesgo de distribución.', bias: 'CAUTELA', risk: 'ALTO', accent: 'danger' }
  }, [macro.fearGreed])

  // Estado macro
  const macroState = useMemo(() => {
    const fg = macro.fearGreed?.value ?? 50
    if (fg < 20)  return { label: 'EXTREME FEAR',  level: 1, accent: 'danger',  desc: 'Score 1 · pánico extremo, oportunidad de acumulación.' }
    if (fg < 35)  return { label: 'FEAR',          level: 2, accent: 'warning', desc: 'Score 2 · contexto de acumulación, riesgo y liquidez.' }
    if (fg < 55)  return { label: 'NEUTRAL',       level: 3, accent: 'primary', desc: 'Score 3 · mercado equilibrado sin sesgo claro.' }
    if (fg < 75)  return { label: 'GREED',         level: 4, accent: 'success', desc: 'Score 4 · apetito por riesgo creciente.' }
    if (fg < 90)  return { label: 'EXTREME GREED', level: 5, accent: 'success', desc: 'Score 5 · euforia, riesgo elevado de techo.' }
    return            { label: 'EUPHORIA',     level: 6, accent: 'danger',  desc: 'Score 6 · sobrecalentamiento extremo.' }
  }, [macro.fearGreed])

  const statusObj = {
    type: wsStatus,
    label: wsStatus === 'live' ? 'BINANCE WEBSOCKET · ONLINE'
         : wsStatus === 'connecting' ? 'CONECTANDO…'
         : wsStatus === 'stalled' ? 'DATOS CONGELADOS'
         : 'ERROR DE CONEXIÓN'
  }

  return (
    <>
      <TopBar
        title={`Indicador ${activeAsset} Macro`}
        subtitle={`Contexto macro · ${activeAsset} live · señales · lectura multi-timeframe`}
        status={statusObj}
        lastUpdate={fmtTime(lastUpdate)}
        activeAsset={activeAsset}
      />

      <main className="page page--macro">

        {/* ── Selector de activos ── */}
        <div className="asset-selector">
          {['BTC','ETH','SOL','XRP'].map(asset => (
            <button
              key={asset}
              className={`asset-selector__btn ${asset === activeAsset ? 'asset-selector__btn--active' : ''}`}
              onClick={() => setActiveAsset(asset)}
            >
              <span className="asset-selector__label">{asset}</span>
              {tickers[asset]?.close != null && (
                <span className="asset-selector__price">${fmt(tickers[asset].close, ASSETS[asset].dec)}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Row 1: Spot (span 2) + Estado Macro (span 2) ── */}
        <div className="page__grid page__grid--top">
          <MetricCard
            label={`${activeAsset} Spot`}
            value={livePrice ? `$${fmt(livePrice, 2)}` : null}
            sublabel={eurPrice ? `€${fmt(eurPrice, 0)}` : null}
            badge={change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% 24h` : null}
            badgeColor={(change24h ?? 0) >= 0 ? 'success' : 'danger'}
            sources={`Binance ${assetInfo?.symbol ?? activeAsset+'USDT'} · EURUSDT · snapshot interno`}
            lastUpdate={fmtTime(lastUpdate)}
            range={sessionStats ? `Histórico cargado · min $${fmt(sessionStats.min, 0)} · max $${fmt(sessionStats.max, 0)} · Δ ${sessionStats.delta >= 0 ? '+' : ''}$${fmt(Math.abs(sessionStats.delta), 0)}` : null}
            size="lg"
            span={2}
            loading={!livePrice}
            updating={updating}
          />

          <MetricCard
            label="Estado macro"
            value={macroState.label}
            sublabel={macroState.desc}
            badge={`${macroState.level}/6`}
            badgeColor="mute"
            sources="Fear & Greed · CoinGecko Global · VIX · snapshot interno"
            lastUpdate={macro.lastUpdate ? fmtTime(macro.lastUpdate) : null}
            size="lg"
            span={2}
            accent={macroState.accent}
            loading={!macro.fearGreed}
            updating={updating}
          />
        </div>

        {/* ── Row 2: Régimen + F&G + VIX + RSI Macro ── */}
        <div className="page__grid page__grid--four">
          <MetricCard
            label="Régimen crypto"
            value={regime?.label}
            sublabel={regime?.desc}
            sources="CoinGecko Global · Alternative.me · snapshot interno"
            size="lg"
            loading={!regime}
            accent={regime?.accent}
            updating={updating}
          >
            {regime && (
              <div className="mc__chips">
                <span className="chip chip--primary">Sesgo: {regime.bias}</span>
                <span className="chip chip--mute">Riesgo: {regime.risk}</span>
              </div>
            )}
          </MetricCard>

          <MetricCard
            label="Fear & Greed"
            value={macro.fearGreed?.value}
            sublabel={macro.fearGreed?.label}
            sources="Alternative.me · API"
            range={macro.fearGreed ? `Histórico cargado · min ${macro.fearGreed.value} · max ${macro.fearGreed.value} · Δ 0` : null}
            loading={!macro.fearGreed}
            updating={updating}
          >
            {macro.fearGreed?.value != null && (
              <div className="mc__mini-bar">
                <div
                  className="mc__mini-bar-fill"
                  style={{
                    width: `${macro.fearGreed.value}%`,
                    background: macro.fearGreed.value < 30
                      ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                      : macro.fearGreed.value < 55
                      ? 'linear-gradient(90deg, #f59e0b, #94a3b8)'
                      : 'linear-gradient(90deg, #94a3b8, #22c55e)'
                  }}
                />
              </div>
            )}
            <div className="mc__mini-labels">
              <span>Miedo</span>
              <span>Neutral</span>
              <span>Euforia</span>
            </div>
          </MetricCard>

          <MetricCard
            label="VIX"
            value={macro.vixAvailable ? fmt(macro.vix, 2) : 'N/D'}
            sublabel={macro.vixAvailable ? 'Volatilidad mercado tradicional' : 'No disponible (requiere proxy)'}
            sources={macro.vixAvailable ? 'Yahoo Finance · ^VIX · ^VIX · Worker proxy' : 'Yahoo Finance · CORS bloqueado'}
            range={macro.vixAvailable ? `Histórico cargado · min ${fmt(macro.vix, 2)} · max ${fmt(macro.vix, 2)}` : null}
            loading={false}
            updating={updating}
            accent={macro.vix != null && macro.vix > 25 ? 'warning' : macro.vix != null && macro.vix > 30 ? 'danger' : null}
          >
            {macro.vix != null && (
              <div className="mc__mini-bar">
                <div
                  className="mc__mini-bar-fill"
                  style={{
                    width: `${Math.min(100, (macro.vix / 40) * 100)}%`,
                    background: macro.vix < 15
                      ? 'linear-gradient(90deg, #22c55e, #94a3b8)'
                      : macro.vix < 25
                      ? 'linear-gradient(90deg, #94a3b8, #f59e0b)'
                      : 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  }}
                />
              </div>
            )}
            {macro.vix != null && (
              <div className="mc__mini-labels">
                <span>Baja</span>
                <span>Media</span>
                <span>Alta</span>
              </div>
            )}
          </MetricCard>

          <MetricCard
            label="RSI Macro 3D"
            value={score?.rsi ? fmt(score.rsi, 2) : null}
            sublabel={score?.rsi > 70 ? 'Sobrecompra' : score?.rsi < 30 ? 'Sobreventa' : 'Neutral'}
            sources={`Binance ${assetInfo?.symbol ?? activeAsset+'USDT'} · RSI 3D snapshot`}
            range={score?.rsi ? `Histórico cargado · min ${fmt(score.rsi, 2)} · max ${fmt(score.rsi, 2)} · Δ 0.00` : null}
            loading={!score?.rsi}
            updating={updating}
            accent={score?.rsi > 70 ? 'danger' : score?.rsi < 30 ? 'success' : null}
          >
            {score?.rsi != null && (
              <div className="mc__mini-bar">
                <div
                  className="mc__mini-bar-fill"
                  style={{
                    width: `${score.rsi}%`,
                    background: score.rsi > 70
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : score.rsi < 30
                      ? 'linear-gradient(90deg, #22c55e, #94a3b8)'
                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                  }}
                />
              </div>
            )}
          </MetricCard>
        </div>

        {/* ── Row 3: Dominancias + Market Cap ── */}
        {/* ── Row 3a: Multi-Ticker ETH · SOL · XRP ── */}
        <div className="page__grid page__grid--four">
          {Object.entries(ASSETS).filter(([k]) => k !== 'BTC').map(([key, info]) => {
            const t = tickers[key]
            const chg = t?.change
            return (
              <MetricCard
                key={key}
                label={key}
                value={t?.close != null ? `$${fmt(t.close, info.dec)}` : null}
                sublabel={info.name}
                badge={chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : null}
                badgeColor={chg != null ? (chg >= 0 ? 'success' : 'danger') : null}
                sources={`Binance ${info.symbol} · REST`}
                lastUpdate={t ? new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : null}
                loading={!t}
                size="sm"
              >
                {chg != null && (
                  <div className="mc__mini-bar">
                    <div
                      className="mc__mini-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.abs(chg) * 5)}%`,
                        background: chg >= 0
                          ? 'linear-gradient(90deg, #166534, #22c55e)'
                          : 'linear-gradient(90deg, #dc2626, #ef4444)'
                      }}
                    />
                  </div>
                )}
              </MetricCard>
            )
          })}
        </div>

        <div className="page__grid page__grid--four">
          <MetricCard
            label="Dominancia BTC"
            value={macro.btcDom != null ? `${fmt(macro.btcDom, 2)}%` : null}
            sublabel="BTC liderando el mercado"
            sources="CoinGecko Global · API"
            range={macro.btcDom != null ? `Histórico cargado · min ${fmt(macro.btcDom, 2)}% · max ${fmt(macro.btcDom, 2)}%` : null}
            loading={macro.btcDom == null}
            updating={updating}
          >
            {macro.btcDom != null && (
              <div className="mc__mini-bar">
                <div className="mc__mini-bar-fill" style={{ width: `${macro.btcDom}%` }} />
              </div>
            )}
          </MetricCard>

          <MetricCard
            label="Dominancia ETH"
            value={macro.ethDom != null ? `${fmt(macro.ethDom, 2)}%` : null}
            sublabel="Termómetro de apetito altcoin"
            sources="CoinGecko Global · API"
            range={macro.ethDom != null ? `Histórico cargado · min ${fmt(macro.ethDom, 2)}% · max ${fmt(macro.ethDom, 2)}%` : null}
            loading={macro.ethDom == null}
            updating={updating}
          />

          <MetricCard
            label="Dominancia Alts"
            value={macro.altsDom != null ? `${fmt(macro.altsDom, 2)}%` : null}
            sublabel="Mercado ex-BTC-ex-ETH"
            sources="CoinGecko Global · API"
            range={macro.altsDom != null ? `Histórico cargado · min ${fmt(macro.altsDom, 2)}% · max ${fmt(macro.altsDom, 2)}%` : null}
            loading={macro.altsDom == null}
            updating={updating}
          />

          <MetricCard
            label="Market Cap Crypto"
            value={macro.marketCap ? `${(macro.marketCap / 1e12).toFixed(2)}T` : null}
            sublabel={macro.volume24h ? `Volumen 24h: ${(macro.volume24h / 1e9).toFixed(2)}B` : null}
            sources="CoinGecko Global · API"
            range={macro.marketCap ? `Histórico cargado · min ${(macro.marketCap/1e12).toFixed(2)}T · max ${(macro.marketCap/1e12).toFixed(2)}T` : null}
            loading={!macro.marketCap}
            updating={updating}
          />
        </div>

        <div className="page__footer">
          Último snapshot macro: <span className="mono">{fmtTime(macro.lastUpdate)}</span> · Datos actualizados en tiempo real.
        </div>
      </main>
    </>
  )
}
