const fs = require('fs');

// Read the clean JS (commit 7abc62e)
const cleanJS = 'C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/js/stx-core.js';
const js = fs.readFileSync(cleanJS, 'utf8');

// Extract the Ajram JS code from the ajram patch file
const patchContent = fs.readFileSync('C:/Users/sparreno/.openclaw/media/inbound/patch-ajram---5ca53513-c53a-44f0-a2d9-801b4ee56bf3.js', 'utf8');

// Find the AJRAM_JS constant and extract it
const ajramStart = patchContent.indexOf("const AJRAM_JS = `");
const ajramEnd = patchContent.indexOf("`;", ajramStart) + 1; // include ;
if (ajramStart < 0) { console.log('AJRAM_JS not found'); process.exit(1); }

let ajramCode = patchContent.substring(ajramStart + 17, ajramEnd - 1);
// Remove leading/trailing newlines
ajramCode = ajramCode.replace(/^\n+/, '').replace(/\n+$/, '');

console.log('Ajram JS code length:', ajramCode.length, 'bytes');

// Verify it contains the functions
console.log('Has initAjram:', ajramCode.includes('function initAjram'));
console.log('Has updateAjram:', ajramCode.includes('updateAjram'));
console.log('Has setSignal:', ajramCode.includes('setSignal'));
console.log('Has setEstStatus:', ajramCode.includes('setEstStatus'));

// Insert the AJRAM code into the clean JS
// Insert before the IIFE init
const insertPoint = js.indexOf('(async function init()');
if (insertPoint < 0) { console.log('init() not found'); process.exit(1); }

const newJs = js.substring(0, insertPoint) + '\n\n' + ajramCode + '\n\n' + js.substring(insertPoint);

// Now add initAjram() call inside init() after the event listeners
// Find the popstate line and add initAjram call after it
const fixedJs = newJs.replace(
  "window.addEventListener('popstate',e=>{if(e.state?.page) showPage(e.state.page);});",
  "window.addEventListener('popstate',e=>{if(e.state?.page) showPage(e.state.page);});\n  initAjram();"
);

// Add window.lastScore exposure in renderScore
const withScore = fixedJs.replace(
  'lastSC   = sc;',
  'lastSC   = sc;\n  window.lastScore = sc;'
);

// Verify
fs.writeFileSync(cleanJS, withScore, 'utf8');
try {
  require('child_process').execSync('node --check "' + cleanJS + '" 2>&1', { stdio: 'pipe', shell: true });
  console.log('✅ Syntax OK');
  console.log('Final size:', withScore.length, 'bytes');
  console.log('Has initAjram:', withScore.includes('initAjram'));
  console.log('Has window.lastScore:', withScore.includes('window.lastScore'));
  console.log('Has updateAjram:', withScore.includes('updateAjram'));
} catch(e) {
  console.log('❌ Syntax error');
  const err = e.stderr?.toString() || e.message;
  const m = err.match(/stx-core\.js:(\d+)/);
  if (m) {
    const l = parseInt(m[1]);
    const lines = withScore.split('\n');
    console.log(`Around line ${l}:`);
    for (let i = Math.max(0, l-3); i < Math.min(lines.length, l+3); i++) {
      console.log(`${i+1}: ${lines[i].substring(0, 100)}`);
    }
  }
}
