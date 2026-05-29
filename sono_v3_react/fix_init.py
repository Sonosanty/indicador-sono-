f = r'C:\Users\sparreno\.openclaw\workspace\indicador_cloudflare\dashboard_sono\app.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Find init function
idx = c.find('async function init(){')
if idx < 0:
    idx = c.find('async function init()')
print(f'init found at: {idx}')

if idx >= 0:
    # Find the closing } of init by counting braces
    pos = idx
    brace_count = 0
    started = False
    while pos < len(c):
        ch = c[pos]
        if ch == '{':
            brace_count += 1
            started = True
        elif ch == '}':
            brace_count -= 1
            if started and brace_count == 0:
                # This is the closing brace of init
                init_end = pos + 1
                break
        pos += 1
    
    old_init = c[idx:init_end]
    print(f'Old init: {len(old_init)} chars')
    print(f'First 80: {repr(old_init[:80])}')
    print(f'Last 80: {repr(old_init[-80:])}')
    
    new_init = '''async function init(){
  // Load all without blocking - overlay shows immediately
  Promise.all(Object.keys(ASSETS_CFG).map(function(k){return loadTicker(k);}));
  loadCandles(activeAsset);
  loadCandles1m(activeAsset);
  connectWS(activeAsset);
  connectWS1m(activeAsset);
  setTimeout(function(){['ETH','SOL','XRP'].forEach(function(k,i){setTimeout(function(){loadCandles(k);},(i+1)*2000);});},1000);
  setTimeout(function(){['ETH','SOL','XRP'].forEach(function(k,i){setTimeout(function(){loadCandles1m(k);},(i+1)*3000);});},2000);
  var ov=document.getElementById('loadOverlay');
  if(ov)ov.classList.add('hidden');
  var ap=document.getElementById('app');
  if(ap)ap.style.opacity='1';
  var hs=document.getElementById('hSource');
  if(hs)hs.textContent='CONECTANDO';
}'''
    
    c2 = c.replace(old_init, new_init)
    
    if 'CONECTANDO' in c2 and 'async function init' in c2:
        # Verify the new init has different content (not the old await version)
        new_idx = c2.find('async function init(){')
        new_end = new_idx + len(new_init)
        print(f'New init: {new_end - new_idx} chars')
        print(f'New first 80: {repr(c2[new_idx:new_idx+80])}')
        
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(c2)
        print('SAVED')
    else:
        print('CRITICAL: Something went wrong!')
else:
    print('init not found!')
