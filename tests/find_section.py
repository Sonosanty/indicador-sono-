path = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(path, 'rb') as f:
    content = f.read()
idx = content.find(b'VOLUMEN 24H GLOBAL')
start = content.rfind(b'<div', 0, idx)
# Find closing divs
end = content.find(b'</div>\n      </div>\n    </div>\n\n    <!-- CARD: SENTIMENT', idx)
if end < 0:
    end = content.find(b'</div>', idx)
    end2 = content.find(b'</div>', end + 6)
    end3 = content.find(b'</div>', end2 + 6)
    end_final = end3 + 6
else:
    end_final = end + len(b'</div>\n      </div>\n    </div>')

print(repr(content[start:end_final]))
