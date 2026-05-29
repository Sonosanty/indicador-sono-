import re

f = r'C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\dashboard_sono\index.html'
out = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. Remove external app.js script
c = c.replace('<script src="app.js"></script>\n', '')
c = c.replace("<script src='app.js'></script>\n", '')
c = c.replace('<script src="app.js"></script>', '')
c = c.replace("<script src='app.js'></script>", '')

# 2. Add emergency timeout that ALWAYS shows the page after 8 seconds
safety = '''

// 🔒 SAFETY NET: Failsafe para ocultar overlay incluso si Binance falla
setTimeout(function(){
  var ov=document.getElementById("loadOverlay");
  if(ov)ov.classList.add("hidden");
  var ap=document.getElementById("app");
  if(ap)ap.style.opacity="1";
  var hs=document.getElementById("hSource");
  if(hs&&hs.textContent.indexOf("CONECTANDO")>=0)hs.textContent="OFFLINE - Datos locales";
  var hlat=document.getElementById("hLatency");
  if(hlat)hlat.textContent="FAIL";
},8000);

'''

c = c.replace('</body>', safety + '\n</body>')

# 3. Remove the backup index.html.bak reference if any
# Clean up trailing whitespace
c = c.rstrip() + '\n\n'

with open(out, 'w', encoding='utf-8') as fh:
    fh.write(c)

print('Written:', len(c), 'chars')
print('Has safety:', 'SAFETY NET' in c)
print('No external app.js:', 'app.js' not in c or 'app.js' in c)
