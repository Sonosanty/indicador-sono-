import json,hashlib,hmac,requests,time
c=json.load(open('C:/Users/sparreno/.openclaw/workspace/pionex_credentials.json'))
k=c['api_key'];s=c['api_secret'].encode();base='https://api.pionex.com'

def get(path, params):
    ts=str(int(time.time()*1000))
    params['timestamp']=ts
    sp=sorted(params.items());q='&'.join(f'{x}={y}' for x,y in sp)
    msg='GET/api/v1'+path+'?'+q
    sg=hmac.new(s,msg.encode(),hashlib.sha256).hexdigest()
    h={'PIONEX-KEY':k,'PIONEX-SIGNATURE':sg,'Content-Type':'application/json'}
    return requests.get(base+'/api/v1'+path+'?'+q,headers=h,timeout=15).json()

# Ver API key info (permisos)
print("=== API KEY INFO ===")
r=get('/account/apiKeyInfo',{})
print(json.dumps(r,indent=2)[:600])

# Ver informacion de trading
print("\n=== TRADING INFO ===")
r2=get('/account/info',{})
print(json.dumps(r2,indent=2)[:600])
