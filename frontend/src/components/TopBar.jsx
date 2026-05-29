// ═══════════════════════════════════════════════════════════════
// TopBar.jsx — header con título descriptivo + pills de navegación
// Sustituye "👒 MÉTODO SONO Fino Edition Pro" por algo institucional
// ═══════════════════════════════════════════════════════════════
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Radar, BookOpen, Cpu, ChevronRight } from 'lucide-react'
import './TopBar.css'

// Rutas visibles en el menú (Agentes está oculto, ruta sigue funcionando)
const VISIBLE_ROUTES = [
  { to: '/',        label: 'Macro',  icon: Activity   },
  { to: '/trades',  label: 'Trades', icon: BarChart3  },
  { to: '/rangos',  label: 'Rangos', icon: Radar      },
  { to: '/metodo',  label: 'Método',  icon: BookOpen    },
]

export default function TopBar({ title, subtitle, status, lastUpdate, activeAsset }) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__title-row">
          <div className="topbar__brand">
            <div className="topbar__logo" aria-hidden="true">{activeAsset || 'BTC'}</div>
            <div>
              <h1 className="topbar__title">{title}</h1>
              <p className="topbar__sub">{subtitle}</p>
            </div>
          </div>

          <nav className="topbar__nav" aria-label="Secciones principales">
            {VISIBLE_ROUTES.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `topbar__pill ${isActive ? 'topbar__pill--active' : ''}`
                }
              >
                <Icon size={14} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {(status || lastUpdate) && (
          <div className="topbar__meta">
            {status && (
              <div className={`topbar__status topbar__status--${status.type}`}>
                <span className="topbar__dot" aria-hidden="true"></span>
                <span>{status.label}</span>
              </div>
            )}
            {lastUpdate && (
              <div className="topbar__time">
                Última actualización: <span className="mono">{lastUpdate}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
