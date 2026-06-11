const fs = require('fs');
const jsPath = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Clean up patch artifacts
js = js.replace(/ \/\* patched \*\//g, '');
// Remove extra console logs in init (keep the first one)
// Fix any remaining broken lines

// Find the initAjram and related code from the version that had it
// Actually, we need to ADD initAjram to THIS clean version.
// First, let's see what initAjram looks like by extracting from the broken version

const brokenJs = fs.readFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js.broken', 'utf8');
// jk, that doesn't exist. Let me read the actual backup file.

console.log('Cleanup applied');
console.log('Has initAjram:', js.includes('initAjram'));

// Verify syntax
try {
  require('child_process').execSync('node --check "' + jsPath + '" 2>&1', { stdio: 'pipe', shell: true });
  console.log('Syntax OK');
} catch(e) {
  console.log('Syntax error');
}
