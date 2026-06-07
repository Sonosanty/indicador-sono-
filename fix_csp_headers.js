node -e "
const fs = require('fs');
const content = `/*
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443 https://api.alternative.me https://api.coingecko.com https://vix-proxy.sonosanty.workers.dev; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'self'

/js/*
  Cache-Control: no-cache, no-store, must-revalidate

/css/*
  Cache-Control: no-cache, no-store, must-revalidate

/trades.json
  Cache-Control: no-cache, no-store, must-revalidate
  Content-Type: application/json; charset=utf-8
`;
fs.writeFileSync('indicador_cloudflare/_headers', content, 'utf8');
console.log('_headers actualizado:', fs.statSync('indicador_cloudflare/_headers').size, 'bytes');
console.log('script-src unsafe-inline:', content.includes(\"'unsafe-inline'\"));
"