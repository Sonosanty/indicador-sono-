#!/usr/bin/env python3
"""Replace button HTML with price subtext version"""
import os, re

BASE = r'C:\Users\sparreno\.openclaw\workspace\frontend'
path = os.path.join(BASE, 'pagina.html')

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace buttons (all in one line, no newlines)
old_btns = '">BTC</button><button class="asset-btn" data-asset="ETH">ETH</button><button class="asset-btn" data-asset="SOL">SOL</button><button class="asset-btn" data-asset="XRP">XRP</button>'
new_btns = '"><span class="asset-symbol">BTC</span><span class="asset-price" id="apBTC">--</span></button><button class="asset-btn" data-asset="ETH"><span class="asset-symbol">ETH</span><span class="asset-price" id="apETH">--</span></button><button class="asset-btn" data-asset="SOL"><span class="asset-symbol">SOL</span><span class="asset-price" id="apSOL">--</span></button><button class="asset-btn" data-asset="XRP"><span class="asset-symbol">XRP</span><span class="asset-price" id="apXRP">--</span></button>'

if old_btns not in html:
    # Try to find what's actually there
    idx = html.find('data-asset="BTC"')
    if idx >= 0:
        print(f'Found BTC button at {idx}, context: {repr(html[idx:idx+60])}')
    else:
        print('Could not find BTC button at all')
    exit(1)

html = html.replace(old_btns, new_btns)
print('1. Buttons with prices added')

# 2. Add CSS for .asset-symbol and .asset-price
extra_css = '.asset-btn .asset-symbol{font-size:13px;font-weight:700;display:block}.asset-btn .asset-price{font-size:10px;font-weight:500;color:var(--text-faint);font-family:var(--font-mono);display:block;margin-top:1px}.asset-btn.active .asset-price{color:var(--primary-2)}'
# Insert before last } in style block
style_end = html.rfind('</style>')
if style_end > 0:
    html = html[:style_end] + extra_css + html[style_end:]
    print(f'2. CSS appended at position {style_end}')

# 3. Add .asset-btn flex-column CSS
old_css = '.asset-btn{white-space:nowrap;border:0;background:transparent;color:var(--text-muted);padding:8px 18px;border-radius:999px;font:600 13px var(--font-body);cursor:pointer;transition:.18s ease}'
new_css = '.asset-btn{display:flex;flex-direction:column;align-items:center;gap:0px;border:0;background:transparent;color:var(--text-muted);padding:4px 18px 6px;border-radius:999px;font:600 13px var(--font-body);cursor:pointer;transition:.18s ease;min-width:72px;line-height:1.2}'
if old_css in html:
    html = html.replace(old_css, new_css)
    print('3. CSS flex column updated')
else:
    # Already had the fix from earlier
    print('3. CSS flex column already present')

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Done. {len(html)} bytes, apBTC present: {"apBTC" in html}')
