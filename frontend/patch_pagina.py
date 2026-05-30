#!/usr/bin/env python3
"""Aplicar parches críticos a pagina.html: CSP, 12+ IDs, VIX, RSI3D, macro, timestamps"""
import re, os

HTML_PATH = os.path.join(os.path.dirname(__file__), 'pagina.html')

with open(HTML_PATH, 'r', encoding='utf-8') as f:
    html = f.read()

original_len = len(html)
changes = 0

# 1. CSP meta tag después de <title>
if '<meta http-equiv="Content-Security-Policy"' not in html:
    csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; connect-src \'self\' https://api.binance.com wss://stream.binance.com:9443 https://api.coingecko.com https://api.alternative.me https://vix-proxy.sonosanty.workers.dev https://fonts.gstatic.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data:; frame-ancestors \'none\';\"/>'
    html = html.replace('<meta name="viewport"', csp + '\n<meta name="viewport"')
    changes += 1
    print('1. CSP añadido')

# 2. Añadir funciones nuevas antes de // ASSET SELECTOR
asset_selector_marker = '// Asset selector'
new_funcs = '''
// === v3.1: funciones anadidas ===
function updateUI(sc,asset){
 asset=asset||'BTC';
 document.getElementById('smScore').textContent=sc.total;
 document.getElementById('heroScore').textContent=sc.total;
 document.getElementById('heroScoreNum').textContent=sc.total;
 document.getElementById('heroBar').style.width=sc.total+'%';
 var se=document.getElementById('smSignal');
 if(se){se.textContent=sc.signal;se.className='score-signal '+(sc.signal.indexOf('COMPRA')>=0?'score-buy':sc.signal.indexOf('VENTA')>=0||sc.signal==='CAPITULACION'?'score-sell':sc.signal==='ACUMULAR'?'score-accum':'score-neutral')}
 document.getElementById('heroSignal').textContent=sc.signal;
 document.getElementById('heroDecision').textContent=sc.decision;
 document.getElementById('heroZone').textContent=sc.zone;
 document.getElementById('smDecision').textContent=sc.decision+' - '+sc.zone;
 document.getElementById('smP1').textContent='P1: '+sc.p1+'/35';
 document.getElementById('smP2').textContent='P2: '+sc.p2+'/35';
 document.getElementById('smP3').textContent='P3: '+sc.p3+'/30';
 document.getElementById('smRSI').textContent='RSI: '+sc.rsi.toFixed(1);
 document.getElementById('heroRsi').textContent=sc.rsi.toFixed(1);
 document.getElementById('smADX').textContent='ADX: '+sc.adx.toFixed(1);
 document.getElementById('heroAdx').textContent=sc.adx.toFixed(1);
 document.getElementById('heroTime').textContent=new Date().toLocaleTimeString('es-ES');
}
async function loadVIX(){
 try{var d=await fetch('https://vix-proxy.sonosanty.workers.dev/',{cache:'no-store'});var j=await d.json();document.getElementById('vixValue').textContent=(parseFloat(j.vix)||0).toFixed(2)}
 catch(ex){document.getElementById('vixValue').textContent='--'}
}
async function loadRSI3D(){
 try{var d=await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=3d&limit=20',{cache:'no-store'});var j=await d.json();var cl=j.map(function(k){return parseFloat(k[4])});var r=rsi(cl,14);var v=r[r.length-1];
 document.getElementById('rsiMacroValue').textContent=v.toFixed(1);
 var lbl=v<30?'Sobreventa':v>70?'Sobrecompra':v<45?'Bajista neutral':v>55?'Alcista neutral':'Neutral';
 document.getElementById('rsiMacroLabel').textContent=lbl}
 catch(ex){}
}
// === fin funciones anadidas ===

'''
if new_funcs.strip() not in html:
    idx = html.find(asset_selector_marker)
    if idx > 0:
        html = html[:idx] + new_funcs + html[idx:]
        changes += 1
        print('2. Funciones v3.1 anadidas')
    else:
        print('2. WARN: asset_selector_marker no encontrado')

# 3. Añadir previewPrice/previewChange en ap()
old_ap = "document.getElementById('btcEurLive').textContent='"
if old_ap in html:
    insert_after = old_ap + '\\\\u20AC' + "'+fn(eu,2);"
    new_text = insert_after + "document.getElementById('previewPrice').textContent='$'+fn(u,2);document.getElementById('previewChange').textContent=(up?'+':'')+fn(c,2)+'%';"
    html = html.replace(insert_after, new_text)
    changes += 1
    print('3. previewPrice/Change anadidos')

# 4. Añadir lastUpdateBTC + lastUpdateMacro timestamps
for marker, field in [('bdg.className=', 'lastUpdateBTC'), ('}catch(ex){}\"', 'lastUpdateMacro')]:
    pass

# Instead, add lastUpdateBTC in ap() after badge
import re
pattern_price = r"(document\.getElementById\('btcEurLive'\)\.textContent='[^']+'\s*\+fn\(eu,2\);)"
if re.search(pattern_price, html):
    html = re.sub(pattern_price, r'\1' + " document.getElementById('lastUpdateBTC').textContent='Actualizado: '+new Date().toLocaleTimeString('es-ES');", html)
    changes += 1
    print('4. lastUpdateBTC anadido')

# 5. Macro state + regimen en loadCG
# Find loadCG end
old_cg = "document.getElementById('volumeValue').textContent='Vol 24h: '+fb(g.total_volume?.usd||0)}catch(ex){}}"
new_cg = """document.getElementById('volumeValue').textContent='Vol 24h: '+fb(g.total_volume?.usd||0);
var fg=parseInt(document.getElementById('fearValue')?.textContent)||50;var bd=mp.btc||50;
var state='',text='',score=50;
if(fg<25&&bd>55){state='ACUMULACION';text='Miedo extremo + dominancia alta';score=28}
else if(fg<40){state='PRECAUCION';text='Miedo en el mercado, esperar confirmacion';score=45}
else if(fg<55){state='NEUTRAL';text='Mercado sin direccion clara';score=55}
else if(fg<75){state='OPTIMISMO';text='Confianza creciente';score=72}
else{state='EUFORIA';text='Greed extremo, posible techo';score=85}
document.getElementById('macroState').textContent=state;
document.getElementById('macroText').textContent=text;
document.getElementById('macroScore').textContent=score;
var ec=document.getElementById('cardMacroState');if(ec)ec.className='estado '+(score<35?'macro-bear':score<55?'macro-neutral':'macro-bull');
document.getElementById('lastUpdateMacro').textContent='Actualizado: '+new Date().toLocaleTimeString('es-ES');
document.getElementById('cryptoRegimeLabel').textContent=state;
document.getElementById('cryptoRegimeDetail').textContent=text+' | Dom BTC '+bd.toFixed(1)+'% | F&G '+fg;
}catch(ex){}"""
if old_cg in html:
    html = html.replace(old_cg, new_cg)
    changes += 1
    print('5. Macro state + regimen anadidos')

# 6. Añadir loadVIX() y loadRSI3D() a INIT
old_init = "loadFN();loadCG();"
new_init = "loadFN();loadCG();loadVIX();loadRSI3D();setInterval(function(){loadFN();loadCG();loadVIX();loadRSI3D()},120000);"
if old_init in html and new_init not in html:
    html = html.replace(old_init, new_init)
    changes += 1
    print('6. Init con VIX + RSI3D anadido')

with open(HTML_PATH, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\\nHecho. {changes} cambios aplicados. {len(html)} bytes ({len(html)-original_len} delta)')
