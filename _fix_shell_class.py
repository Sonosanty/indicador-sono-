import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'C:\Users\sparreno\.openclaw\workspace\frontend\metodo.html'
c = open(path, 'r', encoding='utf-8').read()

# Replace shell -> shell-metodo in the class attribute
c = c.replace('class="shell"', 'class="shell-metodo"')

open(path, 'w', encoding='utf-8').write(c)

# Verify
c2 = open(path, 'r', encoding='utf-8').read()
print('shell-metodo found:', 'shell-metodo' in c2)
print('old shell standalone:', 'class="shell"' in c2 or 'class=shell' in c2)
print('Done')
