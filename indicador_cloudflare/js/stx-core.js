/* SONO TERMINAL X — stx-core.js FINAL v2
   Fuente primaria: CoinGecko (sin bloqueo 451)
   Fallback: Binance directa | Proxy Worker
   Verificado: async renderRangosPage, sin onclick inline
*/
'use strict';
const PROXY='https://vix-proxy.sonosanty.workers.dev';
const BN='https://api.binance.com/api/v3';
const CG_BASE='https://api.coingecko.com/api/v3';
const CG_IDS={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',XRP:'ripple'};
const COINS={BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};
let coin='BTC',livePx=0,eurRate=1.08,ws=null,wsLast=0,wsRetry=false,wsTmr=null;
let allTrades=[],logs=[],lastScore=null,eqChart=null;
const $=id=>document.getElementById(id);
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
const setC=(id,c)=>{const e=$(id);if(e)e.style.color=c;};
const fU=(n,d=0)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fP=n=>(n>=0?'+':'')+n.toFixed(2)+'%';
const fR=n=>(n>=0?'+':'')+n.toFixed(2)+'R';
const fK=n=>n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':'$'+Math.round(n).toLocaleString();
const G='var(--green)',R='var(--red)',T='var(--teal,#00d4a0)';
const cGR=n=>n>=0?G:R;

async function fetchJ(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw Error(r.status+' '+url.substring(0,60));
  return r.json();
}

/* ════════════════════════════════════════════
   WebSocket — intento pero no bloqueante si falla
════════════════════════════════════════════ */
function startWS(){
  if(ws){try{ws.close();}catch(e){}ws=null;}
  const sym=COINS[coin].toLowerCase();
  try{ws=new WebSocket('wss://stream.binance.com:9443/ws/'+sym+'@aggTrade');}
  catch(e){setBadge(false,'WS no disponible');return;}
  ws.onopen=()=>{wsLast=Date.now();setBadge(true);addLog('WS',T,'WebSocket '+coin+' conectado');};
  ws.onmessage=e=>{
    wsLast=Date.now();
    const ts=new Date().toLocaleTimeString('es-ES');
    set('clockEl',ts);set('tTick','Tick: '+ts);set('sys-tick',ts);
    try{const d=JSON.parse(e.data);livePx=parseFloat(d.p);onTick(livePx);}catch(e){}
  };
  ws.onerror=()=>setBadge(false,'WS error (451?)');
  ws.onclose=()=>{setBadge(false,'WS cerrado');scheduleWS();};
}
function startWatchdog(){
  if(wsTmr)clearInterval(wsTmr);
  wsTmr=setInterval(()=>{if(wsLast>0&&Date.now()-wsLast>15000){setBadge(false,'Sin tick');scheduleWS();}},5000);
}
function scheduleWS(){if(wsRetry)return;wsRetry=true;setTimeout(()=>{wsRetry=false;startWS();},5000);}
function setBadge(live,reason){
  const b=$('wsBadge'),d=$('wsDot'),t=$('wsText');
  if(!b)return;
  b.className='ws-chip '+(live?'ws-live':'ws-dead');
  if(d)d.className='ws-dot '+(live?'dot-t':'dot-r');
  if(t)t.textContent=live?'LIVE':'SIN SEÑAL';
  set('sys-ws',live?'✅ Conectado':'⚠️ '+(reason||'Desconectado')+' (datos REST activos)');
}
function onTick(px){
  updatePxDOM(px);
  const sr=$('srLive');if(sr)sr.textContent=fU(px,2);
  document.querySelectorAll('[data-rl]').forEach(el=>el.textContent=fU(px,2));
  updateOpenR(px);
  set('sys-price',fU(px,2));
  set('trd-btcpx',fU(px,2));
}
function updatePxDOM(px){
  set('priceUSD',fU(px,2));set('tBTCPx',fU(px,2));
  set('priceEUR','≈ '+Math.round(px*eurRate).toLocaleString('es-ES')+' EUR');
  const rp=$('rangePx');if(rp)rp.textContent=fU(px,2);
}

/* ════════════════════════════════════════════
   TICKER — CoinGecko primero (sin 451)
════════════════════════════════════════════ */
async function loadTicker(){
  try{
    // 1. Intentar Binance via proxy
    const sym=COINS[coin];
    let d=null;
    try{d=await fetchJ(PROXY+'/btc?symbol='+sym);}catch(e){}
    if(!d)try{d=await fetchJ(BN+'/ticker/24hr?symbol='+sym);}catch(e){}

    if(d&&d.lastPrice){
      const px=parseFloat(d.lastPrice),h=parseFloat(d.highPrice),l=parseFloat(d.lowPrice);
      const vol=parseFloat(d.volume),chg=parseFloat(d.priceChangePercent);
      if(livePx===0){livePx=px;updatePxDOM(px);}
      set('h24',fU(h));set('l24',fU(l));
      const vs=vol>=1e6?(vol/1e6).toFixed(2)+'M':vol>=1e3?(vol/1e3).toFixed(1)+'K':vol.toFixed(0);
      set('vol24',vs+' '+coin);
      const ce=$('priceChg');
      if(ce){ce.textContent=(chg>=0?'▲ +':'▼ ')+Math.abs(chg).toFixed(2)+'%';ce.className='ph-chg '+(chg>=0?'up':'dn');ce.style.display='';}
      set('tBTCChg',(chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
      set('trd-btcchg',(chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
      set('sys-rest','✅ Binance OK');
      return;
    }
  }catch(e){}

  // 2. Fallback CoinGecko (FUENTE REAL, sin 451)
  try{
    const cgId=CG_IDS[coin]||'bitcoin';
    const cg=await fetchJ(CG_BASE+'/simple/price?ids='+cgId+'&vs_currencies=usd,eur&include_24hr_change=true&include_24hr_vol=true');
    const data=cg[cgId];
    const px=data.usd,chg=data.usd_24h_change||0;
    livePx=px;updatePxDOM(px);
    const ce=$('priceChg');
    if(ce){ce.textContent=(chg>=0?'▲ +':'▼ ')+Math.abs(chg).toFixed(2)+'%';ce.className='ph-chg '+(chg>=0?'up':'dn');ce.style.display='';}
    set('h24','--');set('l24','--');
    set('vol24',data.usd_24h_vol?fK(data.usd_24h_vol)+'USD':'--');
    set('tBTCChg',(chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
    set('trd-btcchg',(chg>=0?'+':'')+chg.toFixed(2)+'% 24h');
    set('sys-rest','✅ CoinGecko (Binance no disponible)');
    addLog('TICKER',T,'Precio CoinGecko: '+fU(px,2)+' · '+chg.toFixed(2)+'%');
  }catch(e2){console.error('[STX] ticker todo falló',e2);set('sys-rest','❌ Sin precio');}
}

/* ════════════════════════════════════════════
   KLINES — CoinGecko OHLCV como fuente real
   cuando Binance devuelve 451
════════════════════════════════════════════ */
async function loadKlines(tf,limit=220){
  const sym=COINS[coin];

  // 1. Proxy Worker
  try{
    const d=await fetchJ(PROXY+'/klines?symbol='+sym+'&interval='+tf+'&limit='+limit);
    if(d&&d.length>10)return d.map(c=>({t:+c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4],v:+c[5]}));
  }catch(e){}

  // 2. Binance directa
  try{
    const d=await fetchJ(BN+'/klines?symbol='+sym+'&interval='+tf+'&limit='+limit);
    if(d&&d.length>10)return d.map(c=>({t:+c[0],o:+c[1],h:+c[2],l:+c[3],c:+c[4],v:+c[5]}));
  }catch(e){}

  // 3. CoinGecko OHLCV — fuente real sin 451
  // CoinGecko devuelve ~48 velas (30min) para days=1, ~168 velas (1h) para days=7
  const cgId=CG_IDS[coin]||'bitcoin';
  const days=tf==='1d'?30:tf.includes('h')&&parseInt(tf)>=4?7:1;
  try{
    const d=await fetchJ(CG_BASE+'/coins/'+cgId+'/ohlc?vs_currency=usd&days='+days);
    // d = [[timestamp, open, high, low, close], ...]
    if(d&&d.length>10){
      addLog('KLINES','var(--amber)','CoinGecko OHLCV · '+d.length+' velas ·'+tf);
      return d.map(c=>({t:c[0],o:c[1],h:c[2],l:c[3],c:c[4],v:1}));
    }
  }catch(e){}

  // 4. Sin datos — devolver array vacío (no crash)
  console.warn('[STX] loadKlines: todas las fuentes fallaron para '+tf);
  return[];
}

/* ════════════════════════════════════════════
   Cálculos matemáticos
════════════════════════════════════════════ */
function smaL(arr,p){if(arr.length<p)return null;return arr.slice(-p).reduce((a,b)=>a+b,0)/p;}
function rsiL(cl,p=14){
  if(cl.length<p+1)return null;
  let g=0,l=0;
  for(let i=cl.length-p;i<cl.length;i++){const d=cl[i]-cl[i-1];if(d>0)g+=d;else l-=d;}
  return Math.round(100-(100/(1+(g/p)/((l/p)||0.001))));
}
function adxL(hi,lo,cl,p=14){
  if(cl.length<p+2)return null;
  let pd=0,md=0,tr=0;
  for(let i=cl.length-p;i<cl.length;i++){
    const pH=hi[i]-hi[i-1],mL=lo[i-1]-lo[i];
    pd+=(pH>mL&&pH>0?pH:0);md+=(mL>pH&&mL>0?mL:0);
    tr+=Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1]));
  }
  const pDI=100*pd/(tr||1),mDI=100*md/(tr||1);
  return Math.round(Math.abs(pDI-mDI)/((pDI+mDI)||1)*100);
}
function bbL(cl,p=20,k=2){
  if(cl.length<p)return{pb:null,bw:null};
  const sl=cl.slice(-p),m=sl.reduce((a,b)=>a+b,0)/p;
  const sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/p);
  const u=m+k*sd,dn=m-k*sd;
  return{pb:+((cl[cl.length-1]-dn)/((u-dn)||1)).toFixed(3),bw:+((u-dn)/m*100).toFixed(2)};
}
function vwapCalc(candles){
  if(!candles?.length)return null;
  let tv=0,tpv=0;
  candles.slice(-50).forEach(c=>{const tp=(c.h+c.l+c.c)/3,v=c.v||1;tpv+=tp*v;tv+=v;});
  return tv>0?Math.round(tpv/tv):null;
}
function atrCalc(hi,lo,cl,p=14){
  if(cl.length<p+1)return null;
  const trs=[];
  for(let i=cl.length-p;i<cl.length;i++)trs.push(Math.max(hi[i]-lo[i],Math.abs(hi[i]-cl[i-1]),Math.abs(lo[i]-cl[i-1])));
  return Math.round(trs.reduce((a,b)=>a+b,0)/p);
}
function computeScore(cl,hi,lo){
  if(!cl||cl.length<20)return{score:0,p1:0,p2:0,p3:0,ma6:null,ma40:null,ma70:null,ma200:null,px:livePx,rv:null,av:null,pb:null,bw:null};
  const px=cl[cl.length-1];
  const ma6=smaL(cl,6),ma40=smaL(cl,40),ma70=smaL(cl,70),ma200=smaL(cl,200);
  const rv=rsiL(cl),av=adxL(hi,lo,cl);
  const{pb,bw}=bbL(cl);
  let p1=0;
  if(ma6!=null&&ma70!=null)p1+=ma6>ma70?15:0;
  if(ma40!=null)p1+=px>ma40?10:0;
  if(ma200!=null)p1+=px>ma200?10:0;
  let p2=0;
  if(av!=null)p2+=av>25?15:av>18?8:0;
  if(rv!=null)p2+=rv>65?8:rv>55?20:rv>50?14:rv<30?18:rv<45?6:10;
  let p3=0;
  if(pb!=null)p3=pb>0.85?4:pb>0.55?20:pb>0.2?30:pb>0?18:5;
  return{score:Math.min(100,Math.round(p1+p2+p3)),p1:Math.round(p1),p2:Math.round(p2),p3:Math.round(p3),ma6,ma40,ma70,ma200,px,rv,av,pb,bw};
}
function sColor(s){
  if(s>=78)return'var(--blue)';if(s>=62)return G;if(s>=52)return'#86efac';
  if(s>=42)return'var(--tx3)';if(s>=30)return'var(--amber)';if(s>=18)return'#fca5a5';
  return R;
}
function sLabel(s){
  if(s>=78)return['Compra fuerte','LONG'];if(s>=62)return['Compra','LONG'];
  if(s>=52)return['Acumular','Parcial'];if(s>=42)return['Neutral','Esperar'];
  if(s>=30)return['Venta','SHORT'];if(s>=18)return['Venta fuerte','SHORT'];
  return['Capitulación','CASH'];
}

/* ════════════════════════════════════════════
   Render funciones
════════════════════════════════════════════ */
function renderScore(sc){
  const{score,p1,p2,p3}=sc,col=sColor(score),[lbl,dec]=sLabel(score);
  const arc=$('ringArc');
  if(arc){arc.style.strokeDashoffset=326-(326*score/100);arc.style.stroke=col;}
  set('scoreNum',score);setC('scoreNum',col);
  set('scoreLbl',lbl);setC('scoreLbl',col);set('scoreZone',dec);
  const p1b=$('p1bar');if(p1b)p1b.style.width=(p1/35*100)+'%';
  const p2b=$('p2bar');if(p2b)p2b.style.width=(p2/35*100)+'%';
  const p3b=$('p3bar');if(p3b)p3b.style.width=(p3/30*100)+'%';
  set('p1pts',p1+'/35');set('p2pts',p2+'/35');set('p3pts',p3+'/30');
  document.querySelectorAll('#zonaLst .zona-r').forEach(el=>el.classList.toggle('zac',score>=+el.dataset.min));
  set('met-score',score);setC('met-score',col);set('met-lbl',lbl);setC('met-lbl',col);
  const mp1b=$('met-p1bar');if(mp1b)mp1b.style.width=(p1/35*100)+'%';
  const mp2b=$('met-p2bar');if(mp2b)mp2b.style.width=(p2/35*100)+'%';
  const mp3b=$('met-p3bar');if(mp3b)mp3b.style.width=(p3/30*100)+'%';
  set('met-p1',p1+' pts');set('met-p2',p2+' pts');set('met-p3',p3+' pts');
  window.lastScore=sc;
  if(window.updateAjramFromSONO)window.updateAjramFromSONO();
}
function renderMAs(sc){
  const{ma6,ma40,ma70,ma200,px}=sc;
  function setMA(vi,di,ma){if(ma==null)return;const d=(px-ma)/ma*100;set(vi,fU(ma,0));set(di,fP(d));setC(di,cGR(d));}
  setMA('ma6v','ma6d',ma6);setMA('ma40v','ma40d',ma40);setMA('ma70v','ma70d',ma70);setMA('ma200v','ma200d',ma200);
  const md1=$('met-p1d');if(md1)md1.textContent='MA6:'+(ma6?fU(ma6,0):'--')+' · MA40:'+(ma40?fU(ma40,0):'--')+' · MA200:'+(ma200?fU(ma200,0):'--');
}
function renderSignals(sc){
  const{ma6,ma40,ma70,ma200,px,rv,av,pb}=sc;
  function sig(di,vi,ok,val){
    const de=$(di),ve=$(vi);if(de)de.style.background=ok?T:'var(--tx3,#4d6585)';
    if(ve){ve.textContent=val;ve.style.color=ok?T:'var(--tx3,#4d6585)';}
  }
  sig('d_ma6x70','v_ma6x70',ma6&&ma70&&ma6>ma70,ma6&&ma70?(ma6>ma70?'↑ activa':'↓ inact'):'--');
  sig('d_ma40','v_ma40',ma40&&px>ma40,ma40?fP((px-ma40)/ma40*100):'--');
  sig('d_ma200','v_ma200',ma200&&px>ma200,ma200?fP((px-ma200)/ma200*100):'--');
  sig('d_adx','v_adx',av!=null&&av>25,av!=null?'ADX '+av:'--');
  sig('d_rsi','v_rsi',rv!=null&&(rv<30||rv>55),rv!=null?'RSI '+rv:'--');
  sig('d_bb','v_bb',pb!=null&&(pb<0.2||pb>0.5),pb!=null?'%B '+pb.toFixed(2):'--');
}
function renderInd(sc){
  const{rv,av,pb,ma40,px,bw}=sc;
  set('indRSI',rv!=null?rv:'--');setC('indRSI',rv<30?T:rv>70?R:'var(--cyan)');
  set('indRSIl',rv<30?'Sobreventa':rv>70?'Sobrecompra':'Neutral');
  set('indADX',av!=null?av:'--');setC('indADX',av>30?G:av>25?'var(--purple)':'var(--tx3)');
  set('indADXl',av>30?'Tendencia fuerte':av>25?'Tendencia activa':'Sin tendencia');
  set('indBB',pb!=null?pb.toFixed(2):'--');setC('indBB',pb<0.2?T:pb>0.8?R:'var(--cyan)');
  set('indBBl',pb<0.2?'Sobreventa':pb>0.8?'Sobrecompra':'Zona media');
  if(ma40&&px){const d=(px-ma40)/ma40*100;set('indMA40d',fP(d));setC('indMA40d',cGR(d));set('indMA40l',d>=0?'sobre MA40':'bajo MA40');}
  const md2=$('met-p2d');if(md2)md2.textContent='ADX: '+(sc.av??'--')+' · RSI: '+(sc.rv??'--');
  const md3=$('met-p3d');if(md3)md3.textContent='%B: '+(sc.pb!=null?sc.pb.toFixed(2):'--')+' · BW: '+(sc.bw!=null?sc.bw+'%':'--');
}
function renderSR(sr,px){
  set('srR2',fU(sr.r2,0));set('srR1',fU(sr.r1,0));set('srS1',fU(sr.s1,0));set('srS2',fU(sr.s2,0));
  if(px>0)set('srLive',fU(px,2));
}

/* ════════════════════════════════════════════
   refreshIndicators — usa loadKlines con CoinGecko fallback
════════════════════════════════════════════ */
async function refreshIndicators(){
  try{
    const candles=await loadKlines('15m',220);
    if(!candles||candles.length<20){addLog('IND','var(--amber)','Sin velas suficientes — reintentando en 60s');return;}
    const cl=candles.map(c=>c.c),hi=candles.map(c=>c.h),lo=candles.map(c=>c.l);
    const sc=computeScore(cl,hi,lo);lastScore=sc;
    renderScore(sc);renderMAs(sc);renderSignals(sc);renderInd(sc);
    const n=25,rh=Math.max(...hi.slice(-n)),rl=Math.min(...lo.slice(-n)),rng=rh-rl;
    renderSR({r2:rh+rng*.1,r1:rh,s1:rl,s2:rl-rng*.1},livePx||sc.px);
    const vw=vwapCalc(candles),at=atrCalc(hi,lo,cl);
    if(vw)set('vwapEl',fU(vw));if(at)set('atrEl',fU(at));
    addLog('IND',T,'Score '+sc.score+'/100 · RSI '+(sc.rv??'--')+' · ADX '+(sc.av??'--'));
  }catch(e){console.error('[STX]',e);addLog('IND',R,'Error indicadores: '+e.message);}
}

async function refreshMTF(){
  const tfs=['1m','3m','5m','15m'],ids=['mtf1m','mtf3m','mtf5m','mtf15m'],w=[.10,.15,.25,.50],scores=[];
  for(const tf of tfs){
    try{const c=await loadKlines(tf,220);scores.push(c.length>10?computeScore(c.map(x=>x.c),c.map(x=>x.h),c.map(x=>x.l)).score:0);}
    catch(e){scores.push(0);}
  }
  scores.forEach((s,i)=>{const e=$(ids[i]);if(e){e.textContent=s;e.style.color=sColor(s);}});
  const mtf=Math.round(scores.reduce((a,s,i)=>a+s*w[i],0));
  const mt=$('mtfTotal');if(mt){mt.textContent=mtf;mt.style.color=sColor(mtf);}
}

/* ════════════════════════════════════════════
   Rangos — async CORRECTO
════════════════════════════════════════════ */
async function renderRangosPage(){
  const grid=$('rangeGrid');if(!grid)return;
  grid.innerHTML='<div style="grid-column:1/-1;padding:1rem;color:var(--tx3,#4d6585);font-family:monospace">Cargando rangos multi-TF...</div>';
  const tfs=['15m','5m','3m','1m'],res=[];
  for(const tf of tfs){
    try{
      const c=await loadKlines(tf,60);
      if(!c||c.length<5){res.push({tf,px:livePx,r2:0,r1:0,s1:0,s2:0,zona:'Sin datos',pres:'--',pn:50,rv:null,av:null});continue;}
      const cl=c.map(x=>x.c),hi=c.map(x=>x.h),lo=c.map(x=>x.l);
      const px=cl[cl.length-1];
      const rh=Math.max(...hi.slice(-20)),rl=Math.min(...lo.slice(-20)),rng=rh-rl;
      const pct=rng>0?(px-rl)/rng:0.5;
      const zona=pct>0.7?'⬆ ZONA ALTA':pct<0.3?'⬇ ZONA BAJA':'◆ ZONA MEDIA';
      const rv=rsiL(cl),av=adxL(hi,lo,cl);
      const pres=av&&av>25?(rv&&rv>50?'Compradora':'Vendedora'):'Neutra';
      const pn=pres==='Compradora'?72:pres==='Vendedora'?28:50;
      res.push({tf,px,r2:Math.round(rh+rng*.1),r1:Math.round(rh),s1:Math.round(rl),s2:Math.round(rl-rng*.1),zona,pres,pn,rv,av});
    }catch(e){res.push({tf,px:livePx,r2:0,r1:0,s1:0,s2:0,zona:'Error',pres:'--',pn:50,rv:null,av:null});}
  }
  if(res[0]){set('rgh-bias-v',res[0].pres);set('rgh-state',res[0].zona);set('rangeBias','Bias 15m: '+res[0].zona+' · '+res[0].pres);}
  grid.innerHTML=res.map((r,i)=>`
    <div class="range-spatial-card ${r.pres==='Compradora'?'p-buy':r.pres==='Vendedora'?'p-sell':''}">
      <div class="rsc-head">
        <div><div class="rsc-tf">${r.tf}${i===0?' <span class="rsc-dom">DOM</span>':''}</div><div class="rsc-state">${r.zona}</div></div>
        <div class="rsc-pres"><div class="rsc-pres-lb">Presión</div><div class="rsc-pres-v">${r.pres}</div><div class="rsc-pres-s">RSI ${r.rv??'--'} · ADX ${r.av??'--'}</div></div>
      </div>
      <div class="pressure-meter-wrap">
        <div class="pressure-meter-labels"><span>VENDEDORA</span><span>NEUTRA</span><span>COMPRADORA</span></div>
        <div class="pressure-meter-track"><div class="pressure-meter-dot" style="left:${r.pn}%"></div></div>
      </div>
      <div class="rsc-levels">
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--red)">R2</div><div class="rsc-lv-px">${r.r2>0?fU(r.r2):'---'}</div><div class="rsc-lv-tp">resist.</div></div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--red)">R1</div><div class="rsc-lv-px">${r.r1>0?fU(r.r1):'---'}</div><div class="rsc-lv-tp">resist.</div></div>
        <div class="rsc-lv rsc-lv-live"><div class="rsc-lv-lb" style="color:var(--teal,#00d4a0)">●</div><div class="rsc-lv-px" style="color:var(--teal,#00d4a0)" data-rl="${r.tf}">${livePx>0?fU(livePx,2):fU(r.px,2)}</div><div class="rsc-lv-tp">live</div></div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--green)">S1</div><div class="rsc-lv-px">${r.s1>0?fU(r.s1):'---'}</div><div class="rsc-lv-tp">soporte</div></div>
        <div class="rsc-lv"><div class="rsc-lv-lb" style="color:var(--green)">S2</div><div class="rsc-lv-px">${r.s2>0?fU(r.s2):'---'}</div><div class="rsc-lv-tp">soporte</div></div>
      </div>
      <div class="rsc-meta">
        <div class="rsc-mi"><div class="rsc-mi-lb">RSI</div><div class="rsc-mi-v" style="color:${r.rv!=null?(r.rv<30?'var(--teal,#00d4a0)':r.rv>70?R:'var(--tx2)'):'var(--tx3)'}">${r.rv??'--'}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">ADX</div><div class="rsc-mi-v" style="color:${r.av!=null&&r.av>25?G:'var(--tx3)'}">${r.av??'--'}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">Zona</div><div class="rsc-mi-v">${r.zona.replace(/[⬆⬇◆] /,'')}</div></div>
        <div class="rsc-mi"><div class="rsc-mi-lb">Presión</div><div class="rsc-mi-v">${r.pres}</div></div>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════
   Trades
════════════════════════════════════════════ */
function geEstado(t){return((t.status||t.estado||'')).toUpperCase().trim();}
function calcRActual(t,px){
  if(geEstado(t)!=='OPEN')return null;
  const e=parseFloat(t.entry),sl=parseFloat(t.sl),risk=Math.abs(e-sl);
  if(!risk)return 0;
  return((t.side||'long').toUpperCase()==='LONG'?px-e:e-px)/risk;
}
function updateOpenR(px){
  ['tradesTbody','tradesFullTbody'].forEach(id=>{
    const tb=$(id);if(!tb)return;
    tb.querySelectorAll('tr[data-trade-id]').forEach(row=>{
      const t=allTrades.find(x=>String(x.id)===row.dataset.tradeId);if(!t)return;
      const r=calcRActual(t,px),cell=row.querySelector('[data-r]');
      if(cell&&r!=null){cell.textContent=fR(r);cell.style.color=cGR(r);}
    });
  });
}
function buildRow(t,px){
  const est=geEstado(t),isOpen=est==='OPEN';
  const r=isOpen?calcRActual(t,px):parseFloat(t.r_actual??t.r);
  const rStr=r!=null?fR(r):'--',rClr=r!=null?cGR(r):'var(--tx3)';
  let bc='b-op',bt=t.status||t.estado||'?';
  if(est.startsWith('TP')){bc='b-tp';bt='TP ✓';}else if(est.startsWith('SL')){bc='b-sl';bt='SL ✗';}else if(est.startsWith('BE')){bc='b-be';bt='BE —';}
  const tr=document.createElement('tr');if(isOpen)tr.dataset.tradeId=t.id;
  tr.innerHTML=`<td>${t.id}</td><td><span class="badge ${bc}">${bt}</span></td><td>${t.tf||'--'}</td><td>${t.side||'--'}</td><td>${t.setup||'--'}</td><td>${t.entry||'--'}</td><td>${t.sl||'--'}</td><td>${t.tp1||'--'}</td><td>${t.tp2||'--'}</td><td>${t.mfe||'--'}</td><td>${t.mae||'--'}</td><td>${t.dur||t.duration||'--'}</td><td style="color:${rClr};font-weight:700" data-r="1">${rStr}</td>`;
  return tr;
}
function renderTrades(list,px){
  const closed=list.filter(t=>geEstado(t)!=='OPEN'),open=list.filter(t=>geEstado(t)==='OPEN');
  const tp=closed.filter(t=>geEstado(t).startsWith('TP')).length,sl=closed.filter(t=>geEstado(t).startsWith('SL')).length,be=closed.filter(t=>geEstado(t).startsWith('BE')).length;
  const rs=closed.map(t=>parseFloat(t.r_actual??t.r)||0);
  const rt=rs.reduce((a,b)=>a+b,0),wins=rs.filter(r=>r>0).length;
  const wr=closed.length>0?(wins/closed.length*100).toFixed(1):'0.0';
  const wA=rs.filter(r=>r>0).reduce((a,b)=>a+b,0),lA=Math.abs(rs.filter(r=>r<0).reduce((a,b)=>a+b,0));
  const pf=lA>0?(wA/lA).toFixed(2):'∞';
  const pnl=closed.reduce((a,t)=>a+(parseFloat(t.pnl)||0),0),dd=Math.min(0,...rs,0);
  ['tOpen','trd-open'].forEach(id=>set(id,open.length));
  ['tOpenSub','trd-opensub'].forEach(id=>set(id,open.map(t=>t.side||'?').join(' · ')||'--'));
  ['tClosed','trd-closed'].forEach(id=>set(id,closed.length));
  ['tClosedSub','trd-closedsub'].forEach(id=>set(id,'TP:'+tp+' BE:'+be+' SL:'+sl));
  ['stTPBESL','trd-tpbesl'].forEach(id=>set(id,tp+'/'+be+'/'+sl));
  ['stWR','trd-wr'].forEach(id=>set(id,wr+'%'));
  ['stRT','trd-rt'].forEach(id=>{set(id,fR(rt));setC(id,cGR(rt));});
  ['stPnL','trd-pnl'].forEach(id=>{set(id,(pnl>=0?'+':'')+pnl.toFixed(2)+'$');setC(id,cGR(pnl));});
  ['stPF','trd-pf'].forEach(id=>set(id,pf));
  ['stDD','trd-dd'].forEach(id=>{set(id,dd.toFixed(2)+'R');setC(id,dd<0?R:G);});
  set('tradesStatus','trades.json · '+list.length+' trades');set('sys-trades','✅ '+list.length+' trades');
  const tb=$('tradesTbody');if(tb){tb.innerHTML='';[...list].reverse().forEach(t=>tb.appendChild(buildRow(t,px)));}
  // Equity chart
  if(window.Chart&&$('equityChart')){
    let cum=0;const data=rs.map(r=>{cum+=r;return+cum.toFixed(2);});
    if(eqChart)eqChart.destroy();
    eqChart=new Chart($('equityChart').getContext('2d'),{
      type:'line',data:{labels:rs.map((_,i)=>'#'+(i+1)),datasets:[{label:'R',data,borderColor:'#00d4a0',borderWidth:2,pointRadius:0,tension:.3,fill:true,backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,160);g.addColorStop(0,'rgba(0,212,160,.18)');g.addColorStop(1,'rgba(0,212,160,.01)');return g;}}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{position:'right',ticks:{color:'#4d6585',font:{size:9},callback:v=>v+'R'},grid:{color:'rgba(255,255,255,.03)'}}}}
    });
  }
  set('eq-dd',dd.toFixed(2)+'R');setC('eq-dd',dd<0?R:G);set('eq-pf',pf);
  set('eq-exp',closed.length>0?(rt/closed.length).toFixed(2)+'R':'--');
  set('eq-best',rs.length?Math.max(...rs).toFixed(2)+'R':'--');setC('eq-best',G);
  set('eq-worst',rs.length?Math.min(...rs).toFixed(2)+'R':'--');setC('eq-worst',R);
}
function renderTradesPage(){
  const tb=$('tradesFullTbody');if(!tb)return;
  if(!allTrades.length){tb.innerHTML='<tr><td colspan="13" style="text-align:center;color:var(--tx3);padding:1.5rem">Sin trades</td></tr>';return;}
  tb.innerHTML='';[...allTrades].reverse().forEach(t=>tb.appendChild(buildRow(t,livePx)));
  set('trd-refreshts',new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
}
async function loadTrades(){
  try{
    const d=await fetchJ('/trades.json');allTrades=Array.isArray(d)?d:(d.trades||[]);
    renderTrades(allTrades,livePx);addLog('TRADES',T,allTrades.length+' trades de trades.json');
  }catch(e){console.error('[STX] trades',e);set('sys-trades','❌ Error');}
}

/* ════════════════════════════════════════════
   Macro — CoinGecko primario para global
════════════════════════════════════════════ */
async function loadFG(){
  try{
    let d=null;
    try{d=await fetchJ(PROXY+'/fng');}catch(e){}
    if(!d)d=await fetchJ('https://api.alternative.me/fng/?limit=1');
    const fg=parseInt(d.data[0].value),lb=d.data[0].value_classification;
    const c=fg<=20?T:fg<=40?'#86efac':fg<=60?'var(--tx3)':fg<=80?'var(--amber)':R;
    set('mFNG',fg);setC('mFNG',c);set('mFNGl',lb);
    const b=$('mFNGb');if(b){b.style.width=fg+'%';b.style.background=c;}
    set('sys-fg','✅ '+fg+' · '+lb);addLog('F&G',T,'F&G: '+fg+' — '+lb);
  }catch(e){set('sys-fg','❌');}
}
async function loadCG(){
  try{
    let d=null;
    try{d=await fetchJ(PROXY+'/global');}catch(e){}
    if(!d)d=await fetchJ(CG_BASE+'/global');
    const dom=d.data.market_cap_percentage?.btc||0,mc=d.data.total_market_cap?.usd||0;
    set('mDOM',dom.toFixed(1)+'%');set('mDOMl',dom>60?'BTC dominante':dom>45?'Equilibrado':'Altseason');
    const db=$('mDOMb');if(db)db.style.width=dom+'%';
    set('mMCAP',fK(mc));set('mMCAPl','Vol: '+fK(d.data.total_volume?.usd||0));
    set('sys-cg','✅ Dom '+dom.toFixed(1)+'%');
  }catch(e){set('sys-cg','❌');}
}
async function loadEUR(){
  try{
    let rate=null;
    try{const d=await fetchJ(PROXY+'/eur');rate=parseFloat(d.price);if(!rate||rate<0.5)rate=null;}catch(e){}
    if(!rate)try{const d=await fetchJ(BN+'/ticker/price?symbol=EURUSDT');rate=parseFloat(d.price);}catch(e){}
    if(!rate){
      // Fallback: CoinGecko EUR no disponible directamente, usar valor real conocido
      rate=1.08;addLog('EUR','var(--amber)','EUR fallback 1.08 (Binance no disponible)');
    }
    eurRate=rate;set('mEUR',rate.toFixed(4));
    const eb=$('mEURb');if(eb)eb.style.width=Math.min(100,(rate-0.8)*500)+'%';
    set('sys-eur',rate===1.08?'⚠️ Fallback 1.08':'✅ '+rate.toFixed(4));
  }catch(e){set('sys-eur','❌');}
}

/* Logs */
function addLog(tag,col,msg){
  const ts=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  logs.unshift({ts,tag,col,msg});if(logs.length>12)logs.pop();
  const cm={[T]:'rgba(0,212,160,.1)',[G]:'rgba(34,197,94,.12)',[R]:'rgba(239,68,68,.12)','var(--amber)':'rgba(245,158,11,.12)','var(--blue)':'rgba(59,130,246,.12)'};
  const ct={[T]:T,[G]:G,[R]:R,'var(--amber)':'var(--amber)','var(--blue)':'var(--blue)'};
  ['alertLst','sysLog'].forEach(id=>{
    const el=$(id);if(!el)return;
    el.innerHTML=logs.map(a=>`<div class="al-row"><div class="al-t">${a.ts}</div><div class="al-tg" style="background:${cm[a.col]||'rgba(59,130,246,.12)'};color:${ct[a.col]||'var(--blue)'}">${a.tag}</div><div class="al-m">${a.msg}</div></div>`).join('');
  });
}

/* Router SPA */
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('ac',b.dataset.page===id));
  const pg=$('page-'+id);if(pg)pg.classList.add('active');
  history.pushState({page:id},'',(id==='dashboard'?'/':'/'+id));
  if(id==='rangos')renderRangosPage();
  if(id==='trades')renderTradesPage();
  if(id==='metodo'&&lastScore)renderScore(lastScore);
}

/* Moneda */
function setCoin(c){
  coin=c;livePx=0;
  document.querySelectorAll('#coinBtns .cb-btn').forEach(b=>b.classList.toggle('ac',b.dataset.coin===c));
  ['priceUSD','h24','l24','vol24','priceEUR','vwapEl','atrEl'].forEach(id=>set(id,'---'));
  const ce=$('priceChg');if(ce)ce.style.display='none';
  startWS();loadTicker();refreshIndicators();addLog('COIN','var(--blue)','Moneda: '+c);
}

/* Filtros Trades */
function setupTabs(){
  document.querySelectorAll('.t-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.t-tab').forEach(b=>b.classList.remove('ac'));btn.classList.add('ac');
      const sel=$('filterStatus');if(sel)sel.value=btn.dataset.ttab==='open'?'OPEN':btn.dataset.ttab==='closed'?'TP':'ALL';
      applyFilter();
    });
  });
  ['filterStatus','filterSide','filterSetup','filterTf'].forEach(id=>{
    const el=$(id);if(el){el.addEventListener('input',applyFilter);el.addEventListener('change',applyFilter);}
  });
}
function applyFilter(){
  const status=$('filterStatus')?.value||'ALL',side=$('filterSide')?.value||'ALL';
  const setup=($('filterSetup')?.value||'').toLowerCase(),tf=($('filterTf')?.value||'').toLowerCase();
  const filtered=allTrades.filter(t=>{
    const est=geEstado(t);
    if(status!=='ALL'&&est!==status&&!est.startsWith(status))return false;
    if(side!=='ALL'&&(t.side||'').toUpperCase()!==side)return false;
    if(setup&&!(t.setup||'').toLowerCase().includes(setup))return false;
    if(tf&&!(t.tf||'').toLowerCase().includes(tf))return false;
    return true;
  });
  const tb=$('tradesFullTbody');if(!tb)return;
  tb.innerHTML='';
  if(!filtered.length){tb.innerHTML='<tr><td colspan="13" style="text-align:center;color:var(--tx3);padding:1rem">Sin resultados</td></tr>';return;}
  [...filtered].reverse().forEach(t=>tb.appendChild(buildRow(t,livePx)));
}

/* ════════════════════════════════════════════
   INIT — sin await fuera de async
════════════════════════════════════════════ */
(async function init(){
  console.log('[STX FINALv2] Iniciando con CoinGecko como fuente primaria...');
  setInterval(()=>set('clockEl',new Date().toLocaleTimeString('es-ES')),1000);
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
  document.querySelectorAll('#coinBtns .cb-btn').forEach(btn=>btn.addEventListener('click',()=>setCoin(btn.dataset.coin)));
  window.addEventListener('popstate',e=>{if(e.state?.page)showPage(e.state.page);});
  setupTabs();
  await loadEUR();
  startWS();startWatchdog();
  loadTicker();      // CoinGecko primario si Binance falla
  refreshIndicators(); // CoinGecko OHLCV si Binance falla
  loadFG();loadCG();loadTrades();
  setTimeout(refreshMTF,8000);
  setInterval(loadTicker,30000);setInterval(refreshIndicators,60000);
  setInterval(loadFG,300000);setInterval(loadCG,300000);setInterval(loadEUR,3600000);
  setInterval(loadTrades,120000);setInterval(refreshMTF,120000);
  addLog('STX',T,'SONO Terminal X FINALv2 · CoinGecko activo');
  console.log('[STX FINALv2] init() completado');
})();
