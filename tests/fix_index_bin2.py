#!/usr/bin/env python3
"""Patch dashboard_sono/index.html - read as binary"""
path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(path, 'rb') as f:
    content = f.read()

# The volume section that ends with </div>\n    </div>\n\n before SENTIMENT card
# We need to add the VIX section BEFORE the </div>\n    </div>\n\n marker
# The closing divs are:
# </div> (closes border-top wrapper)
#     </div> (closes outer card block)
# (blank line)
# <!-- CARD: SENTIMENT + CONFIANZA -->

# Insert VIX section right after the border-top wrapper's closing </div> but before the outer </div>
old_end = b'        <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n          Fuente: CoinGecko global data\r\n        </div>\r\n      </div>\r\n    </div>\r\n\r\n'

new_section = b'        <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n          Fuente: <a href="https://coingecko.com" target="_blank" style="color:var(--gold);text-decoration:none;">CoinGecko</a> global data\r\n        </div>\r\n      </div>\r\n      <div style="border-top:0.5px solid var(--b);padding-top:10px;margin-top:6px;">\r\n        <div class="card-label" style="margin-bottom:4px">VIX (VOLATILIDAD)</div>\r\n        <div style="display:flex;align-items:baseline;gap:8px;">\r\n          <span style="font-family:JetBrains Mono,monospace;font-size:clamp(20px,2.5vw,32px);font-weight:700;" id="vixValue">\xe2\x80\x94</span>\r\n          <span style="font-family:JetBrains Mono,monospace;font-size:clamp(9px,0.9vw,11px);" id="vixChange">\xe2\x80\x94</span>\r\n          <span style="font-size:clamp(9px,0.9vw,11px);color:var(--dim);" id="vixStatus">\xe2\x80\x94</span>\r\n        </div>\r\n        <div class="card-footer" style="margin-top:4px;border-top:none;padding-top:0;">\r\n          Fuente: <a href="https://finance.yahoo.com/quote/%5EVIX/" target="_blank" style="color:var(--dim);text-decoration:none;">Yahoo Finance</a> via Cloudflare Worker\r\n        </div>\r\n      </div>\r\n    </div>\r\n\r\n'

if old_end in content:
    content = content.replace(old_end, new_section, 1)  # only first occurrence
    print("OK VIX card + CoinGecko link added")
else:
    print("FAIL End pattern not found")
    # Debug: find what's around there
    idx = content.find(b'VOLUMEN 24H GLOBAL')
    start = content.rfind(b'<div style="border-top', 0, idx)
    end_marker = content.find(b'<!-- CARD: SENTIMENT', start)
    print("Block between border-top and SENTIMENT:")
    print(repr(content[start:end_marker]))

with open(path, 'wb') as f:
    f.write(content)
print("OK index.html patched")
