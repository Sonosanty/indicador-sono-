import re
import sys

f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

print('Original size:', len(c))

# Find the SECOND <script> tag (the inline one at the bottom)
# The first one is <script src="app.js"></script>
# We need to find the closing </div> that precedes the inline script
# and then remove from <script> to </script>

# Strategy: find the last occurrence of '<script>' WITHOUT src=
# The external one has: <script src="app.js"></script>
# The inline one has: <script>\n\n...

# Find external script first
ext_pos = c.find('<script src="app.js"></script>')
print('External script at:', ext_pos)

# Now find the inline script - it should be after the external one
# Look for <script> that is NOT immediately followed by src=
remaining = c[ext_pos + 30:]
inline_pos = remaining.find('<script>')
print('Inline script (relative to remaining):', inline_pos)

if inline_pos >= 0:
    absolute_inline = ext_pos + 30 + inline_pos
    print('Absolute inline position:', absolute_inline)
    
    close_tag = c.find('</script>', absolute_inline)
    print('Closing </script> at:', close_tag)
    
    if close_tag > absolute_inline:
        # Remove from inline <script> to </script>
        new_c = c[:absolute_inline] + c[close_tag + 9:]
        print('New size:', len(new_c))
        
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_c)
        print('SAVED')
else:
    print('No inline script found')
