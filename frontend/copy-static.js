const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..');
const dst = path.join(__dirname, 'build');
if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });

// Files to copy
const files = [
  'index.html', 'sono-terminal.js', 'style.css', '_headers', '_routes.json',
  'favicon.svg', 'icons.svg', 'pagina.html', 'range_explorer.html',
  'trades_explorer.html', 'redirect-metodo.html', 'wrangler.toml'
];
const dirs = ['v2', 'metodo', 'assets', 'scripts'];

files.forEach(f => {
  const fp = path.join(src, f);
  if (fs.existsSync(fp)) fs.copyFileSync(fp, path.join(dst, f));
});
dirs.forEach(d => {
  const dp = path.join(src, d);
  if (fs.existsSync(dp)) {
    const dd = path.join(dst, d);
    if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
    const entries = fs.readdirSync(dp, { withFileTypes: true });
    entries.forEach(e => {
      if (e.isFile()) fs.copyFileSync(path.join(dp, e.name), path.join(dd, e.name));
    });
  }
});
console.log('Static files copied to build/');
