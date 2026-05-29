import re

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

print('Size before:', len(c))

# Remove ONLY <script src="app.js"></script> tag, NOT occurrences inside the code
c = re.sub(r'<script\s+src=["\']app\.js["\']>\s*</script>\s*', '', c)

print('Size after:', len(c))

# Count script tags
tags = re.findall(r'<script[^>]*>', c)
print('Script tags:', len(tags))

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('SAVED')
