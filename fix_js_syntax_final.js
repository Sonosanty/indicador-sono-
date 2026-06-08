const fs = require('fs');
const path = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js';
let js = fs.readFileSync(path, 'utf8');

// Fix the broken dollar sign replacements from patch-stx + patch-ajram
// The patterns are:
// ' /* patched */ {  -> should be '$' + n...
// ' /* patched */ { .toFixed -> should be '$' + n.toFixed

// Find all instances and fix them
function fixDollarSign(line) {
  // Pattern: Number.isFinite(n) ? ' /* patched */ { 
  // Should be: Number.isFinite(n) ? '$' + 
  return line.replace(
    /Number\.isFinite\(n\) \? ' \/\* patched \*\/ \{/g,
    "Number.isFinite(n) ? '$' +"
  );
}

const lines = js.split('\n');
let fixed = 0;
const output = lines.map(line => {
  if (line.includes('/* patched */')) {
    const newLine = fixDollarSign(line);
    if (newLine !== line) fixed++;
    return newLine;
  }
  return line;
}).join('\n');

// Also remove any remaining orphan /* patched */ 
const cleaner = output.replace(/ \/\* patched \*\//g, '');

fs.writeFileSync(path, cleaner, 'utf8');
console.log('Fixed', fixed, 'lines with patched artifacts');

// Verify
try {
  require('child_process').execSync('node --check "' + path + '"', { stdio: 'pipe', shell: true });
  console.log('✅ Syntax OK');
} catch(e) {
  console.log('❌ Still broken');
  const err = e.stderr?.toString() || e.message;
  const m = err.match(/stx-core\.js:(\d+)/);
  if (m) {
    const l = parseInt(m[1]);
    const content = fs.readFileSync(path, 'utf8').split('\n');
    for (let i = Math.max(0, l-3); i < Math.min(content.length, l+3); i++) {
      console.log(`${i+1}: ${content[i].substring(0, 100)}`);
    }
  }
}
