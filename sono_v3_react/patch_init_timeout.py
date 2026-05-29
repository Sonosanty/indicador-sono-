f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old = '// Hide loader, show app\n\n  setTimeout(()=>{\n\n    const ov=document.getElementById(\'loadOverlay\');\n\n    if(ov)ov.classList.add(\'hidden\');\n\n    const app=document.getElementById(\'app\');\n\n    if(app)app.style.opacity=\'1\';\n\n  },2200);'

new = '// Hide loader, show app (ALWAYS 5s)\n\n  setTimeout(()=>{\n\n    const ov=document.getElementById(\'loadOverlay\');\n\n    if(ov)ov.classList.add(\'hidden\');\n\n    const app=document.getElementById(\'app\');\n\n    if(app)app.style.opacity=\'1\';\n\n    const hs=document.getElementById(\'hSource\');\n\n    if(hs&&hs.textContent.indexOf(\'CONECTANDO\')>=0)hs.textContent=\'BINANCE OFFLINE\';\n\n  },5000);'

print('Old exists:', old in c)
if old in c:
    c = c.replace(old, new)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print('OK. New size:', len(c))
else:
    # Find first 20 chars of old in c
    start = old[:30]
    idx = c.find(start)
    print(f'Searching for {repr(start[:30])}, found at {idx}')
    if idx >= 0:
        print('Around area:', repr(c[idx:idx+80]))
