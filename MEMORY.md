# MEMORIA - Ultrafino.com

## El negocio
- **Tienda**: ultrafino.com (Shopify, tema Turbo v9.3.0)
- **Blog**: blog.ultrafino.com (WordPress, subdominio)
- **Producto**: Sombreros Panama Montecristi autenticos, tejidos a mano en Ecuador
- **Posicionamiento**: DTC premium, cada sombrero toma 20+ horas de tejido manual
- **Mercado principal**: USA (ingles)
- **Meta**: escalar a + ARR
- **Canal secundario**: Amazon FBA

## Estado SEO (mayo 2026)
- Ranking "panama hat": colapsado de #1 a posicion ~11.8 (2024-2026)
- La pagina de REPARACION genera mas trafico que las paginas de compra
- Plan editorial: 30 articulos hasta noviembre 2026
- Competidores: Gamboa Fashion, Borsalino, Brent Black, PanamaHatsCo

## Stack tecnico
- Shopify: snippets uf-* (10+ creados), ZIPs versionados hasta v6.2
- Blog WordPress en subdominio (impacta autoridad SEO)
- Datos en: GSC, SEMrush, Excel, Word, PDFs de reportes

## Propietario
- Nombre: Santy
- Ubicacion: Madrid, Espana (con conexion a Quito, Ecuador)
- Idioma preferido: espanol

## Proyecto Indicador Cripto y Trading (Fino BTC / Sono)
- **Web App**: https://indicador-sono.pages.dev/ (Landing Principal en Cloudflare Pages)
- **Dashboard Sono**: https://indicador-sono.pages.dev/dashboard_sono.html (Panel Técnico Multimoneda)
- **Monedas soportadas**: BTC, ETH, SOL, XRP.
- **Estrategia**: Híbrida (Método Sono), combinando confluencias técnicas (RSI, Bollinger, medias móviles 1H/1D), Google Trends, VIX y Fear & Greed.
- **Automatización**: Ejecución de procesador técnico (`process_indicador_data.py`) que enriquece los datos en tiempo real y se conecta de forma segura a Pionex API para extraer saldos en vivo de la cuenta.
- **Despliegue**: Sincronizado automáticamente hacia la carpeta de distribución de Cloudflare (`indicador_cloudflare/`) y subido a producción a través de Wrangler CLI.
- **Credenciales**: Guardadas localmente en `pionex_credentials.json` en la raíz del workspace para interactuar con la API oficial mediante la librería `pionex_python`.