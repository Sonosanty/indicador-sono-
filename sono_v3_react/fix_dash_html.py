# Remove inline JS from dashboard HTML, keep only external app.js
import re

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

print(f'Original: {len(c)} chars')

# The inline script is NOT between <script> and </script> tags that Python can find
# because <script> appears as a word inside a <div> that's rendered
# Let's try a different approach: find all <script> occurrences

count = 0
for m in re.finditer(r'<\s*script[^>]*>', c):
    count += 1
    start = m.start()
    end = m.end()
    context = c[max(0,start-60):end+60]
    has_src = 'src=' in context[:100]
    print(f'  [{count}] Script at {start}-{end}: has_src={has_src}, ctx=[{context.strip()[:100]}]')

# If we found the inline one (no src), remove it
# We can strip from after the last </div> or last meaningful content before </body>

# Alternative approach: just keep everything before the FIRST <script> line that has no src
# and everything after its matching </script>
lines = c.split('\n')
new_lines = []
skip = False
in_inline = False
for line in lines:
    stripped = line.strip()
    if stripped == '<script>' and not has_external_app_js:
        # Check if this is inline (no src=)
        in_inline = True
        skip = True
        continue
    if in_inline and '</script>' in stripped:
        skip = False
        in_inline = False
        continue
    if not skip:
        new_lines.append(line)

new_c = '\n'.join(new_lines)
print(f'After stripping inline: {len(new_c)} chars')

if len(new_c) != len(c):
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(new_c)
    print('SAVED')
else:
    print('No change - inline script not found via line-by-line')
