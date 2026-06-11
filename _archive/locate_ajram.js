const fs = require('fs');
const h = fs.readFileSync('C:/Users/sparreno/AppData/Local/Temp/html_with_ajram.html', 'utf8');

const idx = h.indexOf('ajram-card');
if (idx >= 0) {
  console.log('ajram-card found at offset:', idx);
  console.log('Context (100 before, 200 after):');
  console.log(h.substring(Math.max(0, idx - 100), idx + 200));
  console.log('---');
  // What page is this inside?
  const before = h.substring(Math.max(0, idx - 2000), idx);
  const pageMatch = before.match(/PÁGINA: (\w+)/g);
  if (pageMatch) console.log('Inside page:', pageMatch);
  const divMatch = before.match(/id="page-(\w+)"/);
  if (divMatch) console.log('Inside page div:', divMatch[1]);
} else {
  console.log('ajram-card not found in HTML');
  // Search for any ajram reference
  const allMatches = h.match(/ajram/g);
  console.log('Total ajram references:', allMatches ? allMatches.length : 0);
}
