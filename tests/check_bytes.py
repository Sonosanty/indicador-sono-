path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(path, 'rb') as f:
    content = f.read()
idx = content.find(b'VOLUMEN 24H')
chunk = content[idx:idx+300]
print(repr(chunk))
