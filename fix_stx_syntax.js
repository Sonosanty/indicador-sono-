const fs = require('fs');
const path = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js';
let js = fs.readFileSync(path, 'utf8');

// Fix 1: Restore dollar signs mangled by patch
// Pattern: Number.isFinite(n) ? ' /* patched */ {
// Should be: Number.isFinite(n) ? '$' +
js = js.replace(
  /Number\.isFinite\(n\) \? ' \/\* patched \*\/ \{/g,
  "Number.isFinite(n) ? '$' +"
);

// Fix 2: Remove any remaining /* patched */ artifacts
js = js.replace(/ \/\* patched \*\//g, '');
js = js.replace(/\n\s*\{\s*console\.log\('\[STX\] init\(\) arrancando\.\.\.'\);/g, '\n  console.log(\'[STX] init() arrancando...\');');

// Fix 3: Ensure initAjram() is called inside init()
// Find the real init function start
if (!js.includes('initAjram()')) {
  // Insert AFTER the addEventListener block in init()
  js = js.replace(
    "window.addEventListener('popstate',e=>{if(e.state?.page) showPage(e.state.page);});",
    "window.addEventListener('popstate',e=>{if(e.state?.page) showPage(e.state.page);});\n  initAjram();"
  );
}

// Fix 4: Show current page on load based on URL hash or path
// Already handled by popstate

fs.writeFileSync(path, js, 'utf8');
console.log('Patches aplicados');

// Verify
try {
  require('child_process').execSync('node --check "' + path + '" 2>&1', { stdio: 'pipe', shell: true });
  console.log('✅ Syntax OK');
} catch(e) {
  console.log('❌ Syntax error:', e.stderr?.toString().split('\n')[0] || e.message);
  // Show the problematic area
  const match = e.stderr?.toString().match(/C:\\[^:]+:\d+/);
  if (match) {
    const lineNum = parseInt(match[0].split(':').pop());
    const lines = js.split('\n');
    console.log(`Around line ${lineNum}:`);
    for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
}
