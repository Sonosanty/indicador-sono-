const fs = require('fs');

const withAjram = fs.readFileSync('C:/Users/sparreno/AppData/Local/Temp/html_with_ajram.html', 'utf8');
const cleanHtml = fs.readFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html', 'utf8');

// Find the AJRAM section - it starts with a comment about AJRAM and ends right before page-rangos
const ajramSectionStart = withAjram.indexOf('<!--');
// Actually, find where contenido-met ends and ajram begins
const pageMetodoClose = withAjram.indexOf('</div><!-- /page-metodo');
const pageRangosOpen = withAjram.indexOf('id="page-rangos"');

if (pageMetodoClose < 0 || pageRangosOpen < 0) {
  console.log('Could not find page boundaries');
  console.log('pageMetodoClose:', pageMetodoClose);
  console.log('pageRangosOpen:', pageRangosOpen);
  process.exit(1);
}

// Everything between /page-metodo and page-rangos is the AJRAM section
const ajramSection = withAjram.substring(pageMetodoClose, pageRangosOpen - 10); // go back to div
console.log('AJRAM section length:', ajramSection.length);
console.log('---START---');
console.log(ajramSection.substring(0, 80));
console.log('...');
console.log(ajramSection.substring(ajramSection.length - 80));
console.log('---END---');

// Now find the insertion point in clean HTML
const cleanMetodoClose = cleanHtml.indexOf('<!-- /page-metodo -->');
const cleanRangosOpen = cleanHtml.indexOf('id="page-rangos"');

console.log('\nClean HTML:');
console.log('  /page-metodo at:', cleanMetodoClose);
console.log('  page-rangos at:', cleanRangosOpen);

if (cleanMetodoClose < 0) {
  console.log('Cannot find insertion point in clean HTML');
  process.exit(1);
}

// Insert the AJRAM section between /page-metodo and page-rangos
const insertPoint = cleanMetodoClose + 22; // after the closing div
const newHtml = cleanHtml.substring(0, insertPoint) + '\n\n' + ajramSection + '\n\n' + cleanHtml.substring(insertPoint);

fs.writeFileSync('C:/Users/sparreno/.openclaw/workspace/indicador_cloudflare/index.html', newHtml, 'utf8');
console.log('\n✅ AJRAM inserted into clean HTML');
console.log('New size:', newHtml.length, 'bytes');

// Verify AJRAM is present
if (newHtml.includes('ajram-card')) {
  console.log('✅ ajram-card CSS class found');
  console.log('✅ ajram-signal-hero:', newHtml.includes('ajram-signal-hero'));
  console.log('✅ ajram-calc-btn:', newHtml.includes('ajram-calc-btn'));
}
