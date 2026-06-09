#!/bin/bash
# =============================================================
# SONO PRO — build.sh
# Fuente de verdad única para Cloudflare Pages
# Build command en CF Pages: bash build.sh
# Build output directory: dist
# =============================================================

set -e # Parar inmediatamente si cualquier comando falla

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║ SONO PRO — BUILD INICIADO                ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── PASO 1: Limpiar y crear carpeta dist ────────────────────
echo "▶ Paso 1/5 — Limpiando dist/..."
rm -rf dist
mkdir -p dist/js
echo " ✓ dist/ creada limpia"

# ─── PASO 2: Verificar que existen los archivos CRÍTICOS ─────
echo ""
echo "▶ Paso 2/5 — Verificando archivos críticos..."

ARCHIVOS_CRITICOS=(
 "indicador_cloudflare/index.html"
 "indicador_cloudflare/js/stx-core.js"
 "indicador_cloudflare/trades.json"
)

for archivo in "${ARCHIVOS_CRITICOS[@]}"; do
 if [ ! -f "$archivo" ]; then
 echo " ✗ ERROR CRÍTICO: No existe $archivo"
 echo " → Deploy cancelado. Sube el archivo que falta a GitHub."
 exit 1
 else
 size=$(wc -c < "$archivo")
 echo " ✓ $archivo ($size bytes)"
 fi
done

# ─── PASO 3: Validaciones de contenido ───────────────────────
echo ""
echo "▶ Paso 3/5 — Validando contenido..."

# index.html debe referenciar stx-core.js
if ! grep -q "stx-core.js" "indicador_cloudflare/index.html"; then
 echo " ✗ ERROR: index.html NO carga stx-core.js"
 echo " → Revisa que index.html tenga: <script src=\"js/stx-core.js\">"
 exit 1
fi
echo " ✓ index.html referencia stx-core.js"

# stx-core.js no debe estar vacío (mínimo 5000 bytes)
STX_SIZE=$(wc -c < "indicador_cloudflare/js/stx-core.js")
if [ "$STX_SIZE" -lt 5000 ]; then
 echo " ✗ ERROR: stx-core.js tiene solo $STX_SIZE bytes — parece vacío o truncado"
 echo " → El archivo correcto debe tener mínimo 20KB"
 exit 1
fi
echo " ✓ stx-core.js tiene $STX_SIZE bytes (OK)"

# trades.json debe ser JSON válido
if command -v node &>/dev/null; then
 if ! node -e "JSON.parse(require('fs').readFileSync('indicador_cloudflare/trades.json','utf8'))" 2>/dev/null; then
 echo " ✗ ERROR: trades.json tiene JSON inválido"
 exit 1
 fi
 echo " ✓ trades.json es JSON válido"
else
 echo " ⚠ Node.js no disponible — saltando validación JSON"
fi

# ─── PASO 4: Copiar archivos a dist/ ─────────────────────────
echo ""
echo "▶ Paso 4/5 — Copiando archivos a dist/..."

# Archivos obligatorios
cp "indicador_cloudflare/index.html" dist/
cp "indicador_cloudflare/js/stx-core.js" dist/js/
cp "indicador_cloudflare/trades.json" dist/

# Páginas adicionales (si existen)
PAGINAS=("rangos.html" "trades.html" "metodo.html")
for pagina in "${PAGINAS[@]}"; do
 if [ -f "indicador_cloudflare/$pagina" ]; then
 cp "indicador_cloudflare/$pagina" dist/
 echo " ✓ $pagina copiado"
 fi
done

# Archivos de configuración CF (obligatorios para seguridad y routing)
CONFIG=("_headers" "_routes.json" "favicon.ico" "favicon.svg")
for cfg in "${CONFIG[@]}"; do
 if [ -f "indicador_cloudflare/$cfg" ]; then
 cp "indicador_cloudflare/$cfg" dist/
 echo " ✓ $cfg copiado"
 fi
done

# JS adicionales si existen
if ls indicador_cloudflare/js/*.js &>/dev/null 2>&1; then
 cp indicador_cloudflare/js/*.js dist/js/
 echo " ✓ Todos los .js copiados a dist/js/"
fi

# ─── PASO 5: Verificación final ──────────────────────────────
echo ""
echo "▶ Paso 5/5 — Verificación final de dist/..."

if [ ! -f "dist/index.html" ]; then
 echo " ✗ ERROR: dist/index.html no existe después de copiar — algo falló"
 exit 1
fi

if [ ! -f "dist/js/stx-core.js" ]; then
 echo " ✗ ERROR: dist/js/stx-core.js no existe después de copiar"
 exit 1
fi

echo ""
echo " Contenido de dist/:"
find dist/ -type f | sort | while read f; do
 size=$(wc -c < "$f")
 printf " %-45s %s bytes\n" "$f" "$size"
done

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║ BUILD COMPLETADO — dist/ OK ✓            ║"
echo "║ Cloudflare desplegará solo dist/         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
