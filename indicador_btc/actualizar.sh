#!/bin/bash
# ============================================================================
# ACTUALIZAR.SH (INDICADOR_BTC AUTOMATION)
# Script bash para automatizar la ejecucion del procesador de datos cada 10 min
# ============================================================================

echo "[AUTOMATION] Iniciando actualizador automatico..."
base_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$base_dir"

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ejecutando consolidacion de base de datos..."
    python3 process_indicador_data.py
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copiando datos consolidados a la carpeta de Netlify..."
    cp -f indicador_data.json ../indicador_netlify/indicador_data.json
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Realizando despliegue automatico a Netlify..."
    netlify deploy --dir="../indicador_netlify" --prod
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Despliegue completado con exito. Siguiente ejecucion en 30 minutos (1800s)..."
    sleep 1800
done
