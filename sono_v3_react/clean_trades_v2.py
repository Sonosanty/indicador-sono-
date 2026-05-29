import re

with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js.bak', 'r', encoding='utf-8') as f:
    content = f.read()

orig_len = len(content)

# 1. Remove the second NUEVO: EQUITY CURVE block
pattern = r'// ═+[\n ]*// NUEVO: EQUITY CURVE \+ RENDIMIENTO \+ FILTROS\n// ═+'
matches = list(re.finditer(pattern, content))
print(f'NUEVO EQUITY blocks found: {len(matches)}')
if len(matches) >= 2:
    start2 = matches[1].start()
    mtf_pattern = r'// ═+[\n ]*// MULTI-TIMEFRAME ANALYSIS'
    mtf_match = re.search(mtf_pattern, content[start2:])
    if mtf_match:
        end2 = start2 + mtf_match.start()
        content = content[:start2] + content[end2:]
        print(f'Removed from {start2} to {end2} ({end2-start2} chars)')

# 2. Remove duplicate clearSignals definitions
lines = content.split('\n')
new_lines = []
clear_count = 0
for line in lines:
    if 'function clearSignals' in line:
        clear_count += 1
        if clear_count > 1:
            continue
    new_lines.append(line)
content = '\n'.join(new_lines)
print(f'Removed {clear_count - 1} duplicate clearSignals')

# 3. Remove duplicate renderRealTrades (after the first one, its body was identical)
lines = content.split('\n')
render_positions = [i for i, l in enumerate(lines) if 'function renderRealTrades' in l]
print(f'renderRealTrades positions: {render_positions}')
if len(render_positions) >= 2:
    # Find start of second one, and keep going until the EQUITY CURVE section
    l2 = render_positions[1]
    # Remove from l2 to wherever the next major section starts or end
    # Find the line with '// EQUITY CURVE' after l2
    for i in range(l2, len(lines)):
        if 'EQUITY CURVE' in lines[i] and not 'NUEVO' in lines[i][:20]:
            content = '\n'.join(lines[:l2] + lines[i:])
            print(f'Removed renderRealTrades dup at line {l2}, rejoined at line {i}')
            break

# 4. Fix timeline id
lines = content.split('\n')
for i, l in enumerate(lines):
    if "document.getElementById('timeline')" in l:
        lines[i] = l.replace("document.getElementById('timeline')", "document.getElementById('filteredTimeline')")
        print(f'Fixed timeline id at line {i}')
        break  # one occurrence

content = '\n'.join(lines)

# 5. Also fix the ALL-caps TIEMPO reference that should be filteredTimeline
# Check for other occurrences
for i, l in enumerate(content.split('\n')):
    if "'timeline'" in l and 'filteredTimeline' not in l and 'tl' not in l:
        pass  # check manually later

with open(r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\trades\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

final_lines = content.split('\n')
print(f'Final: {len(final_lines)} lines, {len(content)} chars (from {orig_len})')

# Verify no more duplicates
contents = content
for func in ['function clearSignals', 'function createTradeFromSignal', 'function updateOpenTrades', 'function renderRealTrades', 'function buildEquityStats']:
    count = contents.count(func)
    print(f'{func}: {count} occurrence(s)')
