import sys
sys.stdout.reconfigure(encoding='utf-8')

files = ['range_explorer.html', 'trades_explorer.html']
base = r'C:\Users\sparreno\.openclaw\workspace\frontend'

new_links = (
    '<link rel="stylesheet" href="/assets/css/tokens.css">\n'
    '<link rel="stylesheet" href="/assets/css/base.css">\n'
    '<link rel="stylesheet" href="/assets/css/layout.css">\n'
    '<link rel="stylesheet" href="/assets/css/components.css">\n'
)

for fname in files:
    path = f'{base}\\{fname}'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    old_link = '<link rel="stylesheet" href="style.css">'
    
    if old_link in c:
        c = c.replace(old_link, new_links.rstrip('\n'))
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'{fname}: style.css -> 4 CSS modules')
    else:
        print(f'{fname}: style.css NOT FOUND')
        # Check for any link tag
        idx = c.find('style.css')
        if idx >= 0:
            print(f'  Found at {idx}: {repr(c[idx-10:idx+30])}')
        else:
            print(f'  Completely not found')
