const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/stx-core.js', 'utf8');
const css = fs.readFileSync('css/stx-theme.css', 'utf8');

const reCSS = new RegExp('<link rel="stylesheet" href="css/stx-theme.css">', 'g');
const reJS = new RegExp('<script src="js/stx-core.js"></script>', 'g');

let result = html.replace(reCSS, '<style>\n' + css + '\n</style>');
result = result.replace(reJS, '<script>\n' + js + '\n</script>');

fs.writeFileSync('index.html', result, 'utf8');
const sz = fs.statSync('index.html').size;
console.log('Size:', sz, 'bytes');

const chk = fs.readFileSync('index.html', 'utf8');
console.log('startWS:', chk.includes('function startWS'));
console.log('--bg:', chk.includes('--bg:#060d18'));
console.log('Chart.js CDN:', chk.includes('cdn.jsdelivr.net'));
console.log('CFG:', chk.includes('const CFG'));
