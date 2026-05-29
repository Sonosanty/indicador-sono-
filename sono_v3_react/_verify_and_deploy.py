import subprocess, os, shutil

SRC = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare'
BACK = r'C:\Users\sparreno\.openclaw\workspace\backup_final_20260527'

# Read HTML and extract JS
html_path = os.path.join(SRC, 'dashboard_sono', 'index.html')
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Extract JS
start = html.find('<script>')
end = html.find('</script>', start)
js = html[start+8:end]

print(f'HTML: {len(html)} bytes')
print(f'JS: {len(js)} bytes')

# Write temp
tmp = r'C:\Users\sparreno\AppData\Local\Temp\final_verify.js'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(js)

# Verify with Node
r = subprocess.run(
    'node -e "try{new Function(require(\'fs\').readFileSync(\'C:/Users/sparreno/AppData/Local/Temp/final_verify.js\',\'utf-8\'));console.log(\'OK\')}catch(e){console.log(\'FAIL:\'+e.message.split(\'\\n\')[0]);process.exit(1)}"',
    capture_output=True, text=True, shell=True
)
print('Verify:', r.stdout.strip())

if 'OK' in r.stdout:
    print('\n✅ JS syntax OK. Ready to deploy.')
    print('\nTo deploy, run:')
    print('  cd C:\\Users\\sparreno\\.openclaw\\workspace\\indicador_cloudflare')
    print('  npx wrangler pages deploy . --project-name indicador-sono --branch main')
else:
    print('ERROR:', r.stderr)
    print('JS first 100 chars:', repr(js[:100]))
    print('JS last 100 chars:', repr(js[-100:]))
