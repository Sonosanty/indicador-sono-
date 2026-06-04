import os, sys
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = r'C:\Users\sparreno\.openclaw\workspace'

path = os.path.join(SCRIPT_DIR, 'frontend', 'metodo.html')
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old_style_start = '<style>\n:root{--bg:#080c14;--bg1:#0c1220;--bg2:#111828;--bg3:#18202e;--bg4:#1e2838;--bg5:#242f40;--border:rgba(255,255,255,.06);--border2:rgba(255,255,255,.10);--border3:rgba(255,255,255,.16);--text:#dce8f8;--text2:#8ba0bb;--text3:#4d6078;--dim:#2d3f55;--blue:#4f8ef7;--blue2:#2563eb;--green:#22c55e;--red:#ef4444;--amber:#f59e0b;--purple:#a855f7;--cyan:#06b6d4;--teal:#14b8a6;--mono:'

new_style = (
    '<link rel="stylesheet" href="/assets/css/tokens.css">\n'
    '<link rel="stylesheet" href="/assets/css/base.css">\n'
    '<link rel="stylesheet" href="/assets/css/layout.css">\n'
    '<link rel="stylesheet" href="/assets/css/components.css">\n'
    '<style>\n'
    '/* Metodo — only page-specific overrides */\n'
    'html{background:var(--bg-base);color:var(--tx1);font-family:var(--mono);font-size:13px;overflow-x:hidden}\n'
    'body{min-height:100vh;display:flex;flex-direction:column}\n'
    '@media(max-width:800px){.shell-metodo{grid-template-columns:1fr;height:auto}.sidebar{position:static;height:auto;overflow:visible}.score-wrap{padding:.8rem 0}}\n'
    '</style>'
)

if old_style_start in c:
    # Find the end of the style block starting with this content
    start_idx = c.find(old_style_start)
    end_style_idx = c.find('</style>', start_idx)
    end_idx = end_style_idx + 8
    
    before = c[:start_idx]
    after = c[end_idx:]
    c = before + new_style + after
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'OK - replaced style block ({end_idx - start_idx} chars -> {len(new_style)} chars)')
else:
    print('Old style start not found')
    idx = c.find('--bg:#080c14')
    if idx >= 0:
        print(f'Found partial at {idx}: ...{repr(c[idx:idx+100])}...')
    else:
        print('Completely not found')
