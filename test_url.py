import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://indicador-sono.pages.dev/"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response:
        print("Status code:", response.status)
        print("Content-Type:", response.getheader('Content-Type'))
        html = response.read().decode('utf-8')
        print("HTML length:", len(html))
        print("HTML snippet:", html[:300])
except Exception as e:
    print("Error:", e)
