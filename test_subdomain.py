import urllib.request
import json

url = "https://api.cloudflare.com/client/v4/accounts/52d680dcbc593ed3323b902f437132cb/workers/subdomain"
data = json.dumps({"subdomain": "sonosanty"}).encode()
req = urllib.request.Request(
    url, 
    data=data, 
    headers={
        "Authorization": "Bearer qu0p4VN-Opw2X-t4ZYe-PLcusEdJx4sEpXhmXn9i-Wo.5wVNzCEthAq5x1W2VqRrqM7RurU_rtBHeGuExHDsHDE",
        "Content-Type": "application/json"
    },
    method="PUT"
)
try:
    with urllib.request.urlopen(req) as r:
        print("Success:")
        print(r.read().decode())
except Exception as e:
    print("Error:")
    if hasattr(e, 'read'):
        print(e.read().decode())
    else:
        print(e)
