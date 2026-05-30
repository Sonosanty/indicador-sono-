#!/usr/bin/env python3
"""Mejorar asset buttons + fix precios multi-activo"""
import os

BASE = r'C:\Users\sparreno\.openclaw\workspace\frontend'
path = os.path.join(BASE, 'pagina.html')

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# 1. New CSS for asset buttons with price subtext
old_css = '.asset-btn{white-space:nowrap;border:0;background:transparent;color:var(--text-muted);padding:8px 18px;border-radius:999px;font:600 13px var(--font-body);cursor:pointer;transition:.18s ease}'
new_css = '.asset-btn{display:flex;flex-direction:column;align-items:center;gap:0px;border:0;background:transparent;color:var(--text-muted);padding:4px 18px 6px;border-radius:999px;font:600 13px var(--font-body);cursor:pointer;transition:.18s ease;min-width:72px;line-height:1.2}'
if old_css in html:
    html = html.replace(old_css, new_css)
    changes += 1
    print('1. CSS base buttons updated')

# 2. Add subtext styles
old_sub = '.asset-btn.active,.asset-btn:hover{color:var(--text);background:rgba(58,160,255,.14)}'
new_sub = '.asset-btn.active,.asset-btn:hover{color:var(--text);background:rgba(58,160,255,.14)}'
asset_styles = '''
.asset-btn .asset-symbol{font-size:13px;font-weight:700;display:block}
.asset-btn .asset-price{font-size:10px;font-weight:500;color:var(--text-faint);font-family:var(--font-mono);display:block;margin-top:1px}
.asset-btn.active .asset-price{color:var(--primary-2)}'''
html = html.replace(old_sub, new_sub + asset_styles)
changes += 1
print('2. Asset subtext styles added')

# 3. Replace button HTML: BTC → BTC + price span
old_btns = '''<button class="asset-btn active" data-asset="BTC">BTC</button>
<button class="asset-btn" data-asset="ETH">ETH</button>
<button class="asset-btn" data-asset="SOL">SOL</button>
<button class="asset-btn" data-asset="XRP">XRP</button>'''
new_btns = '''<button class="asset-btn active" data-asset="BTC"><span class="asset-symbol">BTC</span><span class="asset-price" id="apBTC">--</span></button>
<button class="asset-btn" data-asset="ETH"><span class="asset-symbol">ETH</span><span class="asset-price" id="apETH">--</span></button>
<button class="asset-btn" data-asset="SOL"><span class="asset-symbol">SOL</span><span class="asset-price" id="apSOL">--</span></button>
<button class="asset-btn" data-asset="XRP"><span class="asset-symbol">XRP</span><span class="asset-price" id="apXRP">--</span></button>'''

if old_btns in html:
    html = html.replace(old_btns, new_btns)
    changes += 1
    print('3. Button HTML with price spans')

# 4. Add _lastPrices global
html = html.replace('let ER=0.857,PD=null,VIX=null;', 'let ER=0.857,PD=null,VIX=null,_lastPrices={};')
changes += 1
print('4. _lastPrices global added')

# 5. Store price per asset in lp()
html = html.replace(
    "PD={usd:parseFloat(d.lastPrice),chg:parseFloat(d.priceChangePercent)};ap()}",
    "PD={usd:parseFloat(d.lastPrice),chg:parseFloat(d.priceChangePercent)};var sym=a.replace('USDT','');_lastPrices[sym]=parseFloat(d.lastPrice);ap()}"
)
changes += 1
print('5. Price storage in lp()')

# 6. Update asset price labels in ap()
html = html.replace(
    "$('lastUpdateBTC').textContent='Actualizado: '+ts()}",
    "$('lastUpdateBTC').textContent='Actualizado: '+ts();['BTC','ETH','SOL','XRP'].forEach(function(a){var el=document.getElementById('ap'+a);if(el&&_lastPrices[a])el.textContent='$'+_lastPrices[a].toFixed(a==='XRP'?4:2);})}"
)
changes += 1
print('6. Asset price labels update added')

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\nDone. {changes} changes applied. {len(html)} bytes')
