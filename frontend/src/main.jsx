import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './AppRouter.jsx'
import './styles/theme.css'

// Forzar CSP dinámico: añade dominios que Cloudflare Pages bloquea por defecto
;(function injectCSP() {
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://query1.finance.yahoo.com https://api.exchangerate-api.com https://vix-proxy.sonosanty.workers.dev; img-src 'self' data: https:; frame-ancestors 'none';"
  document.head.prepend(meta)
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)
