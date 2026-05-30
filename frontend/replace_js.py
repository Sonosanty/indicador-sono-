#!/usr/bin/env python3
import os, re

BASE = r'C:\Users\sparreno\.openclaw\workspace\frontend'

with open(os.path.join(BASE, 'pagina.html'), 'r', encoding='utf-8') as f:
    html = f.read()

with open(os.path.join(BASE, 'sono_v3_complete.js'), 'r', encoding='utf-8') as f:
    js = f.read()

# Replace everything between <script> and </script>
html = re.sub(r'<script>.*?</script>', '<script>\n' + js + '\n</script>', html, flags=re.DOTALL)

with open(os.path.join(BASE, 'pagina.html'), 'w', encoding='utf-8') as f:
    f.write(html)

print('Done:', len(html), 'bytes')
print('Has updateScore:', 'updateScore' in html)
print('Has coin-tab:', 'coin-tab' in html)
