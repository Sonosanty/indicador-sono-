// ═══════════════════════════════════════════════════════════════
// MacroPage.jsx — Wrapper mínimo que carga pagina.html v2
// El HTML plano hace sus propios fetch a Binance, CoinGecko, Alt.me
// ═══════════════════════════════════════════════════════════════
import { useEffect } from 'react'

export default function MacroPage() {
  useEffect(() => {
    // El HTML ya se sirve desde public/pagina.html vía index.html
    // Este wrapper existe solo para mantener compatibilidad con el router SPA
  }, [])

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {/* pagina.html se carga desde index.html que redirige a /pagina.html */}
    </div>
  )
}
