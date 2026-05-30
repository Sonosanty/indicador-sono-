import json,hashlib,hmac,requests,time
c=json.load(open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json'))
k=c['api_key'];s=c['api_secret'].encode();base='https://api.pionex.com'

def post_order(data_dict):
    ts=str(int(time.time()*1000))
    body=json.dumps(data_dict)
    q='timestamp='+ts
    msg='POST/api/v1/trade/order?'+q+body
    sg=hmac.new(s,msg.encode(),hashlib.sha256).hexdigest()
    h={'PIONEX-KEY':k,'PIONEX-SIGNATURE':sg,'Content-Type':'application/json'}
    return requests.post(base+'/api/v1/trade/order?'+q,headers=h,data=body,timeout=15).json()

print("=== SELL SOL size=0.77 ===")
r=post_order({'symbol':'SOL_USDT','side':'SELL','type':'MARKET','size':'0.77'})
print(json.dumps(r,indent=2)[:400])

time.sleep(2)

print("\n=== BALANCE FINAL ===")
ts=str(int(time.time()*1000));q='timestamp='+ts
sg=hmac.new(s,('GET/api/v1/account/balances?'+q).encode(),hashlib.sha256).hexdigest()
h={'PIONEX-KEY':k,'PIONEX-SIGNATURE':sg,'Content-Type':'application/json'}
r2=requests.get(base+'/api/v1/account/balances?'+q,headers=h,timeout=15).json()
if r2.get('result'):
    for b in r2['data']['balances']:
        if float(b['free'])>0.0001: print(f'  {b["coin"]}: free={b["free"]}')
