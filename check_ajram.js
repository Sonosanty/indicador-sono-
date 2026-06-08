const fs = require('fs');
const h = fs.readFileSync(
  'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html', 'utf8'
);
const s = h.indexOf('id="page-metodo"');
const e = h.indexOf('id="page-rangos"');
const sec = h.substring(s, e);
console.log('Largo:', sec.length);
console.log('Contiene ajram-signal-hero:', sec.includes('ajram-signal-hero'));
console.log('Contiene 8 est-card:', (sec.match(/est-card/g) || []).length);
console.log('Contiene calc-btn:', sec.includes('ajram-calc-btn'));
console.log('Contiene rules-list:', (sec.match(/rules-list/g) || []).length);
console.log('Contiene initAjram en JS:',
  fs.readFileSync(
    'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js', 'utf8'
  ).includes('initAjram()')
);
