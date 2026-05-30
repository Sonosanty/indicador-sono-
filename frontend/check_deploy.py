#!/usr/bin/env python3
import urllib.request

url = 'https://deb6a0ce.indicador-sono.pages.dev/'
req = urllib.request.Request(url)
req.add_header('Cache-Control', 'no-cache')
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8')

print(f'Status: {resp.status}')
print(f'Has updateUI: {"updateUI" in html}')
print(f'Has loadVIX: {"loadVIX" in html}')
print(f'Has CSP: {"Content-Security-Policy" in html}')
print(f'Has const $=: {"const $" in html}')
print(f'Length: {len(html)}')
idx = html.find('<script>')
if idx >= 0:
    print(f'JS starts at {idx}: {repr(html[idx+8:idx+60])}')
