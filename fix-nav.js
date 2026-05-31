const fs = require('fs');
const pages = ['index.html', 'rangos.html', 'trades.html'];
const navBlock = [
  '      <div class="nav-links">',
  '        <a href="/" class="nav-link active">📊 <span class="nav-text">Dashboard</span></a>',
  '        <a href="/rangos.html" class="nav-link">🎯 <span class="nav-text">Rangos</span></a>',
  '        <a href="/metodo.html" class="nav-link">📐 <span class="nav-text">Metodo</span></a>',
  '        <a href="/trades.html" class="nav-link">📝 <span class="nav-text">Trades</span></a>',
  '      </div>'
].join('\n');

pages.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  const navRegex = /<div class="nav-links">[\s\S]*?<\/div>/;
  if (navRegex.test(content)) {
    content = content.replace(navRegex, navBlock);
    fs.writeFileSync(p, content, 'utf8');
    console.log('OK ' + p);
  } else {
    console.log('NO nav-links in ' + p);
  }
});

// Verify
const idx = fs.readFileSync('index.html', 'utf8');
const navMatch = idx.match(/<div class="nav-links">[\s\S]*?<\/div>/);
if (navMatch) {
  console.log('Nav OK: ' + navMatch[0].replace(/\n/g, ' | ').substring(0, 200));
}
