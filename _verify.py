import os, sys
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = r'C:\Users\sparreno\.openclaw\workspace'

checks = [
  ('cs()', lambda c: 'function cs(' in c),
  ('SCORE_CFG', lambda c: 'SCORE_CFG' in c),
  ('computeRsi3d', lambda c: 'computeRsi3d' in c),
  ('MA_CACHE hash', lambda c: 'hashArr(arr)' in c),
  ('P1 MA6>MA40=12', lambda c: 'm6>m40?12:0' in c),
  ('P1 MA40>MA200=13', lambda c: 'm40>m2?13:0' in c),
  ('P2 ADX>35=15', lambda c: 'a>35?15:a>25?10:3' in c),
  ('P3 pctB<0.15=28', lambda c: 'pb<0.15' in c),
  ('Timeout 20s', lambda c: '20000' in c),
  ('Skeleton error handler', lambda c: 'querySelectorAll' in c and 'skeleton' in c),
  ('loadScoreConfig', lambda c: 'loadScoreConfig' in c),
]

for fname in ['frontend/app.js', 'frontend/metodo.html']:
    path = os.path.join(SCRIPT_DIR, fname)
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    print(f"\n=== {fname} ({len(c)} chars) ===")
    for name, fn in checks:
        mark = "[OK]" if fn(c) else "[--]"
        print(f"  {mark} {name}")

# Special checks
print("\n=== Special checks ===")
path = os.path.join(SCRIPT_DIR, 'frontend/metodo.html')
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
# Check computeScore has new P1 weights
if 'ma6>ma40?12:0' in c and 'computeScore(' in c:
    print("[OK] metodo.html P1 weights updated to Python aligned")
elif 'ma6>ma70?15' in c:
    print("[--] metodo.html STILL has old P1 weights!")

# Check computeScore has new P2 weights  
if 'av>35?15:av>25?10:3' in c:
    print("[OK] metodo.html P2 weights updated to Python aligned")

# Check computeScore has new P3 weights
if 'pb<0.15' in c and 'computeScore(' in c:
    print("[OK] metodo.html P3 weights updated to Python aligned")

print("\n=== Done ===")
