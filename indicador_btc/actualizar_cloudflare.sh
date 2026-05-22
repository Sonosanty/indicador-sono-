#!/bin/bash
# ============================================================================
# ACTUALIZAR_CLOUDFLARE.SH (INDICADOR_BTC AUTOMATION FOR CLOUDFLARE PAGES)
# Script bash para automatizar la ejecucion del procesador cada 30 min
# y desplegar en Cloudflare Pages
# ============================================================================

echo "[CLOUDFLARE] Iniciando actualizador automatico para Cloudflare Pages..."
base_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$base_dir"

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ejecutando consolidacion de base de datos..."
    python3 process_indicador_data.py
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copiando datos consolidados a la carpeta de Cloudflare..."
    cp -f indicador_data.json ../indicador_cloudflare/indicador_data.json
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Realizando despliegue automatico a Cloudflare Pages..."
    npx wrangler pages deploy "../indicador_cloudflare" --project-name="indicador-sono"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Despliegue completado con exito. Siguiente ejecucion en 30 minutos (1800s)..."
    sleep 1800
done
