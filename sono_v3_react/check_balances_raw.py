import requests, json, time, hashlib, hmac

with open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json') as f:
    creds = json.load(f)

key = creds['api_key']
secret = creds['api_secret']

ts = int(time.time() * 1000)
payload = 'timestamp=' + str(ts)
sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
url = 'https://api.pionex.com/api/v1/account/balances?' + payload + '&signature=' + sig

print(f'GET {url[:60]}...{url[-20:]}')
r = requests.get(url, timeout=15)
print(f'Status: {r.status_code}')
print(f'Response: {json.dumps(r.json(), indent=2)[:2000]}')
