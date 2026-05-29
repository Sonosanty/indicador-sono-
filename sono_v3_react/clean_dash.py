import re, sys

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

print('Size:', len(c))

# Remove external app.js script tag
ext_tag = '<script src="app.js"></script>'
if ext_tag in c:
    c = c.replace(ext_tag, '')
    print('Removed external app.js')
else:
    print('External app.js not found')

# Count script tags
tags = re.findall(r'<script[^>]*>', c)
print('Script tags:', len(tags))
for t in tags:
    print('  ', t[:50])

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)

print('Saved:', len(c))
