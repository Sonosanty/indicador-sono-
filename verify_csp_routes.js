const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, headers: r.headers, data: d }));
    }).on('error', rej);
  });
}

(async () => {
  console.log('=== VERIFICACION CSP + ROUTES ===\n');

  const root = await fetch('https://indicador-sono.pages.dev/');
  const csp = root.headers['content-security-policy'] || '';
  console.log('1. CSP header:');
  console.log('   script-src unsafe-inline:', csp.includes("unsafe-inline"));
  console.log('   connect-src vix-proxy:', csp.includes('vix-proxy'));
  console.log('   connect-src open.er-api:', csp.includes('open.er-api'));
  console.log('   X-Frame-Options:', root.headers['x-frame-options']);

  const routes = await fetch('https://indicador-sono.pages.dev/_routes.json');
  console.log('\n2. _routes.json:');
  console.log('   status:', routes.status);
  console.log('   startsWith:', routes.data.substring(0, 30));
  console.log('   size:', routes.data.length, 'bytes');

  const fav = await fetch('https://indicador-sono.pages.dev/favicon.svg');
  console.log('\n3. favicon.svg:');
  console.log('   status:', fav.status);
  console.log('   size:', fav.data.length, 'bytes');

  const trades = await fetch('https://indicador-sono.pages.dev/trades/');
  console.log('\n4. Rutas SPA:');
  console.log('   /trades/ size:', trades.data.length, 'bytes');
  console.log('   contiene stx-core.js:', trades.data.includes('stx-core.js'));
  console.log('   contiene pushState:', trades.data.includes('pushState'));

  const metodo = await fetch('https://indicador-sono.pages.dev/metodo/');
  console.log('   /metodo/ size:', metodo.data.length, 'bytes');

  console.log('\n5. Router inline en HTML:');
  const inlineScripts = root.data.match(/<script>[\s\S]*?<\/script>/g);
  if (inlineScripts) {
    const withRouter = inlineScripts.filter(s => s.includes('pushState'));
    console.log('   Scripts con pushState:', withRouter.length);
    if (withRouter.length > 0) console.log('   Router inline presente ✅');
  }

  console.log('\n==========================================');
})();
