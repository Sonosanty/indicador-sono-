// ═══════════════════════════════════════════════════════════════
// MetricCard.jsx — Number-First Card pattern (inspirado en mifuturapp)
// 5 slots: Label · BigNumber · Sublabel · Sources (con links) · Range
// ═══════════════════════════════════════════════════════════════
import './MetricCard.css'

export default function MetricCard({
  label,
  value,
  sublabel,
  badge,
  badgeColor = 'primary',
  sources,       // string simple o array de {href, text}
  sourcesArr,    // array de {href, text, label} — alternativa estructurada
  lastUpdate,
  range,
  size = 'md',
  span = 1,
  loading = false,
  accent = null, // primary | success | danger | warning
  children,
  miniBar = null, // 0-100 o null
  updating = false, // trigger animación pulse
  className = '',
}) {
  // Renderiza fuente como link si es un string con enlaces o array
  const renderSources = () => {
    if (sourcesArr) {
      return sourcesArr.map((s, i) => (
        <span key={i}>
          {i > 0 && <span style={{ opacity: 0.3, margin: '0 3px' }}>·</span>}
          <a href={s.href} target="_blank" rel="noopener">{s.text}</a>
        </span>
      ))
    }
    if (!sources) return null
    // Convertir enlaces textuales como "Binance BTCUSDT · CoinGecko"
    // Dividir por "·" y convertir cada parte
    const parts = sources.split('·').map(p => p.trim()).filter(Boolean)
    return parts.map((part, i) => {
      const knownLinks = {
        'Binance BTCUSDT': 'https://www.binance.com/es/trade/BTC_USDT',
        'EURUSDT': 'https://www.binance.com/es/trade/EUR_USDT',
        'snapshot interno': null, // no link
        'CoinGecko Global': 'https://www.coingecko.com/',
        'CoinGecko': 'https://www.coingecko.com/',
        'Alternative.me': 'https://alternative.me/crypto/fear-and-greed-index/',
        'API': null,
        'Yahoo Finance · ^VIX': 'https://finance.yahoo.com/quote/%5EVIX/',
        'Yahoo Finance · CORS bloqueado': null,
        'Fear & Greed': 'https://alternative.me/crypto/fear-and-greed-index/',
        'RSI 3D snapshot': null,
        '^VIX · Worker proxy': null,
        'exchangerate-api': null,
      }
      const url = knownLinks[part]
      return (
        <span key={i}>
          {i > 0 && <span style={{ opacity: 0.3, margin: '0 3px' }}>·</span>}
          {url ? (
            <a href={url} target="_blank" rel="noopener">{part}</a>
          ) : (
            part
          )}
        </span>
      )
    })
  }

  return (
    <div
      className={`mc mc--${size} ${accent ? `mc--accent-${accent}` : ''} ${updating ? 'is-updating' : ''} ${className}`}
      style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
    >
      <div className="mc__head">
        <span className="mc__label">{label}</span>
        {badge && (
          <span className={`mc__badge mc__badge--${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mc__skeleton" />
      ) : (
        <>
          <div className="mc__value mono">{value ?? '—'}</div>
          {sublabel && <div className="mc__sub">{sublabel}</div>}
        </>
      )}

      {/* Chips (Sesgo, Riesgo, etc.) */}
      {children}

      {/* Mini barra decorativa */}
      {miniBar != null && (
        <div className="mc__mini-bar">
          <div className="mc__mini-bar-fill" style={{ width: `${Math.min(100, Math.max(0, miniBar))}%` }} />
        </div>
      )}

      {/* Footer con fuentes */}
      {(sources || sourcesArr || lastUpdate || range) && (
        <div className="mc__foot">
          {(sources || sourcesArr) && (
            <div className="mc__sources">
              <strong>Fuente: </strong>
              {renderSources()}
            </div>
          )}
          {lastUpdate && (
            <div className="mc__time">
              Última actualización: <span className="mono">{lastUpdate}</span>
            </div>
          )}
          {range && <div className="mc__range mono">{range}</div>}
        </div>
      )}
    </div>
  )
}
