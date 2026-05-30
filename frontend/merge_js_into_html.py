#!/usr/bin/env python3
"""Merge the JS file into pagina.html, add CSP, verify syntax"""
import re, sys

with open('pagina.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('sono_v3_complete.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add CSP meta tag
csp_attr = (
    'default-src \'self\'; '
    'script-src \'self\' \'unsafe-inline\'; '
    'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; '
    'connect-src \'self\' https://api.binance.com wss://stream.binance.com:9443 '
    'https://api.coingecko.com https://api.alternative.me '
    'https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; '
    'font-src \'self\' https://fonts.gstatic.com; '
    'img-src \'self\' data:; '
    'frame-ancestors \'none\';'
)
csp_tag = f'<meta http-equiv="Content-Security-Policy" content="{csp_attr}"/>'

if 'Content-Security-Policy' not in html:
    html = html.replace('<meta name="viewport"', csp_tag + '\n<meta name="viewport"')
    print('1. CSP added')
else:
    print('1. CSP already present')

# 2. Replace script content
html = re.sub(
    r'<script>.*?</script>',
    '<script>\n' + js + '\n</script>',
    html,
    flags=re.DOTALL
)
print('2. JS replaced')

# 3. Verify JS syntax
m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if m:
    try:
        compile(m.group(1), '<test>', 'exec')
        print('3. JS syntax: OK')
    except SyntaxError as e:
        print(f'3. JS SYNTAX ERROR line {e.lineno}: {e.msg}')
        sys.exit(1)
else:
    print('3. No script tag found!')
    sys.exit(1)

with open('pagina.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Done. {len(html)} bytes, ends with </html>: {html.strip().endswith("</html>")}')
