import subprocess, os, re

SRC = r'C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\trades'
DST = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades'

# Read
with open(os.path.join(SRC, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()
with open(os.path.join(SRC, 'app.js'), 'r', encoding='utf-8') as f:
    appjs = f.read()

# ── Fix HTML ────────────────────────────────────────────────
# Remove duplicate </body></html> at end
html = html.rstrip()
while html.endswith('</html>'):
    html = html[:-7]
while html.endswith('</body>'):
    html = html[:-7]
while html.endswith('</html>'):
    html = html[:-7]
html += '\n</body>\n</html>\n'

# ── Fix JS: Remove duplicate declarations ───────────────────
# Strategy: find all `let X`, `const X`, `function X` and keep only first occurrence

lines = appjs.split('\n')
seen_decl = {}  # decl_key -> first line index
to_remove = set()

for i, line in enumerate(lines):
    stripped = line.strip()
    # Skip comments
    if stripped.startswith('//') or stripped.startswith('/*'):
        continue
    
    # Match declarations
    m = re.match(r'^(let|const|function)\s+(\w+)', stripped)
    if m:
        kw, name = m.groups()
        key = f'{kw} {name}'
        if key in seen_decl:
            # Check if this is a full statement (ends with ; or { or has =)
            # We'll remove only the line, not the whole block
            to_remove.add(i)
            print(f'Remove line {i+1}: {stripped[:60]}')
        else:
            seen_decl[key] = i

# Remove duplicate lines
fixed_lines = [l for i, l in enumerate(lines) if i not in to_remove]
fixed_js = '\n'.join(fixed_lines)

print(f'\nRemoved {len(to_remove)} duplicate lines')
print(f'Original: {len(lines)} lines, {len(appjs)} bytes')
print(f'Fixed: {len(fixed_lines)} lines, {len(fixed_js)} bytes')

# ── Verify JS syntax ─────────────────────────────────────────
tmp = r'C:\Users\sparreno\AppData\Local\Temp\trades_app.js'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(fixed_js)

r = subprocess.run(
    'node -e "try{new Function(require(\'fs\').readFileSync(\'C:/Users/sparreno/AppData/Local/Temp/trades_app.js\',\'utf-8\'));console.log(\'OK\');}catch(e){console.log(\'FAIL:\'+e.message.split(\'\\n\')[0]);process.exit(1);}"',
    capture_output=True, text=True, shell=True
)
print(f'Node verify: {r.stdout.strip()}')

if 'OK' in r.stdout:
    # Write both files
    with open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    with open(os.path.join(DST, 'app.js'), 'w', encoding='utf-8') as f:
        f.write(fixed_js)
    print(f'\nWritten:')
    print(f'  index.html: {len(html)} bytes')
    print(f'  app.js: {len(fixed_js)} bytes')
    
    # Also store in backup
    with open(os.path.join(SRC, 'app_fixed.js'), 'w', encoding='utf-8') as f:
        f.write(fixed_js)
    print(f'  Backup: app_fixed.js')
else:
    print(f'STDERR: {r.stderr}')
