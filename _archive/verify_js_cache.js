const https = require('https');

https.get('https://indicador-sono.pages.dev/', { headers: { 'Cache-Control': 'no-cache' } }, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('HTML size:', d.length);
    console.log('Ref stx-core.js:', d.includes('js/stx-core.js'));
    const srcMatch = d.match(/<script[^>]*src="([^"]*stx-core[^"]*)"/);
    if (srcMatch) console.log('Script src:', srcMatch[1]);
  });
});

https.get('https://indicador-sono.pages.dev/js/stx-core.js', { headers: { 'Cache-Control': 'no-cache' } }, r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('\nstx-core.js served:', d.length, 'bytes');
    // Find the key part
    const idx = d.indexOf('parseFloat(t.r||t.r_actual)');
    if (idx >= 0) {
      console.log('r_actual parche found in served JS!');
      console.log('Context:', d.substring(Math.max(0, idx - 40), idx + 50));
    }
    // Check if renderTrades uses the patched line
    if (d.includes('t.r||t.r_actual')) {
      console.log('t.r||t.r_actual confirmed in served JS');
    }
  });
});
