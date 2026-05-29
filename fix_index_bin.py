#!/usr/bin/env python3
"""Patch dashboard_sono/index.html - read as binary to handle UTF-8 em-dash"""
path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(path, 'rb') as f:
    content = f.read()

# Volume section with VIX card - match binary with em-dash bytes
old_vol = b'        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\r\n          <div class="card-label" style="margin-bottom:4px">VOLUMEN 24H GLOBAL</div>\r\n          <span class="macro-vol" id="globalVolVal" style="color:var(--txt)">\xe2\x80\x94</span>\r\n          <div class="macro-delta-row">\r\n            min <span id="globalVolMin">\xe2\x80\x94</span> max <span id="globalVolMax">\xe2\x80\x94</span>\r\n          </div>\r\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n            Fuente: CoinGecko global data\r\n          </div>\r\n        </div>'

new_vix = b'        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\r\n          <div class="card-label" style="margin-bottom:4px">VOLUMEN 24H GLOBAL</div>\r\n          <span class="macro-vol" id="globalVolVal" style="color:var(--txt)">\xe2\x80\x94</span>\r\n          <div class="macro-delta-row">\r\n            min <span id="globalVolMin">\xe2\x80\x94</span> max <span id="globalVolMax">\xe2\x80\x94</span>\r\n          </div>\r\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n            Fuente: <a href="https://coingecko.com" target="_blank" style="color:var(--gold);text-decoration:none;">CoinGecko</a> global data\r\n          </div>\r\n        </div>\r\n        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\r\n          <div class="card-label" style="margin-bottom:4px">VIX (VOLATILIDAD)</div>\r\n          <div style="display:flex;align-items:baseline;gap:8px;">\r\n            <span style="font-family:JetBrains Mono,monospace;font-size:clamp(20px,2.5vw,32px);font-weight:700;" id="vixValue">\xe2\x80\x94</span>\r\n            <span style="font-family:JetBrains Mono,monospace;font-size:clamp(9px,0.9vw,11px);" id="vixChange">\xe2\x80\x94</span>\r\n            <span style="font-size:clamp(9px,0.9vw,11px);color:var(--dim);" id="vixStatus">\xe2\x80\x94</span>\r\n          </div>\r\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n            Fuente: <a href="https://finance.yahoo.com/quote/%5EVIX/" target="_blank" style="color:var(--dim);text-decoration:none;">Yahoo Finance</a> via Cloudflare Worker\r\n          </div>\r\n        </div>'

if old_vol in content:
    content = content.replace(old_vol, new_vix)
    print("OK VIX card added")
else:
    print("FAIL Volume binary not found")
    # Try to find the start
    idx = content.find(b'VOLUMEN 24H GLOBAL')
    if idx >= 0:
        print("Found at byte:", idx)
        print(repr(content[idx:idx+300]))

# Update source link in Fear & Greed footer (already a href from previous run, but check)
fg_old = b'Fuente: Alternative.me Fear & Greed Score Sono Binance'
fg_new = b'Fuente: <a href="https://alternative.me" target="_blank" style="color:var(--teal);text-decoration:none;">Alternative.me</a> \xc2\xb7 <a href="https://coingecko.com" target="_blank" style="color:var(--gold);text-decoration:none;">CoinGecko</a> \xc2\xb7 <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a>'
if fg_old in content:
    content = content.replace(fg_old, fg_new)
    print("OK Fear & Greed link updated")
else:
    if b'alternative.me' in content:
        print("Fear & Greed already has link (skipping)")

# Update Score footer 
score_old = b'Fuente: Score Maestro Sono MA cruces ADX/RSI BB %B'
score_new = b'Fuente: Score Maestro Sono \xc2\xb7 MA cruces \xc2\xb7 ADX/RSI \xc2\xb7 BB %B \xc2\xb7 <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a>'
if score_old in content:
    content = content.replace(score_old, score_new)
    print("OK Score footer link updated")
else:
    if b'binance.com' in content and b'Score Maestro' in content:
        print("Score footer already has link")

# Update Indicators footer
ind_old = b'Fuente: Binance klines \xc2\xb7 c\xc3\xa1lculos Sono Pro'
ind_new = b'Fuente: <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a> klines \xc2\xb7 c\xc3\xa1lculos Sono Pro'
if ind_old in content:
    content = content.replace(ind_old, ind_new)
    print("OK Indicators link updated")
else:
    if b'binance.com' in content and b'klines' in content:
        print("Indicators footer already has link")

with open(path, 'wb') as f:
    f.write(content)
print("OK index.html patched")
