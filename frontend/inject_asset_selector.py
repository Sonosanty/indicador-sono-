#!/usr/bin/env python3
"""Inyectar asset selector BTC/ETH/SOL/XRP en range_explorer.html, trades_explorer.html, metodo.html"""
import os, re

BASE = r'C:\Users\sparreno\.openclaw\workspace\frontend'

# Asset selector HTML snippet (v3 style pills)
ASSET_HTML = '''
<div class="asset-tabs" style="margin-left:auto">
<button class="asset-btn active" data-asset="BTC">BTC</button>
<button class="asset-btn" data-asset="ETH">ETH</button>
<button class="asset-btn" data-asset="SOL">SOL</button>
<button class="asset-btn" data-asset="XRP">XRP</button>
</div>'''

# JS snippet to inject before </script>
ASSET_JS = '''
// Asset selector - multi asset support
document.querySelectorAll('.asset-btn').forEach(function(btn){
 btn.addEventListener('click',function(){
  document.querySelectorAll('.asset-btn').forEach(function(b){b.classList.remove('active')});
  this.classList.add('active');
  var a=this.dataset.asset;
  var sm={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};
  currentAsset=sm[a]||'BTCUSDT';
  currentAssetLabel=a;
  // Re-trigger full data load
  if(typeof onAssetChange==='function')onAssetChange(currentAsset,currentAssetLabel);
 })
});
'''

def inject_asset_selector_in_range(html):
    """Inject into range_explorer.html"""
    # Add asset selector after nav links
    html = html.replace(
        '<a href="trades_explorer.html">Trades</a>',
        '<a href="trades_explorer.html">Trades</a>\n    ' + ASSET_HTML
    )
    # Add global var currentAsset
    html = html.replace(
        'const COIN = "BTCUSDT";',
        'const COIN = "BTCUSDT";\nlet currentAsset="BTCUSDT";\nlet currentAssetLabel="BTC";'
    )
    # Add asset change handler
    html = html.replace(
        'async function init(){',
        'function onAssetChange(asset,label){COIN=asset;currentAsset=asset;currentAssetLabel=label;document.title="Range Intelligence | "+label;fetchAllKlines().then(function(){renderHero();renderTFCards()});}\n'
        + ASSET_JS
        + '\nasync function init(){'
    )
    # Update document title
    html = html.replace(
        '<title>Range Intelligence | BTC</title>',
        '<title>Range Intelligence | BTC</title>\n<script>var currentAsset="BTCUSDT",currentAssetLabel="BTC";</script>'
    )
    return html

def inject_asset_selector_in_trades(html):
    """Inject into trades_explorer.html"""
    # Add asset selector
    html = html.replace(
        '<a href="range_explorer.html">Rangos</a>',
        '<a href="range_explorer.html">Rangos</a>\n    ' + ASSET_HTML
    )
    # Add global vars + asset handler
    html = html.replace(
        '<script>',
        '<script>\nvar currentAsset="BTCUSDT",currentAssetLabel="BTC";\n'
    )
    html = html.replace(
        'const SOCKET = `wss://stream.binance.com:9443/ws/btcusdt@aggTrade`;',
        'const SOCKET_TPL = "wss://stream.binance.com:9443/ws/";\nlet SOCKET = SOCKET_TPL + "btcusdt@aggTrade";\nlet currentWs=null;'
    )
    # Add asset change support
    html = html.replace(
        '// ── WS ──────────────────────────────',
        ASSET_JS.replace('onAssetChange', 'onAssetChangeTrades')
        + '\nfunction onAssetChangeTrades(asset,label){currentAsset=asset;currentAssetLabel=label;'
        + 'SOCKET=SOCKET_TPL+asset.toLowerCase()+"@aggTrade";'
        + 'if(currentWs){currentWs.close()}'
        + 'connectWS();'
        + '}'
        + '\n\n// ── WS ──────────────────────────────'
    )
    return html

def inject_asset_selector_in_metodo(html):
    """Inject into metodo.html (also migrate to v3-ish style)"""
    # Replace font imports
    html = html.replace(
        '<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
        '<link rel="preconnect" href="https://api.fontshare.com">\n'
        '<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">\n'
        '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">'
    )
    # Replace CSS vars
    html = html.replace(
        '--font-body: "Syne", sans-serif;',
        '--font-body: "Satoshi", Inter, sans-serif;'
    )
    html = html.replace(
        '--font-mono: "IBM Plex Mono", monospace;',
        '--font-mono: "JetBrains Mono", monospace;'
    )
    # Add nav with asset selector
    nav_start = html.find('<body')
    if nav_start > 0:
        body_end = html.find('>', nav_start)
        nav_html = ('''
<header class="topbar" style="position:sticky;top:0;z-index:100;backdrop-filter:blur(18px);background:rgba(10,15,23,.72);border-bottom:1px solid rgba(196,210,229,0.10);padding:0 16px">
<div style="display:flex;align-items:center;justify-content:space-between;min-height:64px;max-width:1240px;margin:0 auto">
<nav style="display:flex;gap:12px;align-items:center">
<a href="index.html" style="color:var(--muted);text-decoration:none;font-size:14px">Dashboard</a>
<a href="range_explorer.html" style="color:var(--muted);text-decoration:none;font-size:14px">Rangos</a>
<a href="trades_explorer.html" style="color:var(--muted);text-decoration:none;font-size:14px">Trades</a>
<a href="#" style="color:#e8edf5;text-decoration:none;font-size:14px;font-weight:600">Método</a>
</nav>''' + ASSET_HTML + '''
</div>
</header>''')
        html = html[:body_end+1] + nav_html + html[body_end+1:]
    return html

# ── APPLY ────────────────────────────────
for fname, fn in [
    ('range_explorer.html', inject_asset_selector_in_range),
    ('trades_explorer.html', inject_asset_selector_in_trades),
    ('metodo.html', inject_asset_selector_in_metodo),
]:
    path = os.path.join(BASE, fname)
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Check if already injected
    if 'class="asset-btn"' in html:
        print(f'{fname}: Already has asset selector, skipping')
        continue
    
    original = len(html)
    html = fn(html)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    delta = len(html) - original
    print(f'{fname}: OK Injected ({delta} bytes added, {len(html)} total)')
