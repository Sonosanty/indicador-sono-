const fs = require('fs');

function replaceAll(text, replacements) {
  let result = text;
  let total = 0;
  for (const [from, to] of replacements) {
    // Escape regex special chars
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    const count = (result.match(regex) || []).length;
    if (count > 0) {
      result = result.split(from).join(to);
      total += count;
    }
  }
  return { result, total };
}

// 1. stx-core.js
let js = fs.readFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js', 'utf8');
const jsReps = [
  ['updateAjramFromSONO', 'updateSonoFromScore'],
  ['initAjram()', 'initSonoModule()'],
  ['function initAjram', 'function initSonoModule'],
  ['AjramSignal', 'SonoSignal'],
  ['ajram-hero-sig', 'sono-hero-sig'],
  ['ajram-signal', 'sono-signal'],
  ['ajram', 'sono'],
  ['Ajram', 'Sono'],
  ['AJRAM', 'SONO'],
];
const jr = replaceAll(js, jsReps);
if (jr.total > 0) {
  fs.writeFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js', jr.result, 'utf8');
  console.log('stx-core.js: ' + jr.total + ' cambios');
}

// 2. index.html
let html = fs.readFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html', 'utf8');
const htmlReps = [
  ['ajram-hero-sig', 'sono-hero-sig'],
  ['ajram-', 'sono-'],
  ['ajram', 'sono'],
  ['Ajram', 'Sono'],
  ['AJRAM', 'SONO'],
];
const hr = replaceAll(html, htmlReps);
if (hr.total > 0) {
  fs.writeFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html', hr.result, 'utf8');
  console.log('index.html: ' + hr.total + ' cambios');
}

console.log('✅ Done');
