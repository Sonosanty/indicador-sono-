import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-metodo-html',
      closeBundle() {
        const src = path.resolve('metodo.html')
        const dstDir = path.resolve('..', 'indicador_cloudflare', 'metodo')
        const dst = path.join(dstDir, 'index.html')
        fs.mkdirSync(dstDir, { recursive: true })
        fs.copyFileSync(src, dst)
        console.log('[copy-metodo-html] Copiado a ' + dst)
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
        }
      }
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true
  }
})
