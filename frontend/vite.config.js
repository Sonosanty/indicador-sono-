import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'post-build',
      closeBundle() {
        const outDir = path.resolve('..', 'indicador_cloudflare')
        
        // 1. Copiar pagina.html (v2 dashboard) → /v2/index.html
        const srcV2 = path.resolve('pagina.html')
        if (fs.existsSync(srcV2)) {
          const dstV2 = path.join(outDir, 'v2', 'index.html')
          fs.mkdirSync(path.dirname(dstV2), { recursive: true })
          fs.copyFileSync(srcV2, dstV2)
          console.log('[post-build] pagina.html (v2) copiado a /v2/')
        }

        // 2. Copiar metodo.html → metodo/index.html y /v2/metodo/
        const srcM = path.resolve('metodo.html')
        if (fs.existsSync(srcM)) {
          const dstM = path.join(outDir, 'metodo', 'index.html')
          fs.mkdirSync(path.dirname(dstM), { recursive: true })
          fs.copyFileSync(srcM, dstM)
          console.log('[post-build] metodo.html copiado a /metodo/')
          
          const dstV2M = path.join(outDir, 'v2', 'metodo', 'index.html')
          fs.mkdirSync(path.dirname(dstV2M), { recursive: true })
          fs.copyFileSync(srcM, dstV2M)
          console.log('[post-build] metodo.html copiado a /v2/metodo/')
        }

        // 3. Copiar _routes.json para que Cloudflare sirva /metodo y /v2 como estático
        const routesSrc = path.resolve('_routes.json')
        const routesDst = path.join(outDir, '_routes.json')
        if (fs.existsSync(routesSrc)) {
          fs.copyFileSync(routesSrc, routesDst)
          console.log('[post-build] _routes.json copiado')
        }

        // 4. Leer el index.html generado por Vite para extraer los hashes de assets
        const generatedHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8')
        
        // Extraer los src/href de assets
        const scriptMatch = generatedHtml.match(/<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/)
        const cssMatch = generatedHtml.match(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+)">/)
        const preloads = [...generatedHtml.matchAll(/<link rel="modulepreload"[^>]+href="(\/assets\/[^"]+)">/g)].map(m => m[1])
        const mainScript = scriptMatch ? scriptMatch[1] : '/assets/index.js'
        const mainCss = cssMatch ? cssMatch[1] : ''

        // 5. Escribir index.html con title correcto y CSP completo
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Indicador Sono PRO — Contexto · Trades · Rangos</title>
  <meta name="description" content="Plataforma de análisis cuantitativo: contexto macro, auditoría de trades y radar multi-timeframe." />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="theme-color" content="#0a1428" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://api.binance.com wss://stream.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://vix-proxy.sonosanty.workers.dev https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none';" />
  <link rel="preconnect" href="https://stream.binance.com" crossorigin />
  <link rel="dns-prefetch" href="https://api.coingecko.com" />
  <link rel="dns-prefetch" href="https://api.alternative.me" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ${preloads.map(href => `  <link rel="modulepreload" crossorigin href="${href}">`).join('\n')}
  ${mainCss ? `  <link rel="stylesheet" crossorigin href="${mainCss}">` : ''}
  <script type="module" crossorigin src="${mainScript}"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`

        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
        console.log('[post-build] index.html reescrito con CSP + title correcto')
      }
    }
  ],
  build: {
    outDir: '../indicador_cloudflare',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          if (id.includes('/pages/TradesPage')) return 'trades'
          if (id.includes('/pages/RangesPage'))  return 'rangos'
          if (id.includes('/pages/MetodoPage'))  return 'metodo'
          if (id.includes('/pages/AgentsPage'))  return 'agentes'
          if (id.includes('node_modules/chart.js')) return 'chart-vendor'
          if (id.includes('node_modules/recharts')) return 'recharts-vendor'
        }
      }
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true
  }
})

