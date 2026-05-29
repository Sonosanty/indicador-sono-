# Check the actual bytes around the pressure tag
path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\app.js'
with open(path, 'rb') as f:
    content = f.read()
idx = content.find(b'<div class="range-pressure">')
if idx >= 0:
    print('Found at byte:', idx)
    # Show surrounding 600 bytes
    chunk = content[idx:idx+600]
    # Print as escaped string for debugging
    print(repr(chunk))
else:
    print('NOT FOUND')
    # Try search for partial
    idx2 = content.find(b'range-pressure')
    if idx2 >= 0:
        print('Found partial at:', idx2)
        print(repr(content[idx2-50:idx2+200]))
