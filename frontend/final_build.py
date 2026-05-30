#!/usr/bin/env python3
import os, re

os.chdir(r'C:\Users\sparreno\.openclaw\workspace\frontend')

with open('pagina.html', 'r', encoding='utf-8') as f:
    content = f.read()

script_start = content.find('<script>')
prefix = content[:script_start] if script_start >= 0 else content

with open('sono_v3_complete.js', 'r', encoding='utf-8') as f:
    js = f.read()

csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; connect-src \'self\' https://api.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data:; frame-ancestors \'none\';\"/>'

if 'Content-Security-Policy' not in prefix:
    prefix = prefix.replace('<meta name="viewport"', csp + '\n<meta name="viewport"')

html = prefix + '<script>\n' + js + '\n</script>\n</body>\n</html>'

print(f'Written: {len(html)} bytes')
print(f'Ends with </html>: {html.strip().endswith("</html>")}')
print(f'JS starts with: {repr(js[:60])}')

with open('pagina.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('OK')
