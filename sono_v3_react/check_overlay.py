import subprocess, os

BACK = r'C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\trades'
DST = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades'

# Read backup files
with open(os.path.join(BACK, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()
with open(os.path.join(BACK, 'app.js'), 'r', encoding='utf-8') as f:
    appjs = f.read()

print(f'Backup index.html: {len(html)} bytes')
print(f'Backup app.js: {len(appjs)} bytes')
print()

# Check overlay systems
import re
# HTML overlay classes
if 'class="hidden"' in html:
    print('HTML uses class="hidden"')
elif 'class="h"' in html:
    print('HTML uses class="h"')

# Find the overlay div
ov = re.search(r'<div\s+id="([^"]*)"[^>]*class="([^"]*)"[^>]*>\s*<div\s+class="sp"', html)
if ov:
    print(f'Overlay id="{ov.group(1)}" class="{ov.group(2)}"')
    # What hides it?
    hide_check = re.search(rf'\.{ov.group(2)}\{{?([^}}]+)', html)
    if hide_check:
        print(f'  Hide rule: {hide_check.group(0)[:80]}')

# JS overlay hide
for m in re.finditer(r'\.classList\.(add|remove)\([\'"](\w+)[\'"]\)', appjs):
    print(f'JS classList.{m.group(1)}("{m.group(2)}")')
    if 'overlay' in appjs[m.start()-100:m.start()+100].lower():
        print(f'  Context: ...{appjs[max(0,m.start()-50):m.start()+50]}...')
