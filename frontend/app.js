
(function(){
var CTF="1m",CA="BTC";
var ST={price:0,high:0,low:0,ch:0,kl:{},fg:50,vx:0,db:0,de:0,mc:0,er:1.08};
var MA_CACHE={};
var _dataReady=false;
var SWR={fg:0,cg:0,vx:0,eur:0}; // timestamps de ultimo refresh exitoso
var SWR_TTL={fg:300000,cg:180000,vx:120000,eur:900000}; // 5min, 3min, 2min, 15min
function swrOk(k){return SWR[k]&&Date.now()-SWR[k]<SWR_TTL[k];}
var AS={BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT"};
function $(i){return document.getElementById(i)};
function fk(n){return n>=1e12?"$"+(n/1e12).toFixed(2)+"T":n>=1e9?"$"+(n/1e9).toFixed(1)+"B":n>=1e6?"$"+(n/1e6).toFixed(0)+"M":"$"+n.toFixed(0)};
function fm(n){return "$"+Math.round(n).toLocaleString("en-US")};

// ===== SCORE MAESTRO UNIFICADO v2 =====
// Alineado con sono_score.py (Python) ÔÇö fuente canonica
// =========================================
var SCORE_CFG = null;

function loadScoreConfig(){
  return fetch('/sono-score-config.json',{cache:'no-store'})
    .then(function(r){return r.json()})
    .then(function(cfg){ SCORE_CFG = cfg; })
    .catch(function(){ SCORE_CFG = null; });
}
function sm(a,p){if(!a||a.length<p)return null;var s=0;for(var i=a.length-p;i<a.length;i++)s+=+a[i];return s/p};
function rs(c,p){p=p||14;if(!c||c.length<p+1)return null;var g=0,l=0;for(var i=c.length-p;i<c.length;i++){var d=+c[i]-+c[i-1];if(d>0)g+=d;else l-=d}return Math.round(100-100/(1+(g/p)/((l/p)||0.0001)))};
function ax(h,l,c,p){p=p||14;if(!c||c.length<p+2)return{adx:null};var pD=[],mD=[],tr=[];for(var i=1;i<c.length;i++){var pH=+h[i]-+h[i-1],mL=+l[i-1]-+l[i];pD.push(pH>mL&&pH>0?pH:0);mD.push(mL>pH&&mL>0?mL:0);tr.push(Math.max(+h[i]-+l[i],Math.abs(+h[i]-+c[i-1]),Math.abs(+l[i]-+c[i-1])))};var sp=0,sm2=0,st=0;for(var i=pD.length-p;i<pD.length;i++){sp+=pD[i];sm2+=mD[i];st+=tr[i]};st=st||1;var pDI=Math.round(100*sp/st),mDI=Math.round(100*sm2/st);return{adx:Math.round(Math.abs(pDI-mDI)/((pDI+mDI)||1)*100)}};
function bb(c,p,k){p=p||20;k=k||2;if(!c||c.length<p)return{pb:null};var sl=c.slice(-p),m=0;for(var i=0;i<p;i++)m+=+sl[i];m/=p;var sd=0;for(var i=0;i<p;i++)sd+=(+sl[i]-m)*(+sl[i]-m);sd=Math.sqrt(sd/p);return{pb:(+c[c.length-1]-(m-k*sd))/(((m+k*sd)-(m-k*sd))||1)}};
// Hash rapido para MA_CACHE en vez de comparar arrays por referencia
function hashArr(arr){
  if(!arr||arr.length===0) return '';
  var last=arr[arr.length-1];
  return arr.length+'_'+(+last[0]||0);
}

// Score Maestro COMPLETAMENTE ALINEADO con sono_score.py (Python)
// P1: MA6>MA40=12, MA6>MA70=10, MA40>MA200=13 (max 35)
// P2: ADX>35=15, ADX>25=10, ADX<25=3 + RSI 50-70=12, RSI>=35=7, RSI<35=2 + Precio>MA200=8 (max 35)
// P3: %B<0.15=28, <0.35=20, <0.65=14, <0.85=7, else=2 (max 30)
function cs(c){
  if(!c||c.length<30) return null;
  var cl=c.map(function(x){return+x[4]}),hi=c.map(function(x){return+x[2]}),lo=c.map(function(x){return+x[3]}),p=cl[cl.length-1];
  var tLen=cl.length;
  var k=CTF;
  var h=hashArr(c);
  // MA_CACHE con hash real
  var m6=null,m40=null,m70=null,m2=null;
  var k6=k+'_6_'+h, k40=k+'_40_'+h, k70=k+'_70_'+h, k200=k+'_200_'+h;
  if(MA_CACHE[k6]){m6=MA_CACHE[k6]}else if(tLen>=6){m6=sm(cl,6);MA_CACHE[k6]=m6}
  if(MA_CACHE[k40]){m40=MA_CACHE[k40]}else if(tLen>=40){m40=sm(cl,40);MA_CACHE[k40]=m40}
  if(MA_CACHE[k70]){m70=MA_CACHE[k70]}else if(tLen>=70){m70=sm(cl,70);MA_CACHE[k70]=m70}
  if(tLen>=200){
    if(MA_CACHE[k200]){m2=MA_CACHE[k200]}else{m2=sm(cl,200);MA_CACHE[k200]=m2}
  }
  var p1=0;
  if(m6!==null&&m40!==null) p1+=m6>m40?12:0;
  if(m6!==null&&m70!==null) p1+=m6>m70?10:0;
  if(m40!==null&&m2!==null) p1+=m40>m2?13:0;
  var r=rs(cl),a=ax(hi,lo,cl).adx,p2=0;
  if(a!==null){
    p2+=a>35?15:a>25?10:3;
  }
  if(r!==null){
    p2+=r>=50&&r<70?12:r>=35?7:2;
  }
  if(m2!==null){
    p2+=p>m2?8:0;
  }
  var b=bb(cl).pb,p3=0;
  if(b!==null){
    if(b<0.15) p3=28;
    else if(b<0.35) p3=20;
    else if(b<0.65) p3=14;
    else if(b<0.85) p3=7;
    else p3=2;
  }
  var total=Math.min(100,Math.round(p1+p2+p3));
  return{sc:total,p1,p2,p3,m6,m40,m70,m2,p,r,a,pb:b,tLen:tLen,ma200Avail:m2!==null};
};
function sl(s){
  var B = SCORE_CFG ? SCORE_CFG.barreras : null;
  if(!B){
    if(s>=78) return['COMPRA FUERTE','pgg'];
    if(s>=62) return['COMPRA','pgg'];
    if(s>=52) return['ACUMULAR','pb'];
    if(s>=42) return['NEUTRAL','pgg2'];
    if(s>=30) return['VENTA','pw'];
    if(s>=18) return['VENTA FUERTE','prr'];
    return['CAPITULACION','prr'];
  }
  if(s>=B.compra_fuerte) return['COMPRA FUERTE','pgg'];
  if(s>=B.compra) return['COMPRA','pgg'];
  if(s>=B.acumulacion) return['ACUMULAR','pb'];
  if(s>=B.neutral) return['NEUTRAL','pgg2'];
  if(s>=B.distribucion) return['VENTA','pw'];
  if(s>=B.venta) return['VENTA FUERTE','prr'];
  return['CAPITULACION','prr'];
};
function fl(v){if(v<=20)return["Miedo extremo","pgg"];if(v<=40)return["Miedo","pw"];if(v<=60)return["Neutral","pgg2"];if(v<=80)return["Codicia","pw"];return["Codicia extrema","prr"]};
function rg(s2,f,d){if(s2>=70&&f<40)return["Acum.agresiva","LONG SWING","Bajo","pgg"];if(s2>=62)return["Tendencia alcista","LONG","Medio","pgg"];if(s2>=50&&d>55)return["Rotacion BTC","LONG BTC","Medio","pb"];if(s2>=42)return["Consolidacion","NEUTRAL","Medio","pgg2"];if(s2>=30)return["Distribucion","SHORT","Alto","pw"];return["Capitulacion","CASH","Muy alto","prr"]};
function regimeCrypto(fg,dom,vx){if(!fg)return["--","--"];var r="Neutral";var c2="pgg2";if(fg<=25&&dom>58){r="Acumulacion";c2="pgg"}else if(fg<=40&&dom>55&&vx<20){r="Acumulacion temprana";c2="pb"}else if(fg>=75&&vx<15){r="Euforia";c2="prr"}else if(fg>=65&&vx>20){r="Distribucion";c2="pw"}else if(dom<42&&fg<40){r="Rotacion Altcoins";c2="pb"}else if(vx>28){r="Panico";c2="prr"}else if(fg>55&&dom<48&&vx<18){r="Expansion";c2="pgg"}return[r,c2]}
function ms(f,v,d){var s2=0;if(f){s2+=f<20?2:f<40?1:f>80?-1:0}if(v){s2+=v<15?1:v>25?-1:0}s2+=d>58?1:d<45?-1:0;return Math.max(0,Math.min(6,s2+2))};
function sTF(tf){CTF=tf;document.querySelectorAll(".tfb").forEach(function(b){b.classList.toggle("ac",b.textContent.trim()===tf)});fetchAll()};
function saveHist(key,val){try{var arr=JSON.parse(localStorage.getItem(key)||"[]");arr.push({v:val,t:Date.now()});if(arr.length>7)arr=arr.slice(-7);localStorage.setItem(key,JSON.stringify(arr))}catch(e){}}
function getHist(key){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch(e){return[]}}
function renderMiniHist(){var fgH=getHist("sono_fg");var vxH=getHist("sono_vx");var fgE=$("fg-hist");var vxE=$("vx-hist");if(fgE&&fgH.length){fgE.innerHTML=fgH.map(function(h){var d=new Date(h.t);var cl=h.v<=20?"pgg":h.v<=40?"pw":h.v<=60?"pgg2":h.v<=80?"pw":"prr";return"<span class=\"pl "+cl+"\" style=\"font-size:10px;padding:1px 6px\">"+h.v+"</span>"}).join(" ")}if(vxE&&vxH.length){vxE.innerHTML=vxH.map(function(h){var cl=h.v<18?"pgg":h.v<25?"pgg2":"prr";return"<span class=\"pl "+cl+"\" style=\"font-size:10px;padding:1px 6px\">"+h.v.toFixed(1)+"</span>"}).join(" ")}}


// ===== SKELETON LOADER =====
function renderHTML(){
$("rt").innerHTML=
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm"></span></span><span class="ri"><span class="sk sk-bs"></span></span></div><div class="vx" style="font-size:32px;margin-bottom:4px"><span class="sk sk-bm" style="width:120px;height:28px"></span></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:14px;color:#94a3b8"><span class="sk sk-bs" style="width:80px"></span></span><span class="pl pgg2"><span class="sk sk-bs" style="width:50px;height:14px"></span></span></div><div class="sp"></div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">High 24h</div><div class="vl" style="font-size:15px;color:#22c55e"><span class="sk sk-bs" style="width:80px"></span></div></div><div class="cs"><div class="lb">Low 24h</div><div class="vl" style="font-size:15px;color:#ef4444"><span class="sk sk-bs" style="width:80px"></span></div></div></div></div>'+
'<div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:100px"></span></span><span class="pl pgg2"><span class="sk sk-bs" style="width:50px"></span></span></div><div style="display:flex;align-items:center;gap:16px"><div class="srr"><span class="sk sk-ss"></span></div>'+
'<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#94a3b8">P1 MA</span><span><span class="sk sk-bs" style="width:40px"></span></span></div><div class="bt"><div class="bf" style="background:#3b82f6;width:30%"></div></div>'+
'<div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 4px"><span style="color:#94a3b8">P2 ADX+RSI</span><span><span class="sk sk-bs" style="width:40px"></span></span></div><div class="bt"><div class="bf" style="background:#22c55e;width:30%"></div></div>'+
'<div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 4px"><span style="color:#94a3b8">P3 BB</span><span><span class="sk sk-bs" style="width:40px"></span></span></div><div class="bt"><div class="bf" style="background:#f59e0b;width:30%"></div></div></div></div>'+
'<div class="sp"></div><div class="rb" style="background:#1e293b;width:100%;text-align:center">Conectando...</div></div></div>'+
'<div class="gr g4"><div class="cs"><div class="lb">Fear &amp; Greed</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div>'+
'<div class="cs"><div class="lb">VIX</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div>'+
'<div class="cs"><div class="lb">Dom. BTC</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div>'+
'<div class="cs"><div class="lb">RSI 3D</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div></div>'+
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:80px"></span></span><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="tfb ac" disabled>1m</button><button class="tfb" disabled>3m</button><button class="tfb" disabled>5m</button><button class="tfb" disabled>15m</button><button class="tfb" disabled>1h</button></div></div>'+
'<div class="gr g2" style="gap:8px;margin-bottom:10px"><div class="cs"><div class="lb">RSI (14)</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div><div class="bt"><div class="bf" style="background:#3b82f6;width:0%"></div></div></div>'+
'<div class="cs"><div class="lb">ADX (14)</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div><div class="bt"><div class="bf" style="background:#22c55e;width:0%"></div></div></div></div>'+
'<div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">BB %B</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div><div class="cs"><div class="lb">MA40 vs precio</div><div class="vl"><span class="sk sk-bs" style="width:40px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div></div>'+
'<div class="sp"></div><div class="lb">Presion</div><div class="pt"><div class="pd" style="left:50%"></div></div><div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b"><span>VENTA</span><span>NEUTRAL</span><span>COMPRA</span></div></div>'+
'<div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:100px"></span></span><span class="pl pgg2"><span class="sk sk-bs" style="width:50px"></span></span></div>'+
'<div class="mg"><div class="mc"><div class="mt">1m</div><div class="mv"><span class="sk sk-bs" style="width:30px;margin:0 auto"></span></div><div class="ms"><span class="sk sk-bs" style="width:50px;margin:0 auto"></span></div></div><div class="mc"><div class="mt">3m</div><div class="mv"><span class="sk sk-bs" style="width:30px;margin:0 auto"></span></div><div class="ms"><span class="sk sk-bs" style="width:50px;margin:0 auto"></span></div></div><div class="mc"><div class="mt">5m</div><div class="mv"><span class="sk sk-bs" style="width:30px;margin:0 auto"></span></div><div class="ms"><span class="sk sk-bs" style="width:50px;margin:0 auto"></span></div></div><div class="mc"><div class="mt">15m</div><div class="mv"><span class="sk sk-bs" style="width:30px;margin:0 auto"></span></div><div class="ms"><span class="sk sk-bs" style="width:50px;margin:0 auto"></span></div></div></div>'+
'<div class="sp"></div><div class="lb">Senales</div><div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8"><span class="sk sk-bs" style="width:60px"></span></span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8"><span class="sk sk-bs" style="width:60px"></span></span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8"><span class="sk sk-bs" style="width:60px"></span></span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8"><span class="sk sk-bs" style="width:60px"></span></span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8"><span class="sk sk-bs" style="width:60px"></span></span></div></div></div></div>'+
'<div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:100px"></span></span></div>'+
'<div class="gr g4" style="gap:8px"><div class="cs"><div class="lb">MA6</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:80px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div><div class="cs"><div class="lb">MA40</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:80px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div><div class="cs"><div class="lb">MA70</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:80px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div><div class="cs"><div class="lb">MA200</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:80px"></span></div><div class="sb"><span class="sk sk-bs" style="width:60px"></span></div></div></div></div>'+
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:110px"></span></span></div><div class="srr2"><span><span class="dt dr"></span> R2</span><span style="font-weight:600"><span class="sk sk-bs" style="width:70px"></span></span></div><div class="srr2"><span><span class="dt dr"></span> R1</span><span style="font-weight:600"><span class="sk sk-bs" style="width:70px"></span></span></div><div class="srr2"><span><span class="dt dn"></span> Precio</span><span style="font-weight:600"><span class="sk sk-bs" style="width:70px"></span></span></div><div class="srr2"><span><span class="dt dg"></span> S1</span><span style="font-weight:600"><span class="sk sk-bs" style="width:70px"></span></span></div><div class="srr2"><span><span class="dt dg"></span> S2</span><span style="font-weight:600"><span class="sk sk-bs" style="width:70px"></span></span></div></div>'+
'<div class="cd"><div class="sh"><span class="st"><span class="sk sk-bm" style="width:100px"></span></span><span class="pl pgg2"><span class="sk sk-bs" style="width:40px"></span></span></div><div class="rb" style="background:#1e293b;margin-bottom:10px;padding:10px;text-align:center;border-radius:10px"><span class="sk sk-bs" style="width:120px;margin:0 auto"></span></div><div style="font-size:12px;color:#94a3b8;margin-bottom:10px"><span class="sk sk-bs" style="width:100px"></span></div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">Sesgo</div><div style="font-size:13px;font-weight:500"><span class="sk sk-bs" style="width:50px"></span></div></div><div class="cs"><div class="lb">Riesgo</div><div style="font-size:13px;font-weight:500"><span class="sk sk-bs" style="width:50px"></span></div></div></div><div class="sp"></div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">Market Cap</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:70px"></span></div></div><div class="cs"><div class="lb">Dom. ETH</div><div class="vl" style="font-size:15px"><span class="sk sk-bs" style="width:70px"></span></div></div></div></div></div>';
}

// ===== REAL RENDER =====
function renderRealHTML(){
$("rt").innerHTML=
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st" id="pat">BTC/USDT</span><span class="ri" id="lu">...</span></div><div class="vx" id="bp" style="font-size:32px;margin-bottom:4px">--</div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span id="ep" style="font-size:14px;color:#94a3b8">EUR --</span><span class="pl pgg2" id="ch24">--</span></div><div class="sp"></div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">High 24h</div><div class="vl" id="h24" style="font-size:15px;color:#22c55e">--</div></div><div class="cs"><div class="lb">Low 24h</div><div class="vl" id="l24" style="font-size:15px;color:#ef4444">--</div></div></div></div>'+
'<div class="cd"><div class="sh"><span class="st">Score Maestro</span><span class="pl pgg2" id="sp">--</span></div><div style="display:flex;align-items:center;gap:16px"><div class="srr"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="7"/><circle id="sa" cx="40" cy="40" r="34" fill="none" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" stroke-dasharray="213.6" stroke-dashoffset="213.6"/></svg><div class="svv" id="sv">--</div></div>'+
'<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#94a3b8">P1 MAs</span><span id="p1v">--/35</span></div><div class="bt"><div class="bf" id="p1b" style="background:#3b82f6;width:0%"></div></div>'+
'<div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 4px"><span style="color:#94a3b8">P2 ADX+RSI</span><span id="p2v">--/35</span></div><div class="bt"><div class="bf" id="p2b" style="background:#22c55e;width:0%"></div></div>'+
'<div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 4px"><span style="color:#94a3b8">P3 Bollinger</span><span id="p3v">--/30</span></div><div class="bt"><div class="bf" id="p3b" style="background:#f59e0b;width:0%"></div></div></div></div>'+
'<div class="sp"></div><div class="rb" id="rb" style="background:#1e293b;width:100%;text-align:center;opacity:0;transition:opacity .5s,transform .5s;transform:scale(.95)">--- regimen ---</div></div></div>'+
'<div class="gr g4"><div class="cs"><div class="lb">Fear & Greed</div><div class="vl" id="fgv">--</div><div class="sb" id="fgl">--</div><div id="fg-hist" style="margin-top:3px;display:flex;gap:2px;flex-wrap:wrap"></div></div>'+
'<div class="cs"><div class="lb">VIX</div><div class="vl" id="vxv">--</div><div class="sb" id="vxl">--</div><div id="vx-hist" style="margin-top:3px;display:flex;gap:2px;flex-wrap:wrap"></div></div>'+
'<div class="cs"><div class="lb">Dom. BTC</div><div class="vl" id="dbv">--</div><div class="sb" id="dbl">--</div></div>'+
'<div class="cs"><div class="lb">RSI 3D</div><div class="vl" id="rmv">--</div><div class="sb" id="rml">--</div></div></div>'+
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st">Indicadores</span><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="tfb ac" onclick="sTF(\'1m\')">1m</button><button class="tfb" onclick="sTF(\'3m\')">3m</button><button class="tfb" onclick="sTF(\'5m\')">5m</button><button class="tfb" onclick="sTF(\'15m\')">15m</button><button class="tfb" onclick="sTF(\'1h\')">1h</button></div></div>'+
'<div class="gr g2" style="gap:8px;margin-bottom:10px"><div class="cs"><div class="lb">RSI (14)</div><div class="vl skeleton" id="riv">--</div><div class="sb skeleton" id="ril">--</div><div class="bt"><div class="bf" id="rib" style="background:#3b82f6;width:0%"></div></div></div>'+
'<div class="cs"><div class="lb">ADX (14)</div><div class="vl skeleton" id="adv">--</div><div class="sb skeleton" id="adl">--</div><div class="bt"><div class="bf" id="adb" style="background:#22c55e;width:0%"></div></div></div></div>'+
'<div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">BB %B</div><div class="vl skeleton" id="bbv">--</div><div class="sb skeleton" id="bbl">--</div></div><div class="cs"><div class="lb">MA40 vs precio</div><div class="vl skeleton" id="m4v">--</div><div class="sb skeleton" id="m4l">--</div></div></div>'+
'<div class="sp"></div><div class="lb">Presion</div><div class="pt"><div class="pd" id="pd" style="left:50%"></div></div><div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b"><span>VENTA</span><span id="plb">NEUTRAL</span><span>COMPRA</span></div></div>'+
'<div class="cd"><div class="sh"><span class="st">Confluencia MTF</span><span class="pl pgg2 skeleton" id="cp">--/100</span></div>'+
'<div class="mg"><div class="mc"><div class="mt">1m</div><div class="mv skeleton" id="mr1">--</div><div class="ms skeleton" id="ma1">--</div></div><div class="mc"><div class="mt">3m</div><div class="mv skeleton" id="mr3">--</div><div class="ms skeleton" id="ma3">--</div></div><div class="mc"><div class="mt">5m</div><div class="mv skeleton" id="mr5">--</div><div class="ms skeleton" id="ma5">--</div></div><div class="mc"><div class="mt">15m</div><div class="mv skeleton" id="mr15">--</div><div class="ms skeleton" id="ma15">--</div></div></div>'+
'<div class="sp"></div><div class="lb">Senales</div><div id="sr"><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8">RSI >50</span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8">ADX >25</span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8">Precio > MA40</span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8">BB %B >0.5</span></div><div class="sg"><div class="si sn">--</div><span style="font-size:12px;color:#94a3b8">F&G extremo</span></div></div></div></div>'+
'<div class="cd"><div class="sh"><span class="st">Medias Moviles</span></div>'+
'<div class="gr g4" style="gap:8px"><div class="cs"><div class="lb">MA6</div><div class="vl skeleton" id="m6v" style="font-size:15px">--</div><div class="sb skeleton" id="m6d">--</div></div><div class="cs"><div class="lb">MA40</div><div class="vl skeleton" id="m4v2" style="font-size:15px">--</div><div class="sb skeleton" id="m4d">--</div></div><div class="cs"><div class="lb">MA70</div><div class="vl skeleton" id="m7v" style="font-size:15px">--</div><div class="sb skeleton" id="m7d">--</div></div><div class="cs"><div class="lb">MA200</div><div class="vl skeleton" id="m2v" style="font-size:15px">--</div><div class="sb skeleton" id="m2d">--</div></div></div></div>'+
'<div class="gr g2"><div class="cd"><div class="sh"><span class="st">Zonas S/R (MAs)</span></div><div class="srr2"><span><span class="dt dr"></span> R2 (MA70 x1.08)</span><span class="skeleton" id="r2" style="font-weight:600">--</span></div><div class="srr2"><span><span class="dt dr"></span> R1 (MA40 x1.05)</span><span class="skeleton" id="r1" style="font-weight:600">--</span></div><div class="srr2"><span><span class="dt dn"></span> Precio</span><span class="skeleton" id="srp" style="font-weight:600">--</span></div><div class="srr2"><span><span class="dt dg"></span> S1 (MA40 x0.95)</span><span class="skeleton" id="s1" style="font-weight:600">--</span></div><div class="srr2"><span><span class="dt dg"></span> S2 (MA70 x0.92)</span><span class="skeleton" id="s2" style="font-weight:600">--</span></div></div>'+
'<div class="cd"><div class="sh"><span class="st">Macro Global</span><span class="pl pgg2 skeleton" id="msc">--/6</span></div><div class="rb skeleton" id="msv" style="background:#1e293b;margin-bottom:10px">--</div><div style="font-size:12px;color:#94a3b8;margin-bottom:10px" id="mtx">...</div>'+'<div id="rcr" class="rb" style="background:#1e293b;font-size:11px;margin-bottom:8px;width:100%;text-align:center">---</div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">Sesgo</div><div class="skeleton" id="seb" style="font-size:13px;font-weight:500">--</div></div><div class="cs"><div class="lb">Riesgo</div><div class="skeleton" id="rib2" style="font-size:13px;font-weight:500">--</div></div></div><div class="sp"></div><div class="gr g2" style="gap:8px"><div class="cs"><div class="lb">Market Cap</div><div class="vl skeleton" id="mcv" style="font-size:15px">--</div></div><div class="cs"><div class="lb">Dom. ETH</div><div class="vl skeleton" id="dev" style="font-size:15px">--</div></div></div></div></div>';
}

function rmvSkel(){var els=document.querySelectorAll(".skeleton");for(var i=0;i<els.length;i++){els[i].classList.remove("skeleton")}};
function updAll(){
ST.loading=false;rmvSkel();
var p=ST.price,$id=$;
$id("pat").textContent=CA+"/USDT";
$id("bp").textContent=fm(p);
$id("ep").textContent="EUR "+(p/ST.er).toFixed(2);
var c=ST.ch;var chEl=$id("ch24");chEl.textContent=(c>=0?"+":"")+c.toFixed(2)+"%";chEl.className="pl "+(c>=0?"pgg":"prr");
$id("h24").textContent=fm(ST.high);$id("l24").textContent=fm(ST.low);
var fg=ST.fg;if(fg){$id("fgv").textContent=fg;var fl2=fl(fg);$id("fgl").textContent=fl2[0];if(ST.vx){$id("vxv").textContent=ST.vx.toFixed(2);$id("vxl").textContent=ST.vx<18?"Bajo":ST.vx<25?"Moderado":"Alto"}}
$id("dbv").textContent=ST.db.toFixed(1)+"%";$id("dbl").textContent=ST.db>58?"BTC domina":ST.db<45?"Altseason":"Equilibrio";
$id("dev").textContent=ST.de.toFixed(1)+"%";$id("mcv").textContent=fk(ST.mc);
var msc=ms(ST.fg,ST.vx,ST.db);$id("msc").textContent=msc+"/6";
$id("msv").textContent=msc>=5?"Alcista fuerte":msc>=4?"Alcista":msc>=3?"Neutral":msc>=2?"Bajista":"Bajista fuerte";$id("msv").style.opacity="1";$id("msv").style.transform="scale(1)";
$id("mtx").textContent="F&G "+fg+" Dom "+ST.db.toFixed(1)+"%";
var vxVal=ST.vx||15;
var sd;
if(ST._fromWorker&&ST._workerScore){
  // Data came from worker ÔÇö transform to local format
  var ws=ST._workerScore;
  sd={
    sc: ws.total, p1: ws.p1, p2: ws.p2, p3: ws.p3,
    r: ws.rsi, a: ws.adx, pb: ws.pb,
    m6: ws.ma6, m40: ws.ma40, m70: ws.ma70, m2: ws.ma200,
    p: ws.price,
    ma200Avail: ws.ma200!==null
  };
}else{
  sd=cs(ST.kl[CTF]);
}
if(!sd)return;
$id("sv").textContent=sd.sc;
var sa=$id("sa");sa.style.strokeDashoffset=213.6-(213.6*sd.sc/100);
sa.style.stroke=sd.sc>=62?"#22c55e":sd.sc>=42?"#3b82f6":sd.sc>=30?"#f59e0b":"#ef4444";
var sl2=sl(sd.sc);$id("sp").textContent=sl2[0];$id("sp").className="pl "+sl2[1];
$id("p1v").textContent=sd.p1+"/35";$id("p1b").style.width=(sd.p1/35*100)+"%";
$id("p2v").textContent=sd.p2+"/35";$id("p2b").style.width=(sd.p2/35*100)+"%";
$id("p3v").textContent=sd.p3+"/30";$id("p3b").style.width=(sd.p3/30*100)+"%";
var rg2=rg(sd.sc,ST.fg,ST.db);$id("rb").textContent=rg2[0];$id("rb").className="rb "+rg2[3];$id("rb").style.opacity="1";$id("rb").style.transform="scale(1)";
$id("seb").textContent=rg2[1];$id("rib2").textContent=rg2[2];var rc=regimeCrypto(fg,ST.db,vxVal);$id("rcr").textContent=rc[0];$id("rcr").className="rb "+rc[1];
var mArr=[{v:sd.m6,i:"m6"},{v:sd.m40,i:"m4"},{v:sd.m70,i:"m7"},{v:sd.m2,i:"m2"}];
for(var mi=0;mi<mArr.length;mi++){var o=mArr[mi];if(o.v){var d2=(sd.p-o.v)/o.v*100;$id(o.i+"v").textContent=fm(o.v);var de=$id(o.i+"d");de.textContent=(d2>=0?"+":"")+d2.toFixed(2)+"%";de.style.color=d2>=0?"#22c55e":"#ef4444"}};
// MA200: show (n/d) if not enough data
if(sd.ma200Avail&&sd.m2){
  $id("m2v").textContent=fm(sd.m2);var d2=(sd.p-sd.m2)/sd.m2*100;
  $id("m2d").textContent=(d2>=0?"+":"")+d2.toFixed(2)+"%";
  $id("m2d").style.color=d2>=0?"#22c55e":"#ef4444";
}else{
  $id("m2v").textContent="(n/d)";$id("m2d").textContent="200 velas req.";
  $id("m2d").style.color="#64748b";
}
$id("riv").textContent=sd.r||"--";$id("ril").textContent=sd.r>70?"Sobrecompra":sd.r<30?"Sobreventa":sd.r>50?"Alcista":"Bajista";$id("rib").style.width=Math.min((sd.r||0),100)+"%";
$id("adv").textContent=sd.a||"--";$id("adl").textContent=sd.a>30?"Fuerte":sd.a>20?"Moderado":"Debil";$id("adb").style.width=Math.min((sd.a||0)*2,100)+"%";
$id("bbv").textContent=sd.pb!==null?sd.pb.toFixed(2):"--";$id("bbl").textContent=sd.pb!==null?sd.pb>0.8?"Sobrecompra":sd.pb<0.2?"Sobreventa":"Media":"--";  var pr2=sd.r!==null?(sd.r-50)/50:0;$id("pd").style.left=Math.max(8,Math.min(92,50+pr2*42))+"%";
$id('plb').textContent=pr2>0.2?'COMPRA':pr2<-0.2?'VENTA':'NEUTRAL';
$id("r1").textContent=sd.m40?fm(sd.m40*1.05):"--";$id("r2").textContent=sd.m70?fm(sd.m70*1.08):"--";
$id("s1").textContent=sd.m40?fm(sd.m40*0.95):"--";$id("s2").textContent=sd.m70?fm(sd.m70*0.92):"--";
$id("srp").textContent=fm(sd.p);
// MTF
if(ST._fromWorker&&ST._workerScore){
  // Worker only has current TF score ÔÇö show single value as approximate MTF
  var scRad=sd.sc;
  var approxMTF=scRad>=70?100:scRad>=62?75:scRad>=52?55:scRad>=42?45:scRad>=30?25:10;
  $id('cp').textContent=approxMTF+'/100';
  $id('cp').className='pl '+(approxMTF>=70?'pgg':approxMTF>=50?'pb':approxMTF>=30?'pw':'prr');
}else if(ST.kl['1m']&&ST.kl['3m']&&ST.kl['5m']&&ST.kl['15m']){try{
var tfs=[ST.kl['1m'],ST.kl['3m'],ST.kl['5m'],ST.kl['15m']],mtfTotal=0,tIds=['1','3','5','15'];
for(var ti=0;ti<tfs.length;ti++){var sdi=cs(tfs[ti]);if(!sdi)continue;var ts=sdi.sc>=62?25:sdi.sc>=50?18:sdi.sc>=42?12:sdi.sc>=30?6:2;mtfTotal+=ts;$id('mr'+tIds[ti]).textContent=sdi.sc;var ml=$id('ma'+tIds[ti]);ml.textContent=sl(sdi.sc)[0];ml.style.color=sdi.sc>=62?'#22c55e':sdi.sc>=42?'#3b82f6':sdi.sc>=30?'#f59e0b':'#ef4444'};
$id('cp').textContent=mtfTotal+'/100';$id('cp').className='pl '+(mtfTotal>=70?'pgg':mtfTotal>=50?'pb':mtfTotal>=30?'pw':'prr')}catch(e){}};
// Senales
var chk=[sd.r>50,sd.a>25,sd.p>sd.m40,sd.pb>0.5,fg<=20||fg>=80];
var sis=document.querySelectorAll("#sr .si");for(var si=0;si<Math.min(chk.length,sis.length);si++){sis[si].textContent=chk[si]?"Ô£ô":"ÔÇö";sis[si].className="si "+(chk[si]?"sy":"sn")};
// RSI 3D REAL (cache con fetch a Binance 1d)
var rsi3d='--';
// Intentar usar cache local primero
if(_rsi3dCache.value!==null && Date.now()-_rsi3dCache.ts<_rsi3dCache.ttl){
  rsi3d=_rsi3dCache.value;
}else{
  // Trigger fetch asincrono (no bloquea render)
  computeRsi3d().then(function(v){
    if(v!==null){
      $i('rmv').textContent=v;
      $i('rml').textContent=v>=60?'Alcista':v>=45?'Neutral':'Bajista';
      $i('rmv').style.color=v>=60?'#22c55e':v>=45?'#f59e0b':'#ef4444';
    }
  });
  // Usar klines 3d real si estan en ST, no promedio artificial
  var kl3d=ST.kl['3d'];
  if(kl3d&&kl3d.length>15){
    var cl3d=kl3d.map(function(x){return+x[4]});
    var r3d=rs(cl3d,14);
    if(r3d!==null) rsi3d=r3d;
  }
}
$id("rmv").textContent=rsi3d;$id("rml").textContent=rsi3d>=60?"Alcista":rsi3d>=45?"Neutral":"Bajista";
$id('rmv').style.color=rsi3d>=60?'#22c55e':rsi3d>=45?'#f59e0b':'#ef4444';
$id("lu").textContent="updated "+new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});

// MA40: ocultar fila si no hay datos en vez de mostrar 'Calculando...'
var m4row=$id('m4')&&$id('m4').parentElement;
if(!sd.m40&&m4row){m4row.style.display='none'}else if(sd.m40&&m4row){m4row.style.display='block';$id('m4v').textContent=fm(sd.m40);$id('m4l').textContent=((sd.p/sd.m40-1)*100>=0?'+':'')+((sd.p/sd.m40-1)*100).toFixed(2)+'%'};
}

function fetchUrl(u,t){t=t||8000;var ac=new AbortController;setTimeout(function(){ac.abort()},t);return fetch(u,{signal:ac.signal}).then(function(r){return r.json()})};

// ===== FETCH VIA MODULE (ES module con adapters.js) =====
// Se usa cuando app.module.js cargo correctamente
var _moduleFetching=false;
function fetchViaModule(){
  if(_moduleFetching)return;
  _moduleFetching=true;
  
  // Redirigir cs() y sl() a los modulos reales
  if(window._moduleExports){
    window.cs = function(c){ return window._moduleExports.computeScore(c, CTF); };
    window.sl = function(s){ var r = window._moduleExports.classifyScore(s); return [r.label, r.cssClass]; };
    window.getMAs = window._moduleExports.getMAs;
    window.clearMACache = window._moduleExports.clearMACache;
    window._moduleExports.loadScoreConfig().then(function(){ console.log('[SONO] Score config loaded from module'); });
  }
  
  var ld=document.getElementById("st-bar");
  if(ld){ld.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> Conectando via data layer...';ld.className="st-bar co";}
  
  window._fetchMarketData(CA,{timeframes:['1m','3m','5m','15m','1h','3d']})
    .then(function(md){
      if(!md) throw new Error("No data");
      ST.price=md.price||0;
      ST.high=md.high||0;
      ST.low=md.low||0;
      ST.ch=md.change24hPct||0;
      ST.kl=md.klines||{};
      ST.fg=md.fng||50;
      ST.vx=md.vix||0;
      ST.db=md.btcDominance||0;
      ST.de=md.ethDominance||0;
      ST.mc=md.marketCap||0;
      ST.er=md.eurUsd||1.08;
      ST.health=md.health||{source:'module'};
      
      saveHist("sono_fg",ST.fg);
      saveHist("sono_vx",ST.vx);
      _moduleFetching=false;
      ST._fetching=false;
      updateDone();
    })
    .catch(function(err){
      console.log('[SONO] Module fetch failed, fallback to direct:', err);
      _moduleFetching=false;
      ST._fetching=false;
      // Fallback: ejecutar fetchAll clasico
      window._fetchMarketData=null; // Deshabilitar modulo
      fetchAllLegacy();
    });
}

// Version legacy de fetchAll para fallback
var _legacyData={total:0,expected:0};
function fetchAllLegacy(){
  var s=AS[CA];
  MA_CACHE={};
  if(ST._fetching)return;
  ST._fetching=true;
  if(!SCORE_CFG){ loadScoreConfig(); }

  fetchUrl("https://api.alternative.me/fng/?limit=1").then(function(g){if(g&&g.data&&g.data[0]){ST.fg=+g.data[0].value;saveHist("sono_fg",ST.fg);}}).catch(function(){ST.fg=ST.fg||50});
}

function fetchAll(){
  // Si el ES module cargo, usar fetchMarketData unificado
  if(window._fetchMarketData){
    fetchViaModule();
    return;
  }
  var s=AS[CA];
  MA_CACHE={};
  if(ST._fetching)return;
  ST._fetching=true;
  // Cargar config de score si no se ha cargado
  if(!SCORE_CFG){ loadScoreConfig(); }
  var _fetchTimer=setTimeout(function(){ST._fetching=false;_total=0;var ld=document.getElementById("st-bar");if(ld){ld.innerHTML='<span class="st-dot" style="background:#f59e0b"></span> Timeout - reintentando en 30s';ld.className="st-bar co";}
    // Si aun hay skeleton, mostrar mensaje de error
    var skels=document.querySelectorAll('.skeleton');
    if(skels.length>0){
      document.querySelectorAll('.skeleton').forEach(function(e){e.classList.remove('skeleton');e.textContent='--';(e.style||{}).width='auto'});
      var rbe=document.getElementById('rb');if(rbe)rbe.textContent='Error de conexion - reintentando';
    }},20000);
  var ld=document.getElementById("st-bar");
  if(ld){ld.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> Conectando...';ld.className="st-bar co";}
  var _completed=0,_total=0;
  var _allDone=false;

  // ===== INTENTO PRINCIPAL: Worker sono-bot =====
  function tryWorker(){
    if(ld)ld.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> Consultando sono-bot worker...';
    fetchUrl('https://sono-bot.sonosanty.workers.dev/api/status', 8000)
    .then(function(wd){
      if(wd&&wd.scores&&wd.macro){
        // Worker responded with scores ÔÇö populate ST from it
        var sc=wd.scores[CA];
        if(sc&&sc.price){
          ST.price=sc.price;
          ST.high=sc.high_24h||ST.high;
          ST.low=sc.low_24h||ST.low;
          ST.ch=sc.change_24h||0;
          // Save raw score for updAll to use directly
          ST._fromWorker=true;
          ST._workerScore=sc;
        }
        var m=wd.macro||{};
        if(m.fng){ST.fg=+m.fng;saveHist('sono_fg',ST.fg);}
        if(m.vix){ST.vx=+m.vix;saveHist('sono_vx',ST.vx);}
        if(m.dominance)ST.db=+m.dominance;
        if(m.mcap)ST.mc=+m.mcap;
        if(m.eth_dominance)ST.de=+m.eth_dominance;
        if(m.eur)ST.er=+m.eur;

        if(ld){ld.innerHTML='<span class="st-dot" style="background:#22c55e"></span> Worker sono-bot';ld.className='st-bar ok';}
        _completed=_total;
        _allDone=true;
        clearTimeout(_fetchTimer);
        renderRealHTML();
        updAll();
        ST.loading=false;
        ST._fetching=false;
        return;
      }
      // Worker responded but no useful data ÔÇö fall through to local
      startLocal();
    })
    .catch(function(){
      // Worker unavailable ÔÇö fall through to local
      startLocal();
    });
  }

  // ===== FALLBACK: C├ílculo local directo =====
  function startLocal(){
    if(_allDone)return;
    if(ld)ld.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> Worker offline ÔÇö fuentes directas...';ld.className='st-bar co';

  function done(){
    if(_allDone)return;
    _completed++;
    if(ld)ld.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> ['+_completed+'/'+_total+'] Conectando...';
    clearTimeout(_fetchTimer);
    if(_completed>=_total){
      if(ld){ld.innerHTML='<span class="st-dot" style="background:#22c55e"></span> Datos en vivo';ld.className='st-bar ok';}
      if(typeof ST.fg!="undefined"&&ST.fg>0){
        var kl3d=ST.kl['3d'];if(kl3d&&kl3d.length>15){var cl3d=kl3d.map(function(x){return+x[4]});var r3d=rs(cl3d,14);if(r3d!==null)ST.rsi3d=r3d;}
        renderRealHTML();
        updAll(s);
      }
      ST.loading=false;
      ST._fetching=false;
      clearTimeout(_fetchTimer);
      _allDone=true;
    }
  }
  var tasks=[
    {name:'ticker',run:function(){return fetchUrl('https://api.binance.com/api/v3/ticker/24hr?symbol='+s).then(function(t){ST.price=+t.lastPrice;ST.high=+t.highPrice;ST.low=+t.lowPrice;ST.ch=+t.priceChangePercent;}).catch(function(){var cgId=CA==='BTC'?'bitcoin':CA==='ETH'?'ethereum':CA==='SOL'?'solana':'ripple';return fetchUrl('https://api.coingecko.com/api/v3/simple/price?ids='+cgId+'&vs_currencies=usd&include_24hr_change=true').then(function(gd){if(gd&&gd[cgId]){ST.price=gd[cgId].usd;ST.ch=gd[cgId].usd_24h_change||0}}).catch(function(){})});}},
    {name:'fg',skip:function(){return swrOk('fg');},run:function(){return fetchUrl('https://api.alternative.me/fng/?limit=1').then(function(g){if(g&&g.data&&g.data[0]){ST.fg=+g.data[0].value;saveHist('sono_fg',ST.fg);SWR.fg=Date.now();}}).catch(function(){ST.fg=ST.fg||50});}},
    {name:'cg',skip:function(){return swrOk('cg');},run:function(){return fetchUrl('https://api.coingecko.com/api/v3/global').then(function(gd){if(gd&&gd.data){ST.db=gd.data.market_cap_percentage.btc||0;ST.mc=gd.data.total_market_cap.usd||0;ST.de=gd.data.market_cap_percentage.eth||0;SWR.cg=Date.now();}}).catch(function(){return fetchUrl('https://vix-proxy.sonosanty.workers.dev/global').then(function(gl){if(gl&&gl.data&&gl.data.total_market_cap>0){ST.db=gl.data.dominance||0;ST.mc=gl.data.total_market_cap||0;ST.de=gl.data.eth_dominance||0;SWR.cg=Date.now();}}).catch(function(){})});}},
    {name:'vx',skip:function(){return swrOk('vx');},run:function(){return fetchUrl('https://vix-proxy.sonosanty.workers.dev/vix').then(function(d){if(d&&d.vix){ST.vx=d.vix;saveHist('sono_vx',ST.vx);$('vxv').textContent=d.vix.toFixed(2);$('vxl').textContent='VIX REAL';SWR.vx=Date.now();}}).catch(function(){ST.vx=ST.vx||15;$('vxl').textContent='VIX estimado';});}},
    {name:'eur',skip:function(){return swrOk('eur');},run:function(){return fetchUrl('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT').then(function(e){ST.er=+e.price||1.08;SWR.eur=Date.now();}).catch(function(){ST.er=ST.er||1.08});}}
  ];
  tasks.forEach(function(t){if(t.skip&&t.skip()){taskDone();return;}t.run().then(function(){taskDone()}).catch(function(){taskDone()});});
  var tfs=['1m','3m','5m','15m','1h','3d'],tfi=0;
  var kDone=0;
  function klineDone(){kDone++;if(kDone>=tfs.length){clearTimeout(_fetchTimer);}}
  function nxt(){
    if(tfi>=tfs.length)return;
    var tf=tfs[tfi];tfi++;
    var lim=tf==='3d'?30:tf==='1h'?300:220;
    fetchUrl('https://api.binance.com/api/v3/klines?symbol='+s+'&interval='+tf+'&limit='+lim).then(function(k){ST.kl[tf]=k}).catch(function(){}).then(function(){klineDone()}).catch(function(){klineDone()});
    if(tfi<tfs.length)setTimeout(nxt,200);
  }
  nxt();
  _total=tasks.length+tfs.length;
  } // end startLocal

  // Kick off: try worker first, fallback to local
  tryWorker();
}

var _updPending=false;
function scheduleUpd(){
  if(ST._fetching)return;
  if(!document.getElementById('bp')){renderRealHTML();}
  if(_updPending)return;_updPending=true;
  requestAnimationFrame(function(){_updPending=false;updAll()});
}

// Init
ST.loading=true;
renderHTML();
document.querySelectorAll(".ab button").forEach(function(b){b.addEventListener("click",function(){CA=this.getAttribute("data-a");document.querySelectorAll(".ab button").forEach(function(x){x.classList.remove("ac")});this.classList.add("ac");_dataReady=false;var sb=document.getElementById('st-bar');if(sb){sb.className='st-bar co';sb.innerHTML='<span class="st-dot" style="background:#3b82f6"></span> Conectando fuentes de datos...'};renderHTML();fetchAll()})});
fetchAll();setInterval(function(){if(!ST._fetching)fetchAll();},30000);
window.fetchAll=fetchAll;window.ST=ST;

})();


