import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MacroPage  from './pages/MacroPage.jsx'
import TradesPage from './pages/TradesPage.jsx'
import RangesPage from './pages/RangesPage.jsx'
import MetodoPage from './pages/MetodoPage.jsx'
import AgentsPage from './pages/AgentsPage.jsx'

import { useState } from 'react'

export default function App() {
  const [activeAsset, setActiveAsset] = useState('BTC')
  const onSetAsset = (asset) => { if (asset) setActiveAsset(asset) }

  return (
    <HashRouter>
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
    </HashRouter>
  )
}
