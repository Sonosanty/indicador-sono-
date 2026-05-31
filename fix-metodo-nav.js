const fs = require('fs');
let content = fs.readFileSync('metodo.html', 'utf8');
const navBlock = 
`    <nav class="top-nav">
      <a href="/" class="nav-link">📊 Dashboard</a>
      <a href="/rangos.html" class="nav-link">🎯 Rangos</a>
      <a href="/metodo.html" class="nav-link active">📐 Metodo</a>
      <a href="/trades.html" class="nav-link">📝 Trades</a>
    </nav>`;
const navRegex = /<nav class="top-nav">[\s\S]*?<\/nav>/;
if (navRegex.test(content)) {
  content = content.replace(navRegex, navBlock);
  fs.writeFileSync('metodo.html', content, 'utf8');
  console.log('OK metodo.html');
} else {
  console.log('NO nav found');
  // Print what's there
  const match = content.match(/<nav[\s\S]*?<\/nav>/);
  if (match) console.log('Found: ' + match[0].substring(0,200));
}
