// ═══════════════════════════════════════════════════════════════
// AppRouter.jsx — Router con lazy loading por ruta
// Macro y Metodo se cargan normales (siempre se usan),
// Trades, Rangos y Agentes van en chunks separados vía lazy().
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'

// ── Carga eager (ruta principal) ─────
import MacroPage from './pages/MacroPage.jsx'

// ── Carga lazy (chunks secundarios) ──
const TradesPage = lazy(() => import('./pages/TradesPage.jsx'))
const RangesPage = lazy(() => import('./pages/RangesPage.jsx'))
const MetodoPage = lazy(() => import('./pages/MetodoPage.jsx'))
const AgentsPage = lazy(() => import('./pages/AgentsPage.jsx'))

function LoadingFallback() {
  return (
    <div className="loading-shell" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      color: '#6b7280',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.9rem'
    }}>
      Cargando módulo…
    </div>
  )
}

export default function AppRouter() {
  const [activeAsset, setActiveAsset] = useState('BTC')
  const onSetAsset = (asset) => { if (asset) setActiveAsset(asset) }

  return (
    <HashRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/"               element={<MacroPage  activeAsset={activeAsset} onSetAsset={onSetAsset} />} />
          <Route path="/macro"          element={<MacroPage  activeAsset={activeAsset} onSetAsset={onSetAsset} />} />
          <Route path="/trades"         element={<TradesPage />} />
          <Route path="/rangos"         element={<RangesPage />} />
          <Route path="/metodo"         element={<MetodoPage activeAsset={activeAsset} onSetAsset={onSetAsset} />} />
          <Route path="/agentes"        element={<AgentsPage activeAsset={activeAsset} onSetAsset={onSetAsset} />} />
          <Route path="/dashboard"      element={<Navigate to="/" replace />} />
          <Route path="/dashboard_sono" element={<Navigate to="/" replace />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
