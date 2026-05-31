const fs = require('fs');
const pages = ['index.html', 'rangos.html', 'trades.html', 'metodo.html'];
const navs = {
  'index.html': [
    '      <div class="nav-links">',
    '        <a href="/" class="nav-link active">📊 <span class="nav-text">Dashboard</span></a>',
    '        <a href="/rangos.html" class="nav-link">🎯 <span class="nav-text">Rangos</span></a>',
    '        <a href="/metodo.html" class="nav-link">📐 <span class="nav-text">Metodo</span></a>',
    '        <a href="/trades.html" class="nav-link">📝 <span class="nav-text">Trades</span></a>',
    '      </div>'
  ].join('\n'),
  'rangos.html': [
    '      <div class="nav-links">',
    '        <a href="/" class="nav-link">📊 <span class="nav-text">Dashboard</span></a>',
    '        <a href="/rangos.html" class="nav-link active">🎯 <span class="nav-text">Rangos</span></a>',
    '        <a href="/metodo.html" class="nav-link">📐 <span class="nav-text">Metodo</span></a>',
    '        <a href="/trades.html" class="nav-link">📝 <span class="nav-text">Trades</span></a>',
    '      </div>'
  ].join('\n'),
  'trades.html': [
    '      <div class="nav-links">',
    '        <a href="/" class="nav-link">📊 <span class="nav-text">Dashboard</span></a>',
    '        <a href="/rangos.html" class="nav-link">🎯 <span class="nav-text">Rangos</span></a>',
    '        <a href="/metodo.html" class="nav-link">📐 <span class="nav-text">Metodo</span></a>',
    '        <a href="/trades.html" class="nav-link active">📝 <span class="nav-text">Trades</span></a>',
    '      </div>'
  ].join('\n'),
  'metodo.html': [
    '    <nav class="top-nav">',
    '      <a href="/" class="nav-link">📊 Dashboard</a>',
    '      <a href="/rangos.html" class="nav-link">🎯 Rangos</a>',
    '      <a href="/metodo.html" class="nav-link active">📐 Metodo</a>',
    '      <a href="/trades.html" class="nav-link">📝 Trades</a>',
    '    </nav>'
  ].join('\n')
};

pages.forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  let pattern;
  if (p === 'metodo.html') {
    pattern = /<nav class="top-nav">[\s\S]*?<\/nav>/;
  } else {
    pattern = /<div class="nav-links">[\s\S]*?<\/div>/;
  }
  if (pattern.test(content)) {
    content = content.replace(pattern, navs[p]);
    fs.writeFileSync(p, content, 'utf8');
    console.log('OK ' + p);
  } else {
    console.log('NO match in ' + p);
  }
});
