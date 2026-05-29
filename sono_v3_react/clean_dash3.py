import re, shutil

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'

# Read fresh from backup
shutil.copy2(
    r'C:\Users\sparreno\.openclaw\workspace\backup_sono_20260527-1535\dashboard_sono\index.html',
    f
)

with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

print('Restored size:', len(c))

# Find all script tags using regex
for m in re.finditer(r'<script[^>]*>', c):
    tag = m.group()
    pos = m.start()
    has_src = 'src=' in tag
    print(f'  Script at {pos}: src={has_src} -> {tag[:60]}')

# Remove ONLY the external one
c2 = re.sub(r'<script\s+src="app\.js">\s*</script>\s*', '', c)

print(f'After removal: {len(c2)} chars')

# Verify
tags_after = re.findall(r'<script[^>]*>', c2)
print(f'Remaining script tags: {len(tags_after)}')
for t in tags_after:
    print(f'  {t[:50]}')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c2)

print('SAVED')
