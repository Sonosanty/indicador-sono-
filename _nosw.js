const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');
// Remove SW registration block
h = h.replace(/<script>\s+if\s*\(['"]serviceWorker['"]\s+in\s+navigator\s*\)[\s\S]*?<\/script>\n?/g, '');
// Also remove the ?sw_bypass leftovers
h = h.replace(/\?\?/g, '?');
fs.writeFileSync('index.html', h, 'utf8');
console.log('OK size=' + h.length);
