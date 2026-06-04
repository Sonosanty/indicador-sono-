const fs = require('fs');
const code = fs.readFileSync('frontend/app.js', 'utf8');
const len = code.length;
let lastLineStart = 0;
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('var') && line.includes('=')) {
    // check for double var
    const varCount = (line.match(/\bvar\b/g) || []).length;
    if (varCount > 1) {
      console.log('DOUBLE VAR at line ' + (i+1) + ': ' + line.substring(0, 120));
    }
  }
}

// Try to parse
try {
  new Function(code);
  console.log('OK: No syntax errors');
} catch(e) {
  console.log('SYNTAX ERROR: ' + e.message);
  const line = e.lineNumber || 1;
  console.log('At line: ' + line);
  if (line > 0 && line <= lines.length) {
    console.log('Context:');
    for (let i = Math.max(0, line - 3); i < Math.min(lines.length, line + 2); i++) {
      console.log('L' + (i+1) + ': ' + lines[i]);
    }
  }
}

// Also check for common issues
const doubleCommas = (code.match(/,/g) || []).length;
const openBrackets = (code.match(/\{/g) || []).length;
const closeBrackets = (code.match(/\}/g) || []).length;
console.log('Length: ' + len + ', lines: ' + lines.length + ', {}: ' + openBrackets + '/' + closeBrackets);
