"""Clean duplicate functions from trades/app.js"""
import re

with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all function/method declarations
lines = content.split('\n')
print(f"Total lines: {len(lines)}")

# Count occurrences of each function
funcs = {}
for i, line in enumerate(lines):
    m = re.match(r'^\s*(function\s+\w+|let\s+\w+\s*=|const\s+\w+\s*=)', line)
    if m:
        name = m.group(1)
        funcs.setdefault(name, []).append(i + 1)

for name, locs in funcs.items():
    if len(locs) > 1:
        print(f"DUPLICATED: '{name}' at lines {locs}")

# Remove duplicates by finding text boundaries
# Strategy: find second occurrence of each duplicate block and remove it

# Known duplicates:
# 1. clearSignals (already identical, keep first)
# 2. realTrades / tradeIdCounter / createTradeFromSignal / updateOpenTrades
# 3. equityCanvas / buildEquityStats / renderFilteredSignals
# 4. setTimeout hooks (filter, equity canvas)
# 5. The whole MULTI-TIMEFRAME section at line ~697 (not duplicate, keep it)

# Find the SECOND occurrence of "// NUEVO: EQUITY CURVE" block and remove it
idx1 = content.find('// NUEVO: EQUITY CURVE + RENDIMIENTO + FILTROS')
idx2 = content.find('// NUEVO: EQUITY CURVE + RENDIMIENTO + FILTROS', idx1 + 10)

if idx1 >= 0 and idx2 >= 0:
    print(f"Found NUEVO block 1 at {idx1}, NUEVO block 2 at {idx2}")
    # Find the next "MULTI-TIMEFRAME" after idx2
    mtf_start = content.find('// MULTI-TIMEFRAME ANALYSIS', idx2)
    if mtf_start > 0:
        print(f"MULTI-TIMEFRAME starts at {mtf_start}")
        # Remove from idx2 to mtf_start
        before = content[:idx2]
        after = content[mtf_start:]
        new_content = before + after
        with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js', 'w', encoding='utf-8') as f:
            f.write(new_content)
        lines2 = new_content.split('\n')
        print(f"After cleanup: {len(lines2)} lines")

# Now find duplicate of createTradeFromSignal and updateOpenTrades after the equity section
content2 = open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js', 'r', encoding='utf-8').read()

# Find the second "// TRADES REALES" or the second "let realTrades"
locs2 = [m.start() for m in re.finditer(r'let realTrades\s*=\s*\[\]', content2)]
if len(locs2) > 1:
    print(f"Found 'let realTrades' at positions {locs2}")
    # Find where the first one ends (after renderRealTrades)
    # The first one is in the TRADES REALES section
    # The second one is in the EQUITY section (which we already removed? or maybe in another block)
    
# Final count
content3 = open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js', 'r', encoding='utf-8').read()
lines3 = content3.split('\n')
print(f"Final lines: {len(lines3)}")

# Verify
funcs3 = {}
for i, line in enumerate(lines3):
    m = re.match(r'^\s*(function\s+\w+|let\s+\w+\s*=)', line)
    if m:
        name = m.group(1)
        funcs3.setdefault(name, []).append(i + 1)

for name, locs in funcs3.items():
    if len(locs) > 1:
        print(f"STILL DUPLICATED: '{name}' at lines {locs}")
