#!/usr/bin/env python3
"""Build pagina.html final: CSS + HTML + JS completo"""
import re

# Read the HTML head+body from the git-restored version (minus truncated JS)
with open('pagina.html', 'r', encoding='utf-8') as f:
    prefix = f.read()

# Read the complete JS
with open('sono_v3_complete.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Strip everything from <script> onward in the prefix and append new JS + closing tags
script_pos = prefix.find('<script>')
if script_pos > 0:
    html = prefix[:script_pos]
else:
    html = prefix  # fallback

# Add CSP if not present
csp_val = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "connect-src 'self' https://api.binance.com wss://stream.binance.com:9443 "
    "https://api.coingecko.com https://api.alternative.me "
    "https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data:; frame-ancestors 'none';"
)
csp_tag = f'<meta http-equiv="Content-Security-Policy" content="{csp_val}"/>'
if 'Content-Security-Policy' not in html:
    html = html.replace('<meta name="viewport"', csp_tag + '\n<meta name="viewport"')

# Append complete JS + closing
html += '<script>\n' + js + '\n</script>\n</body>\n</html>'

# Verify JS syntax
m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if m:
    try:
        compile(m.group(1), '<test>', 'exec')
        print('JS syntax: OK')
    except SyntaxError as e:
        print(f'JS SYNTAX ERROR line {e.lineno}: {e.msg}')
        # Print context
        lines = m.group(1).split('\n')
        for i in range(max(0, e.lineno-2), min(len(lines), e.lineno+2)):
            marker = '>>>' if i+1 == e.lineno else '   '
            print(f'{marker} {i+1}: {lines[i]}')
else:
    print('WARNING: No script tag in output!')

with open('pagina.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\nWritten: {len(html)} bytes')
print(f'Ends with </html>: {html.strip().endswith("</html>")}')
