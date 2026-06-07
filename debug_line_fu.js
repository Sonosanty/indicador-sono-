const fs = require('fs');
const p = 'C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare\\index.html';
const html = fs.readFileSync(p, 'utf8');

const lines = html.split('\n');
for (let i = 548; i < 560; i++) {
  if (lines[i] && lines[i].includes('fU')) {
    console.log('L' + i + ' (' + lines[i].length + ' bytes):');
    const l = lines[i];
    for (let j = 0; j < l.length; j++) {
      const code = l.charCodeAt(j);
      if (code > 127 || code === 39 || code === 34 || code === 36) {
        process.stdout.write('[' + code + ':' + l[j] + ']');
      } else {
        process.stdout.write(l[j]);
      }
    }
    console.log();
  }
}
