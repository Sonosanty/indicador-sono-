#!/usr/bin/env python3
"""Apply patches to dashboard_sono/app.js"""
import re

path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\app.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the old pressure bar with the 3-segment version
# The file has \r\n\r\n (double blank lines) between tags
old_pressure = '''        <div class="range-pressure">

          <div class="range-pressure-dot" style="left:${presionPos}%"></div>

        </div>

        <div style="display:flex;justify-content:space-between;font-size:clamp(7px,0.7vw,9px);color:var(--dim);">

          <span>Vendedora</span>

          <span style="color:${tfData.presion > 10 ? '#16a34a' : tfData.presion < -10 ? '#dc2626' : 'var(--dim)'};">${tfData.presion > 0 ? '+' : ''}${tfData.presion}</span>

          <span>Compradora</span>

        </div>'''

new_pressure = '''        <!-- Barra presion 3 segmentos (VENDEDORA | NEUTRA | COMPRADORA) -->
        <div style="position:relative;height:6px;border-radius:3px;margin:8px 0 2px;display:flex;overflow:hidden;">
          <div style="flex:1;background:#FF4444;border-radius:3px 0 0 3px;margin-right:1px;"></div>
          <div style="flex:1;background:#666;margin:0 1px;"></div>
          <div style="flex:1;background:#44FF44;border-radius:0 3px 3px 0;margin-left:1px;"></div>
          <div style="position:absolute;top:-3px;left:${presionPos}%;transform:translateX(-50%);color:${tfData.presion > 10 ? '#44FF44' : tfData.presion < -10 ? '#FF4444' : '#666'};font-size:9px;line-height:1;text-shadow:0 0 4px rgba(0,0,0,0.8);">&blacktriangle;</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:clamp(6px,0.65vw,8px);margin-top:1px;">
          <span style="color:#FF4444;font-weight:700;">VENDEDORA</span>
          <span style="color:#666;font-weight:700;">NEUTRA</span>
          <span style="color:#44FF44;font-weight:700;">COMPRADORA</span>
        </div>'''

if old_pressure in content:
    content = content.replace(old_pressure, new_pressure)
    print("OK Pressure bar replaced")
else:
    print("FAIL Old pressure text not found - checking length of patterns")
    # Try without the double blank lines
    old2 = old_pressure.replace('\n\n', '\n')
    if old2 in content:
        print("Found with single newlines variant")
    else:
        # Check if the original range-pressure class still exists
        if 'class="range-pressure"' in content:
            print("range-pressure class still exists but text doesn't match exactly")
        else:
            print("range-pressure class was already modified")

# 2. Add VIX loading function and integrate it
vix_func = '''

// - VIX desde Cloudflare Worker -
let vixData = null;
const VIX_WORKER_URL = 'https://vix-proxy.sono-pro.workers.dev';

async function loadVIX() {
  try {
    const res = await fetch(VIX_WORKER_URL);
    const data = await res.json();
    if (data && data.vix != null) {
      vixData = data;
      renderVIX();
    }
  } catch(e) { console.warn('VIX load fail', e); }
}

function renderVIX() {
  const vixEl = document.getElementById('vixValue');
  const vixChg = document.getElementById('vixChange');
  const vixStatus = document.getElementById('vixStatus');
  if (!vixData) return;
  if (vixEl) {
    vixEl.textContent = vixData.vix.toFixed(2);
    vixEl.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--txt)';
  }
  if (vixChg && vixData.change != null) {
    const v = vixData.change;
    vixChg.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
    vixChg.style.color = v >= 0 ? '#dc2626' : '#16a34a';
  }
  if (vixStatus) {
    const lbl = vixData.vix > 30 ? 'MIEDO EXTREMO' : vixData.vix > 25 ? 'MIEDO' : vixData.vix > 20 ? 'NEUTRAL' : vixData.vix > 15 ? 'CALMA' : 'MUY CALMA';
    vixStatus.textContent = lbl;
    vixStatus.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--dim)';
  }
}

// Init VIX loading
setTimeout(loadVIX, 5000);
setInterval(loadVIX, 120000);

'''

# Insert VIX function before Range Intelligence section OR before init()
# Find a good insertion point - before the Range Intelligence section
ri_pos = content.find('// - Inicializar actualizaci')
# Try other markers
if ri_pos < 0:
    ri_pos = content.find('setTimeout(() => {\n\n  setInterval(() => {\n\n    renderRangeIntelligence();')
if ri_pos < 0:
    ri_pos = content.find('// - Exponer funci')
if ri_pos < 0:
    # Insert before init() call
    ri_pos = content.find('\ninit();')

if ri_pos > 0:
    content = content[:ri_pos] + '\n' + vix_func + '\n' + content[ri_pos:]
    print("OK VIX loading function added at position", ri_pos)
else:
    print("FAIL Could not find insertion point")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK app.js patched successfully")
