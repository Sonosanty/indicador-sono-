#!/usr/bin/env python3
"""Fix DOMContentLoaded -> window.onload in the terminal HTML"""
import os

base = r'C:\Users\sparreno\.openclaw\workspace\frontend'
path = os.path.join(base, 'pagina.html')

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace DOMContentLoaded -> window.onload
html = html.replace(
    "document.addEventListener('DOMContentLoaded', function() {",
    'window.onload = function() {'
)

# Fix the closing
html = html.replace(
    "});\n\n// Coin selector",
    "};\n\n// Coin selector"
)

# Add error handler at start of script
# Fix CSP to allow eval
csp_meta = '<meta http-equiv="Content-Security-Policy"'
csp_replacement = '<meta http-equiv="Content-Security-Policy" content="default-src ' + "'self'" + '; script-src ' + "'self' 'unsafe-inline' 'unsafe-eval'" + '; style-src ' + "'self' 'unsafe-inline'" + ' https://fonts.googleapis.com; connect-src ' + "'self'" + ' https://api.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; font-src ' + "'self'" + ' https://fonts.gstatic.com; img-src ' + "'self'" + ' data:; frame-ancestors ' + "'none'" + ';"/>'
html = html.replace(csp_meta, csp_replacement)
print("CSP updated to allow unsafe-eval")

html = html.replace(
    '<script>',
    '<script>\nwindow.onerror = function(m,s,l,c,e){document.getElementById("connection-status").textContent="Err: "+m;};\n'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Fixed. {len(html)} bytes')
