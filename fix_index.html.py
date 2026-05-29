#!/usr/bin/env python3
"""Patch dashboard_sono/index.html"""
path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update DOMINANTE badge CSS inline (it uses a class) - change to yellow bg + black text
old_dom = '.range-dominant{background:rgba(22,163,74,0.15);color:#16a34a;padding:2px 10px;border-radius:999px;font-size:9px;font-weight:600;}'
new_dom = '.range-dominant{background:#FFD600;color:#000;padding:2px 10px;border-radius:999px;font-size:9px;font-weight:700;}'
if old_dom in content:
    content = content.replace(old_dom, new_dom)
    print("OK DOMINANTE CSS updated")
else:
    print("FAIL DOMINANTE CSS not found")

# 2. Add VIX display card to the RSI Macro card area
# Insert a VIX row inside the RSI macro card after "VOLUMEN 24H GLOBAL"
vix_html = '        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\n          <div class="card-label" style="margin-bottom:4px">VOLUMEN 24H GLOBAL</div>\n          <span class="macro-vol" id="globalVolVal" style="color:var(--txt)">\u2014</span>\n          <div class="macro-delta-row">\n            min <span id="globalVolMin">\u2014</span> max <span id="globalVolMax">\u2014</span>\n          </div>\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\n            Fuente: <a href="https://coingecko.com" target="_blank" style="color:var(--gold);text-decoration:none;">CoinGecko</a> global data\n          </div>\n        </div>\n        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\n          <div class="card-label" style="margin-bottom:4px">VIX (VOLATILIDAD)</div>\n          <div style="display:flex;align-items:baseline;gap:8px;">\n            <span style="font-family:JetBrains Mono,monospace;font-size:clamp(20px,2.5vw,32px);font-weight:700;" id="vixValue">\u2014</span>\n            <span style="font-family:JetBrains Mono,monospace;font-size:clamp(9px,0.9vw,11px);" id="vixChange">\u2014</span>\n            <span style="font-size:clamp(9px,0.9vw,11px);color:var(--dim);" id="vixStatus">\u2014</span>\n          </div>\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\n            Fuente: <a href="https://finance.yahoo.com/quote/%5EVIX/" target="_blank" style="color:var(--dim);text-decoration:none;">Yahoo Finance</a> via Cloudflare Worker\n          </div>\n        </div>'

old_vol_section = '        <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\n          <div class="card-label" style="margin-bottom:4px">VOLUMEN 24H GLOBAL</div>\n          <span class="macro-vol" id="globalVolVal" style="color:var(--txt)">-</span>\n          <div class="macro-delta-row">\n            min <span id="globalVolMin">-</span> max <span id="globalVolMax">-</span>\n          </div>\n          <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\n            Fuente: CoinGecko global data\n          </div>\n        </div>'

if old_vol_section in content:
    content = content.replace(old_vol_section, vix_html)
    print("OK VIX card added")
else:
    print("FAIL Volume section not found - trying alternative...")
    # Try searching for the actual text
    idx = content.find('VOLUMEN 24H GLOBAL')
    if idx >= 0:
        print("Found VOLUMEN at", idx)
        print(repr(content[idx:idx+400]))
    else:
        print("VOLUMEN not found at all")

# 3. Update source links in various footer texts
# Fear & Greed footer
old_fg = 'Fuente: Alternative.me Fear & Greed Score Sono Binance'
new_fg = 'Fuente: <a href="https://alternative.me" target="_blank" style="color:var(--teal);text-decoration:none;">Alternative.me</a> · <a href="https://coingecko.com" target="_blank" style="color:var(--gold);text-decoration:none;">CoinGecko</a> · <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a>'
if old_fg in content:
    content = content.replace(old_fg, new_fg)
    print("OK Fear & Greed source link updated")
else:
    print("FAIL Fear & Greed source not found")

# Score footer
old_score_footer = 'Fuente: Score Maestro Sono MA cruces ADX/RSI BB %B'
new_score_footer = 'Fuente: Score Maestro Sono · MA cruces · ADX/RSI · BB %B · <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a>'
if old_score_footer in content:
    content = content.replace(old_score_footer, new_score_footer)
    print("OK Score footer source link updated")
else:
    print("FAIL Score footer not found")

# Indicators footer
old_ind_footer = 'Fuente: Binance klines · c\xc3\xa1lculos Sono Pro'
new_ind_footer = 'Fuente: <a href="https://www.binance.com" target="_blank" style="color:var(--gold);text-decoration:none;">Binance</a> klines · c\xc3\xa1lculos Sono Pro'
if old_ind_footer in content:
    content = content.replace(old_ind_footer, new_ind_footer)
    print("OK Indicators source link updated")
else:
    print("FAIL Indicators footer not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("OK index.html patched successfully")
