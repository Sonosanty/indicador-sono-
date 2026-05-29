import re, sys

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(f, 'r', encoding='utf-8', errors='replace') as fh:
    c = fh.read()

# 1. Remove any residual <script src="app.js"> tag
c = re.sub(r'<script\s+src=("|\')app\.js\1>\s*</script>\s*', '', c)

# 2. Verify only 1 script tag remains (the inline one)
before_count = len(re.findall(r'<script[^>]*>', c))
print(f'Script tags: {before_count}')

# 3. Remove the <script> ... </script> wrapper to get just the JS
m = re.search(r'<script>(.*?)</script>', c, re.DOTALL)
if m:
    js = m.group(1)
    # Remove leading newlines
    js = js.strip()
    print(f'Inline JS: {len(js)} chars')
    print(f'First 60: {repr(js[:60])}')
    print(f'Has init(): {"init()" in js}')
    print(f'Has computeScore: {"computeScore" in js}')
    
    # Verify syntax with Python
    try:
        compile(js, 'inline.js', 'exec')
        print('SYNTAX: OK')
    except SyntaxError as e:
        print(f'SYNTAX ERROR: {e.msg} at line {e.lineno}')
        lines = js.split('\n')
        for i in range(max(0, e.lineno-3), min(len(lines), e.lineno+2)):
            print(f'{i+1}: {lines[i][:120]}')
        
    # Also save the inline JS as app.js (clean version)
    with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\app.js', 'w', encoding='utf-8') as fh:
        fh.write(js)
    print('app.js written:', len(js), 'chars')
else:
    print('Inline script not found!')
    # Debug
    idx = c.find('<script>')
    if idx >= 0:
        print(f'<script> at {idx}: {repr(c[idx:idx+100])}')
    else:
        print('No <script> tag whatsoever!')
        print(f'Last 300 chars: {repr(c[-300:])}')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('HTML saved')
