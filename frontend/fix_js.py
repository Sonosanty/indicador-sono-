#!/usr/bin/env python3
"""Regenerate sono-terminal.js cleanly."""
import subprocess

with open(r'C:\Users\sparreno\.openclaw\workspace\frontend\sono-terminal.js', 'rb') as f:
    raw = f.read()

# Remove BOM if present
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]
    print("Removed BOM")

# Decode
text = raw.decode('utf-8')

# Normalize line endings
text = text.replace('\r\n', '\n').replace('\r', '\n')

# Strip leading/trailing whitespace
text = text.strip() + '\n'

# Write back as clean UTF-8 without BOM
with open(r'C:\Users\sparreno\.openclaw\workspace\frontend\sono-terminal.js', 'wb') as f:
    f.write(text.encode('utf-8'))

print(f"Written {len(text)} bytes, {text.count(chr(10))} lines")

# Test with node
js_code = text.replace("'", "\\'").replace('\n', '\\n').replace('"', '\\"')
test_script = f"""
const code = '{js_code}';
try {{
    new Function(code);
    console.log('SYNTAX OK');
}} catch(e) {{
    console.log('SYNTAX ERROR: ' + e.message);
    const lines = code.split('\\\\n');
    for (let i = 0; i < lines.length; i++) {{
        try {{ new Function(lines.slice(0, i+1).join('\\\\n')); }}
        catch(e2) {{ console.log('Line ' + (i+1) + ': ' + e2.message); break; }}
    }}
}}
"""

result = subprocess.run(['node', '-e', test_script], capture_output=True, text=True, timeout=10)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr[:500])
