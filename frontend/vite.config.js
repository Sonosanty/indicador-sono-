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

        // 1. Copiar assets v3
        const assets = [
          { src: 'pagina.html', dst: 'index.html', label: 'Dashboard' },
          { src: 'range_explorer.html', dst: 'range_explorer.html', label: 'Rangos' },
          { src: 'trades_explorer.html', dst: 'trades_explorer.html', label: 'Trades' },
          { src: 'style.css', dst: 'style.css', label: 'Stylesheet' },
        ]
        assets.forEach(a => {
          const srcPath = path.resolve(a.src)
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, path.join(outDir, a.dst))
            console.log('[post-build] ' + a.label + ' -> /' + a.dst)
          }
        })

        // 1b. pagina.html -> /v2/index.html
        const srcPag = path.resolve('pagina.html')
        if (fs.existsSync(srcPag)) {
          const dstV2 = path.join(outDir, 'v2', 'index.html')
          fs.mkdirSync(path.dirname(dstV2), { recursive: true })
          fs.copyFileSync(srcPag, dstV2)
          console.log('[post-build] pagina.html -> /v2/')
        }

        // 2. metodo.html -> /metodo/index.html y /v2/metodo/index.html
        const srcM = path.resolve('metodo.html')
        if (fs.existsSync(srcM)) {
          const dstM = path.join(outDir, 'metodo', 'index.html')
          fs.mkdirSync(path.dirname(dstM), { recursive: true })
          fs.copyFileSync(srcM, dstM)
          const dstV2M = path.join(outDir, 'v2', 'metodo', 'index.html')
          fs.mkdirSync(path.dirname(dstV2M), { recursive: true })
          fs.copyFileSync(srcM, dstV2M)
          console.log('[post-build] metodo.html -> /metodo/ y /v2/metodo/')
        }

        // 3. _routes.json
        const routesSrc = path.resolve('_routes.json')
        if (fs.existsSync(routesSrc)) {
          fs.copyFileSync(routesSrc, path.join(outDir, '_routes.json'))
          console.log('[post-build] _routes.json copiado')
        }

        // 4. pagina.html es ya /index.html (sobrescribe SPA)
        if (fs.existsSync(srcPag)) {
          fs.copyFileSync(srcPag, path.join(outDir, 'index.html'))
          console.log('[post-build] pagina.html = /index.html (dashboard activo)')
        }

        console.log('[post-build] Completo. pagina.html es index.html con CSS/JS inline')
      }
    }
  ],
  build: {
    outDir: '../indicador_cloudflare',
    emptyOutDir: true
  }
})
