path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(path, 'rb') as f:
    content = f.read()
idx = content.find(b'VOLUMEN 24H GLOBAL')
# Find start of outer border-top wrapper div
outer_start = content.rfind(b'<div style="border-top', 0, idx)
# Find after closing </div> of the section that ends before SENTIMENT
end_marker = b'    <!-- CARD: SENTIMENT + CONFIANZA -->'
end_idx = content.find(end_marker, idx)
# Show from the start of the border-top div to just before SENTIMENT card
print(repr(content[outer_start:end_idx]))
