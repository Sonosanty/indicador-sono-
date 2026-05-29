

// ═══════════════════════════════════════════════════════════════

// SONO PRO TERMINAL — Motor completo en JS puro

// Sin React · Sin dependencias · Sin backend · Sin OpenClaw

// ═══════════════════════════════════════════════════════════════



const ASSETS_CFG = {

  BTC:{sym:'BTCUSDT',dec:2,col:'#F7931A'},

  ETH:{sym:'ETHUSDT',dec:2,col:'#627EEA'},

  SOL:{sym:'SOLUSDT',dec:3,col:'#9945FF'},

  XRP:{sym:'XRPUSDT',dec:4,col:'#00AAE4'},

};

const BINANCE_REST = 'https://api.binance.com/api/v3';

const BINANCE_WS   = 'wss://stream.binance.com:9443/ws';

const LIMIT = 350, INTERVAL = '3m';



let activeAsset = 'BTC';

let allCandles  = {};

let allCandles1m = {};

let allCandles5m = {};

let allCandles15m = {};

let allTicker   = {};

let wsConn      = null, wsConn1m = null, pingTimer = null, reconnTimer = null, reconnTimer1m = null, staleTimer = null, staleTimer1m = null;

let lastUpdate  = null;

let signalLog   = JSON.parse(localStorage.getItem('sono_signals_v3')||'[]')

                      .map(s=>({...s,time:new Date(s.time)}));

let prevSignal  = null;

let alertsOn    = true;

let nowMs       = Date.now();

setInterval(()=>nowMs=Date.now(),1000);



// ── Format helpers ───────────────────────────────────────────

const fmtN = (n,d)=>n==null?'—':parseFloat(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

const fmtP = (n)=>n==null?'—':'$'+fmtN(n,ASSETS_CFG[activeAsset].dec);

const scCol = s=>!s?'#64748b':s>=78?'#16a34a':s>=62?'#22c55e':s>=52?'#c9a84c':s>=42?'#c9a84c':s>=30?'#dc2626':'#b91c1c';



// ── Math engine ──────────────────────────────────────────────

const calcMA = (arr,p)=>arr.length<p?null:arr.slice(-p).reduce((s,v)=>s+v,0)/p;

const calcRSI=(closes,p=14)=>{

  if(closes.length<=p)return null;

  const d=closes.slice(-(p+1)).map((v,i,a)=>i>0?v-a[i-1]:0).slice(1);

  const g=d.filter(x=>x>0).reduce((s,v)=>s+v,0)/p;

  const l=d.filter(x=>x<0).reduce((s,v)=>s+Math.abs(v),0)/p;

  return l===0?100:+(100-100/(1+g/l)).toFixed(2);

};

const calcBB=(closes,p=20,m=2)=>{

  if(closes.length<p)return null;

  const sl=closes.slice(-p);

  const ma=sl.reduce((s,v)=>s+v,0)/p;

  const std=Math.sqrt(sl.reduce((s,v)=>s+(v-ma)**2,0)/p);

  return{upper:ma+m*std,middle:ma,lower:ma-m*std,std};

};

const calcATR=(candles,p=14)=>{

  if(candles.length<p+1)return null;

  const trs=candles.slice(-(p+1)).map((c,i,a)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-a[i-1].close),Math.abs(c.low-a[i-1].close))).slice(1);

  return trs.reduce((s,v)=>s+v,0)/p;

};

const calcChangePct=(closes)=>{

  if(!closes||closes.length<2)return null;

  const prev=closes.at(-2),cur=closes.at(-1);

  return prev>0?+((cur-prev)/prev*100).toFixed(2):null;

};

const calcADX=(candles,p=14)=>{

  if(candles.length<p*2)return null;

  const sl=candles.slice(-(p*2));

  let dmP=0,dmM=0,tr=0;

  for(let i=1;i<sl.length;i++){

    const c=sl[i],pv=sl[i-1];

    const up=c.high-pv.high,dn=pv.low-c.low;

    dmP+=up>dn&&up>0?up:0; dmM+=dn>up&&dn>0?dn:0;

    tr+=Math.max(c.high-c.low,Math.abs(c.high-pv.close),Math.abs(c.low-pv.close));

  }

  if(tr===0)return 0;

  const diP=(dmP/tr)*100,diM=(dmM/tr)*100;

  return+((Math.abs(diP-diM)/(diP+diM+0.001))*100).toFixed(1);

};

const computeScore=(candles)=>{

  if(!candles||candles.length<210)return null;

  const closes=candles.map(c=>c.close), price=closes.at(-1);

  const ma6=calcMA(closes,6),ma40=calcMA(closes,40),ma70=calcMA(closes,70),ma200=calcMA(closes,200);

  const bb=calcBB(closes,20),adx=calcADX(candles,14),rsi=calcRSI(closes,14),atr=calcATR(candles,14);



  let p1=0,p1d=[];

  if(ma6&&ma40){const ok=ma6>ma40;p1+=ok?12:0;p1d.push({l:'MA6 > MA40',pts:ok?12:0,max:12,up:ok});}

  if(ma6&&ma70){const ok=ma6>ma70;p1+=ok?10:0;p1d.push({l:'MA6 > MA70',pts:ok?10:0,max:10,up:ok});}

  if(ma40&&ma200){const ok=ma40>ma200;p1+=ok?13:0;p1d.push({l:'MA40 > MA200',pts:ok?13:0,max:13,up:ok});}



  let p2=0,p2d=[];

  if(adx!==null){const pts=adx>35?15:adx>25?10:3;p2+=pts;p2d.push({l:`ADX ${adx.toFixed(1)}`,pts,max:15,up:adx>25});}

  if(rsi!==null){const pts=rsi>50&&rsi<70?12:rsi>=35?7:2;p2+=pts;p2d.push({l:`RSI ${rsi.toFixed(1)}`,pts,max:12,up:rsi>50&&rsi<70});}

  if(ma200){const ok=price>ma200;p2+=ok?8:0;p2d.push({l:'Precio > MA200',pts:ok?8:0,max:8,up:ok});}



  let p3=0,p3d=[];

  if(bb){

    const range=bb.upper-bb.lower,pctB=range>0?(price-bb.lower)/range:0.5;

    const pts=pctB<0.15?28:pctB<0.35?20:pctB<0.65?14:pctB<0.85?7:2;

    const lbl=pctB<0.15?'Sobreventa ↑':pctB<0.35?'Zona Baja':pctB<0.65?'Banda Media':pctB<0.85?'Zona Alta':'Sobrecompra ↓';

    p3+=pts;

    p3d.push({l:lbl,pts,max:28,up:pctB<0.5});

    p3d.push({l:`%B: ${(pctB*100).toFixed(0)}%`,pts:0,max:0,info:true});

  }



  const total=Math.min(100,Math.round(p1+p2+p3));

  let signal,decision,zone;

  if(total>=78){signal='COMPRA FUERTE';decision='LONG';zone='Euforia';}

  else if(total>=62){signal='COMPRA';decision='LONG PRUDENTE';zone='Optimismo';}

  else if(total>=52){signal='ACUMULAR';decision='ESPERAR';zone='Neutral+';}

  else if(total>=42){signal='NEUTRAL';decision='ESPERAR';zone='Neutral';}

  else if(total>=30){signal='VENTA';decision='SHORT PRUDENTE';zone='Miedo';}

  else if(total>=18){signal='VENTA FUERTE';decision='SHORT';zone='Acumulación';}

  else{signal='CAPITULACIÓN';decision='CASH/FUERA';zone='Pánico';}

  return{total,p1,p2,p3,p1d,p2d,p3d,signal,decision,zone,ma6,ma40,ma70,ma200,bb,adx,rsi,atr,price};

};



// ── Gauge SVG ────────────────────────────────────────────────

function drawGauge(score){

  const svg=document.getElementById('gaugeSVG');

  const val=score?.total??0, col=scCol(val);

  const cx=80,cy=82,r=60;

  const polar=(deg,rv)=>{

    const rad=((deg-90)*Math.PI)/180;

    return{x:cx+rv*Math.cos(rad),y:cy+rv*Math.sin(rad)};

  };

  const arcD=(s,e,rv)=>{

    const a=polar(s,rv),b=polar(e,rv);

    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${rv} ${rv} 0 ${e-s>180?1:0} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

  };

  const S0=-215,SW=250,sEnd=S0+(SW*val)/100;

  svg.innerHTML=`

    <path d="${arcD(S0,S0+SW,r)}" fill="none" stroke="#1a2a40" stroke-width="12" stroke-linecap="round"/>

    ${val>0?`<path d="${arcD(S0,sEnd,r)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`:''}

    <text x="${cx}" y="${cy-12}" text-anchor="middle" fill="${col}" font-size="32" font-family="'Playfair Display',serif" font-weight="700" font-style="italic">${val}</text>

    <text x="${cx}" y="${cy+6}" text-anchor="middle" fill="#3d5570" font-size="10" font-family="'JetBrains Mono',monospace">/100</text>

    <text x="${cx}" y="${cy+22}" text-anchor="middle" fill="${col}" font-size="9" font-family="'JetBrains Mono',monospace" font-weight="700">${score?.signal??'CARGANDO'}</text>

  `;

}



// ── Candlestick chart SVG ────────────────────────────────────

function drawChart(candles){

  const svg=document.getElementById('mainChart');

  const W=900,H=200,PR=58,PT=6,PB=20,PL=0;

  const display=candles.slice(-120);

  if(display.length<5){

    svg.innerHTML=`<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#3d5570" font-size="12" font-family="'JetBrains Mono',monospace">Acumulando datos Binance… ${candles.length}/350</text>`;

    return;

  }

  const prices=display.flatMap(c=>[c.high,c.low]);

  const minP=Math.min(...prices),maxP=Math.max(...prices);

  const pad=(maxP-minP)*0.06;

  const pY=p=>PT+(1-(p-(minP-pad))/((maxP+pad)-(minP-pad)))*(H-PT-PB);

  const gap=(W-PR)/display.length;

  const cw=Math.max(1.5,gap*0.62);

  const cX=i=>PL+i*gap+gap/2;

  const closes=candles.map(c=>c.close);



  let out='';



  // Grid

  for(let i=0;i<=4;i++){

    const p=minP-pad+((maxP+pad-(minP-pad))*i)/4;

    const y=pY(p);

    out+=`<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="#1a2a40" stroke-width="0.4" stroke-dasharray="3,10"/>`;

    out+=`<text x="${W-PR+4}" y="${(y+3).toFixed(1)}" fill="#2a3a52" font-size="8" font-family="'JetBrains Mono',monospace">${p>1000?(p/1000).toFixed(1)+'k':p.toFixed(2)}</text>`;

  }



  // BB

  ['upper','middle','lower'].forEach((k,ki)=>{

    const col=['rgba(220,38,38,0.25)','rgba(245,158,11,0.25)','rgba(22,163,74,0.25)'][ki];

    const dash=ki===1?'4,4':'0';

    let pts='';

    display.forEach((_,di)=>{

      const ci=candles.length-display.length+di;

      const bbv=calcBB(closes.slice(0,ci+1),20);

      if(!bbv)return;

      pts+=`${di===0?'M':'L'}${cX(di).toFixed(1)},${pY(bbv[k]).toFixed(1)}`;

    });

    if(pts)out+=`<path d="${pts}" fill="none" stroke="${col}" stroke-width="0.8" stroke-dasharray="${dash}"/>`;

  });



  // MAs

  const maCfg=[{p:6,col:'#FFD600',w:0.8},{p:40,col:'#00BCD4',w:1.0},{p:200,col:'#F7931A',w:1.2}];

  maCfg.forEach(({p,col,w})=>{

    let pts='';

    display.forEach((_,di)=>{

      const ci=candles.length-display.length+di;

      const sl=closes.slice(0,ci+1);

      if(sl.length<p)return;

      const v=sl.slice(-p).reduce((s,v)=>s+v,0)/p;

      pts+=`${di===0?'M':'L'}${cX(di).toFixed(1)},${pY(v).toFixed(1)}`;

    });

    if(pts)out+=`<path d="${pts}" fill="none" stroke="${col}" stroke-width="${w}" opacity="0.8"/>`;

  });



  // Candles

  display.forEach((c,i)=>{

    const isG=c.close>=c.open, col=isG?'#16a34a':'#dc2626';

    const bT=pY(Math.max(c.open,c.close)), bB=pY(Math.min(c.open,c.close));

    const bH=Math.max(0.8,bB-bT), x=cX(i);

    out+=`<line x1="${x.toFixed(1)}" y1="${pY(c.high).toFixed(1)}" x2="${x.toFixed(1)}" y2="${pY(c.low).toFixed(1)}" stroke="${col}" stroke-width="0.7" opacity="0.6"/>`;

    out+=`<rect x="${(x-cw/2).toFixed(1)}" y="${bT.toFixed(1)}" width="${cw.toFixed(1)}" height="${bH.toFixed(1)}" fill="${col}" opacity="0.88"/>`;

  });



  // Last price line

  const lp=display.at(-1)?.close;

  if(lp)out+=`<line x1="${PL}" y1="${pY(lp).toFixed(1)}" x2="${W-PR}" y2="${pY(lp).toFixed(1)}" stroke="#ffffff" stroke-width="0.3" stroke-dasharray="4,8" opacity="0.2"/>`;



  // Legend

  [['MA6','#FFD600'],['MA40','#00BCD4'],['MA200','#F7931A'],['BB','rgba(22,163,74,0.25)']].forEach(([l,c],i)=>{

    out+=`<rect x="${6+i*54}" y="${H-10}" width="14" height="2" fill="${c}"/>`;

    out+=`<text x="${6+i*54+18}" y="${H-7}" fill="#2a3a52" font-size="8" font-family="'JetBrains Mono',monospace">${l}</text>`;

  });



  svg.innerHTML=out;

}



// ── Render all UI ────────────────────────────────────────────

function renderAll(){

  const candles=allCandles[activeAsset]||[];

  const ticker=allTicker[activeAsset]||{};

  const score=computeScore(candles);

  const price=ticker.close??candles.at(-1)?.close;

  const col=score?scCol(score.total):'#64748b';

  const cfg=ASSETS_CFG[activeAsset];

  const now=new Date();

  const ts=now.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit',second:'2-digit'});



  // ── PRICE CARD (Number-First) ──

  const priceEl=document.getElementById('priceMain');

  if(priceEl){

    priceEl.textContent=price==null?'—':'$'+fmtN(price,cfg.dec);

    priceEl.style.color=cfg.col;

  }

  const priceBtc=price||0;

  const eurPrice=priceBtc>0?(priceBtc/1.1).toFixed(0):null;

  el('priceSub',eurPrice?'€'+fmtN(eurPrice,0):'—');

  

  const chgV=ticker.change;

  const chgStr=chgV==null?'—':(chgV>=0?'+':'')+chgV.toFixed(2)+'%';

  el('pChg',chgStr);

  const pChgEl=document.getElementById('pChg');

  if(pChgEl)pChgEl.style.color=chgV>=0?'var(--teal)':'var(--red)';

  

  el('pHMini',ticker.low?'$'+fmtN(ticker.low,cfg.dec):'—');

  el('pLMaxi',ticker.high?'$'+fmtN(ticker.high,cfg.dec):'—');

  if(price&&ticker.low){

    const d=price-ticker.low;

    el('pDelta',(d>=0?'+':'')+d.toFixed(cfg.dec));

  }

  el('pVelas',`${candles.length}/350`);

  el('lastUpdateTs',ts);



  // Badge 24h

  const badgeEl2=document.getElementById('priceBadge');

  if(badgeEl2&&chgV!=null){

    badgeEl2.style.display='inline-block';

    badgeEl2.textContent=chgStr;

    badgeEl2.className='card-badge '+(chgV>=0?'pos':'neg');

  }else if(badgeEl2)badgeEl2.style.display='none';



  // ── TICKER MULTI-ASSET ──

  const tickerAssets=['BTC','ETH','SOL','XRP'];

  tickerAssets.forEach(ass=>{

    const tk=allTicker[ass];

    const id24h=ass.toLowerCase()+'24h';

    const idPrice='ticker'+ass;

    const pEl=document.getElementById(idPrice);

    if(pEl){

      if(tk&&tk.close!=null){

        pEl.textContent='$'+fmtN(tk.close,ASSETS_CFG[ass].dec);

        pEl.style.color=ASSETS_CFG[ass].col;

      }else{pEl.textContent='—';pEl.style.color='#64748b';}

    }

    const chgEl=document.getElementById(id24h);

    if(chgEl){

      if(tk&&tk.change!=null){

        const c=tk.change;

        chgEl.textContent=(c>=0?'+':'')+c.toFixed(2)+'%';

        chgEl.style.color=c>=0?'var(--teal)':'var(--red)';

      }else{chgEl.textContent='—';chgEl.style.color='var(--dim)';}

    }

  });



  // ── KPIs GENERALES (simulados desde signalLog) ──

  const openCount=0; // sin backend, simulamos

  const closedCount=signalLog.length;

  const tpCount=signalLog.filter(s=>s.signal.includes('COMPRA')||s.signal.includes('ACUMULAR')).length;

  const slCount=signalLog.filter(s=>s.signal.includes('VENTA')||s.signal.includes('CAPITULACIÓN')).length;

  const beCount=closedCount-tpCount-slCount;

  const wr=closedCount>0?(tpCount/closedCount)*100:0;

  let cumR2=0;

  signalLog.forEach(s=>{

    if(s.signal.includes('COMPRA FUERTE'))cumR2+=2;

    else if(s.signal.includes('COMPRA'))cumR2+=1;

    else if(s.signal.includes('ACUMULAR'))cumR2+=0.5;

    else if(s.signal.includes('VENTA FUERTE')||s.signal.includes('CAPITULACIÓN'))cumR2+=-2;

    else if(s.signal.includes('VENTA'))cumR2+=-1;

  });

  el('kpiOpen',openCount);

  el('kpiClosed',closedCount);

  el('kpiTpSl',`${tpCount} / ${slCount} / ${beCount}`);

  const wrEl2=document.getElementById('kpiWinrate');

  if(wrEl2){wrEl2.textContent=wr.toFixed(1)+'%';wrEl2.style.color=wr>=50?'var(--teal)':'var(--red)';}

  const rTotalEl=document.getElementById('kpiRTotal');

  if(rTotalEl){rTotalEl.textContent=cumR2.toFixed(2)+'R';rTotalEl.style.color=cumR2>=0?'var(--teal)':'var(--red)';}



  // ── MACRO STATE CARD ──

  const decEl=document.getElementById('decisionTxt');

  if(decEl){decEl.textContent=score?.decision??'CARGANDO';decEl.style.color=col;}

  el('signalBadge',score?.signal??'—');

  

    // Determine phase from score (0-6 scale like mifuturapp)
  let level=0, label='CAPITULACIÓN';
  if(score){
    if(score.total>=78){level=6;label='COMPRA FUERTE';}
    else if(score.total>=62){level=5;label='COMPRA';}
    else if(score.total>=52){level=4;label='ACUMULACIÓN';}
    else if(score.total>=42){level=3;label='NEUTRAL';}
    else if(score.total>=30){level=2;label='DISTRIBUCIÓN';}
    else if(score.total>=18){level=1;label='VENTA';}
    else {level=0;label='CAPITULACIÓN';}
  }
  el('scorePhase',label);
  el('scoreScale',level+'/6');
  el('gaugeScore',score?.total??'--');
  el('phaseDescription',getPhaseDescription(score?.total??null));
  el('pb1Macro',score?${score.p1}/35:'--');
  el('pb2Macro',score?${score.p2}/35:'--');
  el('pb3Macro',score?${score.p3}/30:'--');// ── SENTIMENT CARD ──

  const sentM=document.getElementById('sentMarker');

  if(sentM&&score)sentM.style.left=`${Math.min(97,Math.max(3,score.total))}%`;

  const confEl=document.getElementById('confPct');

  if(confEl){confEl.textContent=score?`${score.total}%`:'—';confEl.style.color=col;}

  el('zoneTxt',score?.zone??'—');

  el('sentUpdateTs',ts);



  // ── CHART ──

  drawChart(candles);

  const ctEl=document.getElementById('chartTitle');

  if(ctEl)ctEl.textContent=activeAsset;



  // ── MULTI-TIMEFRAME ──

  renderMultiTF();



  // ── INDICATORS ──

  const maData=[

    {id:'ma6',val:score?.ma6,lbl:'MA6'},

    {id:'ma40',val:score?.ma40,lbl:'MA40'},

    {id:'ma70',val:score?.ma70,lbl:'MA70'},

    {id:'ma200',val:score?.ma200,lbl:'MA200'},

  ];

  maData.forEach(({id,val})=>{

    const elM=document.getElementById(id);

    if(!elM)return;

    const above=price&&val?price>val:null;

    elM.innerHTML=(above!=null?`<span style="color:${above?'var(--teal)':'var(--red)'}">${above?'▲':'▼'}</span> `:'')+

      (val?'$'+fmtN(val,cfg.dec):'—');

  });

  const adxE=document.getElementById('adxVal');

  if(adxE){adxE.textContent=score?.adx!=null?score.adx.toFixed(1):'—';adxE.style.color=score?.adx>25?'var(--teal)':'var(--dim)';}

  const rsiE=document.getElementById('rsiVal');

  if(rsiE){rsiE.textContent=score?.rsi!=null?score.rsi.toFixed(1):'—';rsiE.style.color=score?.rsi>70?'var(--red)':score?.rsi<30?'var(--teal)':'var(--txt)';}

  el('atrVal',score?.atr?'$'+fmtN(score.atr,cfg.dec):'—');

  el('bbPctB',score?.bb?((score.bb.upper-price)/(score.bb.upper-score.bb.lower)*100).toFixed(0)+'%':'—');



  // ATR rule

  const atrBody=document.getElementById('atrBody');

  if(atrBody&&score?.atr&&price){

    const hi=score.atr/price>0.025;

    document.getElementById('atrRule').style.borderColor=hi?'rgba(220,38,38,0.3)':'var(--b)';

    atrBody.textContent=`ATR: $${fmtN(score.atr,cfg.dec)} · ${hi?'⚠ VOLATILIDAD ALTA':'Stops dinámicos activos.'}`;

  }



  // ── PILAR DETAIL ──

  if(score){

    const pd=document.getElementById('pilarDetail');

    if(pd){

      let html='';

      [{title:'P1 — CRUCES MA',items:score.p1d,total:score.p1,max:35},

       {title:'P2 — MOMENTUM',items:score.p2d,total:score.p2,max:35},

       {title:'P3 — BOLLINGER',items:score.p3d,total:score.p3,max:30}].forEach(({title,items,total,max})=>{

        const pct=(total/max)*100;

        const c=pct>=65?'var(--teal)':pct>=40?'var(--gold)':'var(--red)';

        html+=`<div class="pilar-section">

          <div class="pilar-head"><span class="name">${title}</span><span class="pts">${total}/${max}</span></div>

          <div class="pilar-track"><div class="pilar-fill" style="width:${pct}%;background:${c}"></div></div>

          ${items.filter(it=>!it.info).map(it=>`

            <div class="pilar-item">

              <span class="pi-lbl" style="color:${it.up?'var(--teal)':'var(--red)'}">${it.up?'▲':'▼'} ${it.l}</span>

              <span class="pi-pts" style="color:${it.up?'var(--teal)':'var(--red)'}">${it.pts>0?'+':''}${it.pts}</span>

            </div>`).join('')}

          ${items.filter(it=>it.info).map(it=>`<div style="font-size:clamp(8px,0.8vw,10px);color:var(--dim)">${it.l}</div>`).join('')}

        </div>`;

      });

      pd.innerHTML=html;

    }

  }



  // ── CALCULATOR ──

  updateCalc(price);



  // ── TIMELINE ──

  renderTimeline();



  // ── STATUS BAR ──

  el('sbVelas',`VELAS: ${candles.length}`);

  el('sbSignals',`SEÑALES: ${signalLog.length}`);



  // ── EQUITY + TABLES ──

  buildEquityStats();



  // ── DETECT SIGNAL CHANGE ──

  if(score&&score.signal!==prevSignal){

    const k=`${activeAsset}:${score.signal}`;

    if(k!==prevSignal){

      prevSignal=k;

      addSignal(score,price);

      // Crear trade real

      createTradeFromSignal(score, price);

    }

  }



  // ── RANGE INTELLIGENCE ──

  renderRangeIntelligence();

}



// ── Signal management ────────────────────────────────────────

function addSignal(score,price){

  const sig={

    id:Date.now(),time:new Date(),asset:activeAsset,

    signal:score.signal,decision:score.decision,

    score:score.total,price,p1:score.p1,p2:score.p2,p3:score.p3

  };

  signalLog=[sig,...signalLog].slice(0,50);

  try{localStorage.setItem('sono_signals_v3',JSON.stringify(signalLog));}catch(e){}

  if(alertsOn)playAlert(score.signal);

  renderTimeline();

}

function clearSignals(){signalLog=[];localStorage.removeItem('sono_signals_v3');renderTimeline();}

function renderTimeline(){

  const tl=document.getElementById('timeline');

  if(!tl)return;

  if(!signalLog.length){

    tl.innerHTML='<div class="tl-empty">Esperando primera señal…<br><span style="font-size:clamp(8px,0.8vw,10px)">Se guarda automáticamente</span></div>';

    return;

  }

  tl.innerHTML=signalLog.map((s,i)=>{

    const c=s.signal.includes('COMPRA')?'var(--teal)':s.signal.includes('VENTA')||s.signal.includes('CAPIT')?'var(--red)':'var(--gold)';

    const t=new Date(s.time).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

    const p=s.price?'$'+fmtN(s.price,ASSETS_CFG[s.asset]?.dec??2):'';

    return`<div class="tl-item ${i===0?'new':''}" style="border-color:${c}">

      <span class="tl-time">${t}</span>

      <span class="tl-asset">${s.asset}</span>

      <span class="tl-sig" style="color:${c}">${s.signal}</span>

      <span class="tl-score" style="color:${c}">${s.score}</span>

      <span class="tl-price">${p}</span>

    </div>`;

  }).join('');

}



// ── Audio alert ──────────────────────────────────────────────

function playAlert(sig){

  try{

    const ctx=new(window.AudioContext||window.webkitAudioContext)();

    const osc=ctx.createOscillator(),g=ctx.createGain();

    osc.connect(g);g.connect(ctx.destination);

    if(sig==='COMPRA FUERTE'){osc.frequency.setValueAtTime(660,ctx.currentTime);osc.frequency.setValueAtTime(880,ctx.currentTime+0.15);}

    else if(sig.includes('VENTA')||sig.includes('CAPIT')){osc.frequency.setValueAtTime(520,ctx.currentTime);osc.frequency.setValueAtTime(330,ctx.currentTime+0.15);}

    else{osc.frequency.value=440;}

    g.gain.value=0.06;osc.start();osc.stop(ctx.currentTime+0.3);

  }catch(e){}

}

function toggleAlerts(){

  alertsOn=!alertsOn;

  document.getElementById('alertBtn').textContent=alertsOn?'🔔':'🔕';

}

window.toggleAlerts=toggleAlerts;

window.clearSignals=clearSignals;



// ── Helpers ──────────────────────────────────────────────────

function el(id,txt,cls=''){

  const e=document.getElementById(id);

  if(!e)return;

  e.textContent=txt;

  if(cls)e.className=cls;

}

function setPilarBar(n,pts,max){

  const pct=pts!=null?Math.round((pts/max)*100):0;

  const cols=['#16a34a','#c9a84c','#f59e0b'];

  const el2=document.getElementById('pb'+n);

  const el3=document.getElementById('pbf'+n);

  if(el2)el2.textContent=pts!=null?`${pts}/${max}`:'—/'+max;

  if(el3){el3.style.width=`${pct}%`;el3.style.background=cols[n-1];}

}



// ── Calculator ───────────────────────────────────────────────

function updateCalc(price){

  const cap=parseFloat(document.getElementById('cCap')?.value);

  const entry=parseFloat(document.getElementById('cEntry')?.value)||price;

  const sl=parseFloat(document.getElementById('cSl')?.value);

  const risk=(parseFloat(document.getElementById('cRisk')?.value)||2)/100;

  const btn=document.getElementById('liveBtn');

  if(btn&&price)btn.textContent=`⚡ USAR PRECIO ACTUAL $${fmtN(price,ASSETS_CFG[activeAsset].dec)}`;

  const lbl=document.getElementById('cEntryLbl');

  if(lbl)lbl.textContent=price?`ENTRADA (LIVE: $${fmtN(price,ASSETS_CFG[activeAsset].dec)})`:'ENTRADA ($)';

  const res=document.getElementById('calcResults');

  const emp=document.getElementById('calcEmpty');

  if(!cap||!entry||!sl||sl===entry){

    if(res)res.style.display='none';

    if(emp)emp.style.display='block';

    return;

  }

  if(res)res.style.display='grid';

  if(emp)emp.style.display='none';

  const riskAmt=cap*risk;

  const slPct=Math.abs(entry-sl)/entry;

  const posSize=riskAmt/(entry*slPct);

  const posVal=posSize*entry;

  const lev=posVal/cap;

  el('cQty',`${posSize.toFixed(6)} ${activeAsset}`);

  el('cSize','$'+fmtN(posVal,0));

  const levEl=document.getElementById('cLev');

  if(levEl){levEl.textContent=`${lev.toFixed(2)}x`;levEl.style.color=lev>10?'var(--red)':lev>5?'var(--gold)':'var(--teal)';}

  el('cLoss',`-$${fmtN(riskAmt,0)}`);

}

document.addEventListener('input',e=>{if(['cCap','cEntry','cSl','cRisk'].includes(e.target.id))updateCalc(allTicker[activeAsset]?.close||allCandles[activeAsset]?.at(-1)?.close);});

document.getElementById('liveBtn').addEventListener('click',()=>{

  const p=allTicker[activeAsset]?.close||allCandles[activeAsset]?.at(-1)?.close;

  if(p)document.getElementById('cEntry').value=fmtN(p,ASSETS_CFG[activeAsset].dec).replace(/,/g,'');

  updateCalc(p);

});



// ═══════════════════════════════════════════════════════════════

// TRADES REALES — generados desde WebSocket Binance

// ═══════════════════════════════════════════════════════════════



let realTrades = [];

let tradeIdCounter = 100;



function createTradeFromSignal(score, price) {

  if (!score || !price) return;

  const side = score.signal.includes('COMPRA') || score.signal.includes('ACUMULAR') ? 'LONG' :

               score.signal.includes('VENTA') || score.signal.includes('CAPITULACIÓN') ? 'SHORT' : null;

  if (!side) return;

  const candles = allCandles[activeAsset] || [];

  if (candles.length < 20) return;

  let sum = 0, count = 0;

  for (let i = Math.max(1, candles.length - 14); i < candles.length; i++) {

    const prev = candles[i-1], cur = candles[i];

    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));

    sum += tr; count++;

  }

  const atr = count > 0 ? sum / count : 0;

  if (atr <= 0) return;

  const id = `R-${++tradeIdCounter}`;

  const entry = price;

  const sl = side === 'LONG' ? entry - (atr * 1.5) : entry + (atr * 1.5);

  const tp = side === 'LONG' ? entry + (atr * 2.5) : entry - (atr * 2.5);

  const trade = { id, estado: 'OPEN', side, entry, price, sl, tp, low: price, high: price, openTime: new Date().toISOString(), duration: '0m', asset: activeAsset, score: score.total, signal: score.signal, rActual: 0 };

  realTrades.unshift(trade);

  try { localStorage.setItem('sono_real_trades', JSON.stringify(realTrades)); } catch(e){}

  renderRealTrades();

}



function updateOpenTrades() {

  const now = Date.now();

  realTrades.forEach(t => {

    if (t.estado !== 'OPEN') return;

    const ticker = allTicker[t.asset];

    const candles = allCandles[t.asset];

    const cp = ticker?.close || candles?.at(-1)?.close;

    if (!cp) return;

    t.price = cp;

    if (cp > t.high) t.high = cp;

    if (cp < t.low) t.low = cp;

    const elapsed = Math.floor((now - new Date(t.openTime).getTime()) / 60000);

    t.duration = elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed/60)}h ${elapsed%60}m`;

    const riskDist = Math.abs(t.entry - t.sl);

    if (riskDist > 0) t.rActual = ((cp - t.entry) / riskDist) * (t.side === 'LONG' ? 1 : -1);

    const hitSL = t.side === 'LONG' ? cp <= t.sl : cp >= t.sl;

    const hitTP = t.side === 'LONG' ? cp >= t.tp : cp <= t.tp;

    if (hitTP) { t.estado = 'CLOSED'; t.resultado = 'TP'; t.closePrice = cp; t.closeTime = new Date().toISOString(); }

    else if (hitSL) { t.estado = 'CLOSED'; t.resultado = 'SL'; t.closePrice = cp; t.closeTime = new Date().toISOString(); }

    if (t.resultado) {

      const move = (t.closePrice - t.entry) * (t.side === 'LONG' ? 1 : -1);

      t.rGest = riskDist > 0 ? move / riskDist : 0;

      t.pnlPct = (move / t.entry) * 100;

    }

  });

  try { localStorage.setItem('sono_real_trades', JSON.stringify(realTrades)); } catch(e){}

  renderRealTrades();

}



function renderRealTrades() {

  const openT = realTrades.filter(t => t.estado === 'OPEN');

  const closedT = realTrades.filter(t => t.estado === 'CLOSED');

  const cfg = ASSETS_CFG[activeAsset];

  const dec = cfg?.dec || 2;

  el('openCount', openT.length);

  el('closedCount', closedT.length);

  const fmt = (n) => n != null ? n.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec}) : '—';

  const badge = (s, c, lbl) => `<span style="background:rgba(${c},0.15);color:${c};padding:2px 8px;border-radius:999px;font-size:clamp(7px,0.7vw,9px);font-weight:600;">${lbl||s}</span>`;

  const openBody = document.getElementById('openTradesBody');

  const openEmpty = document.getElementById('openEmpty');

  if(openBody&&openEmpty){if(openT.length){openBody.style.display='';openEmpty.style.display='none';openBody.innerHTML=openT.map(t=>{const mfe=((t.high-t.entry)/Math.abs(t.entry-t.sl))*(t.side==='LONG'?1:-1);const mae=((t.low-t.entry)/Math.abs(t.entry-t.sl))*(t.side==='LONG'?1:-1);return `<tr style="border-bottom:0.5px solid var(--b);"><td style="padding:4px 6px;font-family:'JetBrains Mono',monospace;color:var(--dim2);">${t.id}</td><td style="padding:4px 6px;text-align:center;">${badge('OPEN','245,158,11')}</td><td style="padding:4px 6px;text-align:center;color:${t.side==='LONG'?'#16a34a':'#dc2626'};font-weight:600;">${t.side}</td><td style="padding:4px 6px;color:var(--dim2);">${t.signal||'—'}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;">$${fmt(t.entry)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--red);">$${fmt(t.sl)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--teal);">$${fmt(t.tp)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--teal);">+${mfe.toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--red);">${mae.toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;color:var(--dim);">${t.duration}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:${t.rActual>=0?'#16a34a':'#dc2626'};">${t.rActual>=0?'+':''}${t.rActual.toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--dim2);">$${fmt(t.price)}</td></tr>`;}).join('');}else{openBody.style.display='none';openEmpty.style.display='block';}}

  const closedBody = document.getElementById('closedTradesBody');

  const closedEmpty = document.getElementById('closedEmpty');

  if(closedBody&&closedEmpty){if(closedT.length){closedBody.style.display='';closedEmpty.style.display='none';closedBody.innerHTML=closedT.map(t=>{const mfe=((t.high-t.entry)/Math.abs(t.entry-t.sl))*(t.side==='LONG'?1:-1);const mae=((t.low-t.entry)/Math.abs(t.entry-t.sl))*(t.side==='LONG'?1:-1);const rCol=t.rGest>=0?'#16a34a':'#dc2626';const pnlStr=t.pnlPct>=0?'+'+t.pnlPct.toFixed(2)+'%':t.pnlPct.toFixed(2)+'%';const bgCol=t.resultado==='TP'?'22,163,74':t.resultado==='SL'?'220,38,38':'100,116,139';return `<tr style="border-bottom:0.5px solid var(--b);"><td style="padding:4px 6px;font-family:'JetBrains Mono',monospace;color:var(--dim2);">${t.id}</td><td style="padding:4px 6px;text-align:center;">${badge(t.resultado,bgCol)}</td><td style="padding:4px 6px;text-align:center;color:${t.side==='LONG'?'#16a34a':'#dc2626'};font-weight:600;">${t.side}</td><td style="padding:4px 6px;color:var(--dim2);">${t.signal||'—'}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;">$${fmt(t.entry)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;">$${fmt(t.closePrice||t.price)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--red);">$${fmt(t.sl)}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--teal);">+${mfe.toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--red);">${mae.toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;color:var(--dim);">${t.duration}</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:${rCol};">${(t.rGest||0)>=0?'+':''}${(t.rGest||0).toFixed(2)}R</td><td style="padding:4px 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:${t.pnlPct>=0?'#16a34a':'#dc2626'};">${pnlStr}</td></tr>`;}).join('');}else{closedBody.style.display='none';closedEmpty.style.display='block';}}

}



try{const saved=localStorage.getItem('sono_real_trades');if(saved)realTrades=JSON.parse(saved);}catch(e){}

setInterval(updateOpenTrades,3000);

setTimeout(()=>{document.querySelectorAll('.trade-tab').forEach(btn=>{btn.addEventListener('click',()=>{const tab=btn.dataset.tt;document.querySelectorAll('.trade-tab').forEach(b=>{b.style.background='transparent';b.style.color='var(--dim)';b.style.fontWeight='400'});btn.style.background='rgba(255,255,255,0.06)';btn.style.color='var(--txt)';btn.style.fontWeight='600';document.getElementById('panelOpen').style.display=tab==='open'?'block':'none';document.getElementById('panelClosed').style.display=tab==='closed'?'block':'none';})});},2000);



// ═══════════════════════════════════════════════════════════════

// EQUITY CURVE + RENDIMIENTO + FILTROS

// ═══════════════════════════════════════════════════════════════



let equityCanvas = null;



function buildEquityStats(){

  const signals = signalLog;

  const eqCanvas = document.getElementById('equityCanvas');



  if(!signals.length){

    // Show empty state

    ['eqWin','eqLoss','eqWr','eqPf','eqExp','eqDd','eqBestR','eqWorstR'].forEach(id=>{

      const e=document.getElementById(id);

      if(e)e.textContent='—';

    });

    document.getElementById('setupBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--dim)">Sin señales aún</td></tr>';

    document.getElementById('tfBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--dim)">Sin señales aún</td></tr>';

    renderFilteredSignals();

    return;

  }



  // Asignar R a cada señal según score

  // Score 0-100 → lo normalizamos como R

  // COMPRA FUERTE (>=78): +2R, COMPRA (>=62): +1R, ACUMULAR (>=52): +0.5R

  // NEUTRAL: 0R, VENTA (>=30): -0.5R, VENTA FUERTE (>=18): -1R, CAPITULACIÓN (<18): -2R

  const sigToR = sig => {

    if(sig.includes('COMPRA FUERTE')) return 2;

    if(sig.includes('COMPRA')) return 1;

    if(sig.includes('ACUMULAR')) return 0.5;

    if(sig.includes('NEUTRAL')) return 0;

    if(sig.includes('VENTA FUERTE') || sig.includes('CAPITULACIÓN')) return -2;

    if(sig.includes('VENTA')) return -1;

    return 0;

  };



  const sigToResult = sig => {

    if(sig.includes('COMPRA') || sig.includes('ACUMULAR')) return 'TP';

    if(sig.includes('VENTA') || sig.includes('CAPITULACIÓN')) return 'SL';

    return 'BE';

  };



  const sigToSetup = sig => {

    if(sig.includes('FUERTE')) return 'SEÑAL FUERTE';

    if(sig.includes('COMPRA') || sig.includes('VENTA') || sig.includes('ACUMULAR') || sig.includes('CAPITULACIÓN')) return 'SEÑAL DIRECCIONAL';

    return 'NEUTRAL';

  };



  const equityData = signals.map(s => ({

    ...s,

    rVal: sigToR(s.signal),

    result: sigToResult(s.signal),

    setup: sigToSetup(s.signal)

  }));



  // Calcular curva de equity

  let cumR = 0;

  const curveValues = equityData.map(s => { cumR += s.rVal; return cumR; });

  const totalR = curveValues.length ? curveValues.at(-1) : 0;



  // KPIs

  const winners = equityData.filter(s => s.rVal > 0).length;

  const losers = equityData.filter(s => s.rVal < 0).length;

  const total = equityData.length;

  const winrate = total > 0 ? (winners / total) * 100 : 0;

  const grossWin = equityData.filter(s => s.rVal > 0).reduce((a,s) => a + s.rVal, 0);

  const grossLoss = equityData.filter(s => s.rVal < 0).reduce((a,s) => a + Math.abs(s.rVal), 0);

  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const avgR = total > 0 ? totalR / total : 0;

  const bestR = equityData.length ? Math.max(...equityData.map(s => s.rVal)) : 0;

  const worstR = equityData.length ? Math.min(...equityData.map(s => s.rVal)) : 0;



  // Max DD

  let peak = -Infinity, maxDD = 0;

  curveValues.forEach(v => {

    if(v > peak) peak = v;

    const dd = peak - v;

    if(dd > maxDD) maxDD = dd;

  });



  // Mostrar KPIs

  el('eqWin', winners);

  el('eqLoss', losers);

  const wrEl = document.getElementById('eqWr');

  if(wrEl){wrEl.textContent = winrate.toFixed(1)+'%'; wrEl.style.color = winrate >= 50 ? 'var(--teal)' : 'var(--red)';}

  const pfEl = document.getElementById('eqPf');

  if(pfEl){pfEl.textContent = profitFactor === Infinity ? '∞' : profitFactor.toFixed(2); pfEl.style.color = profitFactor >= 1.5 ? 'var(--teal)' : profitFactor >= 1 ? 'var(--txt)' : 'var(--red)';}

  el('eqExp', avgR.toFixed(2)+'R');

  el('eqDd', '-'+maxDD.toFixed(2)+'R');

  el('eqBestR', '+'+bestR.toFixed(1)+'R');

  el('eqWorstR', worstR.toFixed(1)+'R');



  // --- Equity Curve Canvas ---

  if(eqCanvas && eqCanvas.parentNode){

    const rect = eqCanvas.parentNode.getBoundingClientRect();

    eqCanvas.width = (rect.width || 300) * 2;

    eqCanvas.height = 120 * 2;

  }

  const ctx = eqCanvas ? eqCanvas.getContext('2d') : null;

  if(ctx && curveValues.length > 0){

    const W = eqCanvas.width, H = eqCanvas.height;

    const pad = {t:20, b:20, l:30, r:20};

    const cw = W - pad.l - pad.r;

    const ch = H - pad.t - pad.b;

    ctx.clearRect(0,0,W,H);

    ctx.scale(1,1);



    const minV = Math.min(0, ...curveValues);

    const maxV = Math.max(0, ...curveValues);

    const range = (maxV - minV) || 1;

    const padR = range * 0.1;



    const xPos = i => pad.l + (i / Math.max(1, curveValues.length - 1)) * cw;

    const yPos = v => pad.t + ch - ((v - (minV - padR)) / (range + 2*padR)) * ch;



    // Grid

    ctx.strokeStyle = '#1a2a40';

    ctx.lineWidth = 0.5;

    for(let i=0;i<=4;i++){

      const y = pad.t + (i/4)*ch;

      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();

    }



    // Zero line

    const zy = yPos(0);

    ctx.strokeStyle = '#3d557080';

    ctx.lineWidth = 0.5;

    ctx.setLineDash([4,4]);

    ctx.beginPath(); ctx.moveTo(pad.l, zy); ctx.lineTo(W - pad.r, zy); ctx.stroke();

    ctx.setLineDash([]);



    // Fill area

    ctx.beginPath();

    ctx.moveTo(xPos(0), yPos(0));

    curveValues.forEach((v,i) => ctx.lineTo(xPos(i), yPos(v)));

    ctx.lineTo(xPos(curveValues.length-1), yPos(0));

    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);

    const eqColor = totalR >= 0 ? 'rgba(0,212,170,' : 'rgba(255,69,96,';

    fillGrad.addColorStop(0, eqColor+'0.25)');

    fillGrad.addColorStop(1, eqColor+'0.02)');

    ctx.fillStyle = fillGrad;

    ctx.fill();



    // Line

    ctx.beginPath();

    curveValues.forEach((v,i) => {

      i === 0 ? ctx.moveTo(xPos(i), yPos(v)) : ctx.lineTo(xPos(i), yPos(v));

    });

    ctx.strokeStyle = totalR >= 0 ? '#16a34a' : '#dc2626';

    ctx.lineWidth = 2;

    ctx.lineJoin = 'round';

    ctx.stroke();



    // Points

    curveValues.forEach((v,i) => {

      ctx.beginPath();

      ctx.arc(xPos(i), yPos(v), 2, 0, 2*Math.PI);

      ctx.fillStyle = v >= 0 ? '#16a34a' : '#dc2626';

      ctx.fill();

    });



    // Labels

    ctx.fillStyle = '#3d5570';

    ctx.font = '8px "JetBrains Mono",monospace';

    ctx.textAlign = 'left';

    ctx.fillText('R: '+totalR.toFixed(1)+'R', pad.l, 10);

    ctx.textAlign = 'right';

    ctx.fillText('Trades: '+total, W - pad.r, 10);

  }



  // --- Tabla por Setup ---

  const setupGroups = {};

  equityData.forEach(s => {

    const key = s.setup;

    if(!setupGroups[key]) setupGroups[key] = [];

    setupGroups[key].push(s);

  });

  const setupRows = Object.entries(setupGroups).map(([key, arr]) => {

    const n = arr.length;

    const w = arr.filter(s => s.rVal > 0).length;

    const wr = (w / n) * 100;

    const rT = arr.reduce((a,s) => a + s.rVal, 0);

    const rM = rT / n;

    const gw = arr.filter(s => s.rVal > 0).reduce((a,s) => a + s.rVal, 0);

    const gl = arr.filter(s => s.rVal < 0).reduce((a,s) => a + Math.abs(s.rVal), 0);

    const pf = gl > 0 ? gw / gl : gw > 0 ? Infinity : 0;

    return {key, n, wr, rT, rM, pf};

  }).sort((a,b) => b.rT - a.rT);



  const setupBody = document.getElementById('setupBody');

  if(setupBody){

    setupBody.innerHTML = setupRows.map(r => `

      <tr>

        <td style="padding:3px 4px;color:var(--txt)"><strong>${r.key}</strong></td>

        <td style="padding:3px 4px;text-align:center">${r.n}</td>

        <td style="padding:3px 4px;text-align:center;color:${r.wr>=50?'var(--teal)':'var(--red)'}">${r.wr.toFixed(0)}%</td>

        <td style="padding:3px 4px;text-align:right;color:${r.rT>=0?'var(--teal)':'var(--red)'}">${r.rT>=0?'+':''}${r.rT.toFixed(2)}R</td>

        <td style="padding:3px 4px;text-align:right">${r.rM.toFixed(2)}R</td>

        <td style="padding:3px 4px;text-align:right;color:${r.pf>=1.5?'var(--teal)':r.pf>=1?'var(--txt)':'var(--red)'}">${r.pf===Infinity?'∞':r.pf.toFixed(2)}</td>

      </tr>

    `).join('');

  }



  // --- Tabla por Timeframe ---

  const tfGroups = {};

  equityData.forEach(s => {

    const key = '3m'; // Nuestro timeframe fijo

    if(!tfGroups[key]) tfGroups[key] = [];

    tfGroups[key].push(s);

  });

  const tfRows = Object.entries(tfGroups).map(([key, arr]) => {

    const n = arr.length;

    const w = arr.filter(s => s.rVal > 0).length;

    const wr = (w / n) * 100;

    const rT = arr.reduce((a,s) => a + s.rVal, 0);

    const rM = rT / n;

    const gw = arr.filter(s => s.rVal > 0).reduce((a,s) => a + s.rVal, 0);

    const gl = arr.filter(s => s.rVal < 0).reduce((a,s) => a + Math.abs(s.rVal), 0);

    const pf = gl > 0 ? gw / gl : gw > 0 ? Infinity : 0;

    return {key, n, wr, rT, rM, pf};

  }).sort((a,b) => b.rT - a.rT);



  const tfBody = document.getElementById('tfBody');

  if(tfBody){

    tfBody.innerHTML = tfRows.map(r => `

      <tr>

        <td style="padding:3px 4px;color:var(--txt)"><strong>${r.key}</strong></td>

        <td style="padding:3px 4px;text-align:center">${r.n}</td>

        <td style="padding:3px 4px;text-align:center;color:${r.wr>=50?'var(--teal)':'var(--red)'}">${r.wr.toFixed(0)}%</td>

        <td style="padding:3px 4px;text-align:right;color:${r.rT>=0?'var(--teal)':'var(--red)'}">${r.rT>=0?'+':''}${r.rT.toFixed(2)}R</td>

        <td style="padding:3px 4px;text-align:right">${r.rM.toFixed(2)}R</td>

        <td style="padding:3px 4px;text-align:right;color:${r.pf>=1.5?'var(--teal)':r.pf>=1?'var(--txt)':'var(--red)'}">${r.pf===Infinity?'∞':r.pf.toFixed(2)}</td>

      </tr>

    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:10px;color:var(--dim)">Sin datos</td></tr>';

  }



  // --- Timeline filtrada ---

  renderFilteredSignals();

}



function renderFilteredSignals(){

  const filterResult = document.getElementById('filterResult')?.value || 'ALL';

  const filterAsset = document.getElementById('filterSideSig')?.value || 'ALL';

  const search = (document.getElementById('filterSignalSearch')?.value || '').toLowerCase();



  let filtered = signalLog.slice();



  if(filterResult !== 'ALL'){

    filtered = filtered.filter(s => {

      if(filterResult === 'COMPRA') return s.signal.includes('COMPRA') || s.signal.includes('ACUMULAR');

      if(filterResult === 'VENTA') return s.signal.includes('VENTA') || s.signal.includes('CAPITULACIÓN');

      if(filterResult === 'NEUTRAL') return s.signal.includes('NEUTRAL');

      return true;

    });

  }



  if(filterAsset !== 'ALL'){

    filtered = filtered.filter(s => s.asset === filterAsset);

  }



  if(search){

    filtered = filtered.filter(s => s.signal.toLowerCase().includes(search));

  }



  const tl = document.getElementById('filteredTimeline');

  if(!tl) return;



  if(!filtered.length){

    tl.innerHTML = '<div class="tl-empty" style="padding:15px 0">Sin señales con esos filtros</div>';

    return;

  }



  tl.innerHTML = filtered.map((s,i) => {

    const c = s.signal.includes('COMPRA') ? '#16a34a' : s.signal.includes('VENTA') || s.signal.includes('CAPIT') ? '#dc2626' : '#c9a84c';

    const t = new Date(s.time).toLocaleTimeString('es', {hour:'2-digit', minute:'2-digit', second:'2-digit'});

    const p = s.price ? '$'+fmtN(s.price, ASSETS_CFG[s.asset]?.dec??2) : '';

    return `<div class="tl-item ${i===0?'new':''}" style="border-color:${c}">

      <span class="tl-time">${t}</span>

      <span class="tl-asset">${s.asset}</span>

      <span class="tl-sig" style="color:${c}">${s.signal}</span>

      <span class="tl-score" style="color:${c}">${s.score}</span>

      <span class="tl-price">${p}</span>

    </div>`;

  }).join('');

}



// Hook filters

setTimeout(() => {

  const f1 = document.getElementById('filterResult');

  const f2 = document.getElementById('filterSideSig');

  const f3 = document.getElementById('filterSignalSearch');

  if(f1) f1.addEventListener('change', renderFilteredSignals);

  if(f2) f2.addEventListener('change', renderFilteredSignals);

  if(f3) f3.addEventListener('input', renderFilteredSignals);

}, 1000);



// Hook equity canvas after DOM

setTimeout(() => {

  equityCanvas = document.getElementById('equityCanvas');

}, 100);



// ═══════════════════════════════════════════════════════════════

// MULTI-TIMEFRAME ANALYSIS (1m, 5m, 15m)

// ═══════════════════════════════════════════════════════════════



function computeScoreMultiTF(candles1m, candles5m, candles15m) {

  function analyzeTF(candles, tfLabel) {

    if (!candles || candles.length < 50) {

      return { sesgo: 'NEUTRAL', confianza: 0, rsi: null, tendencia: '—', cambio: null, ma6: null, ma40: null, ma200: null, score: 50 };

    }

    const closes = candles.map(c => c.close);

    const price = closes.at(-1);

    const rsi = calcRSI(closes, 14);

    const ma6 = calcMA(closes, 6);

    const ma40 = calcMA(closes, 40);

    const ma200 = calcMA(closes, 200);

    const cambio = calcChangePct(closes);



    let tendencia = '—';

    if (ma6 !== null && ma40 !== null && ma200 !== null) {

      if (ma6 > ma40 && ma40 > ma200) tendencia = 'ALCISTA FUERTE';

      else if (ma6 > ma40) tendencia = 'ALCISTA';

      else if (ma6 < ma40 && ma40 < ma200) tendencia = 'BAJISTA FUERTE';

      else if (ma6 < ma40) tendencia = 'BAJISTA';

      else tendencia = 'LATERAL';

    }



    let tfScore = 50;

    if (rsi !== null) {

      if (rsi > 65) tfScore += 15;

      else if (rsi > 55) tfScore += 8;

      else if (rsi < 35) tfScore -= 15;

      else if (rsi < 45) tfScore -= 8;

    }

    if (ma6 !== null && ma40 !== null) {

      if (ma6 > ma40) tfScore += 12;

      else tfScore -= 10;

    }

    if (ma200 !== null && price !== null) {

      if (price > ma200) tfScore += 8;

      else tfScore -= 8;

    }

    if (cambio !== null) {

      if (cambio > 0.5) tfScore += 5;

      else if (cambio < -0.5) tfScore -= 5;

    }



    tfScore = Math.max(0, Math.min(100, tfScore));



    let sesgo;

    if (tfScore >= 65) sesgo = 'LONG';

    else if (tfScore >= 45) sesgo = 'NEUTRAL';

    else sesgo = 'SHORT';



    const confianza = Math.min(100, Math.round(

      30 +

      (rsi !== null ? (Math.abs(rsi - 50) < 5 ? 5 : Math.abs(rsi - 50) > 20 ? 20 : 12) : 0) +

      (ma6 !== null && ma40 !== null ? 15 : 0) +

      (ma200 !== null && price !== null ? 10 : 0) +

      (cambio !== null && Math.abs(cambio) > 0.3 ? 10 : 0)

    ));



    return { sesgo, confianza, rsi, tendencia, cambio, ma6, ma40, ma200, score: tfScore };

  }



  const tf1m = analyzeTF(candles1m, '1m');

  const tf5m = analyzeTF(candles5m, '5m');

  const tf15m = analyzeTF(candles15m, '15m');



  const weights = { LONG: { '1m': 0.2, '5m': 0.35, '15m': 0.45 }, SHORT: { '1m': 0.2, '5m': 0.35, '15m': 0.45 } };



  let longConf = 0, shortConf = 0;

  const tfs = [tf1m, tf5m, tf15m];

  const tfKeys = ['1m', '5m', '15m'];



  tfs.forEach((tf, i) => {

    const key = tfKeys[i];

    if (tf.sesgo === 'LONG') longConf += weights.LONG[key] * tf.confianza;

    else if (tf.sesgo === 'SHORT') shortConf += weights.SHORT[key] * tf.confianza;

    else {

      longConf += weights.LONG[key] * tf.confianza * 0.4;

      shortConf += weights.SHORT[key] * tf.confianza * 0.4;

    }

  });



  const sesgos = [tf1m.sesgo, tf5m.sesgo, tf15m.sesgo];

  const allLong = sesgos.every(s => s === 'LONG');

  const allShort = sesgos.every(s => s === 'SHORT');

  const allNeutral = sesgos.every(s => s === 'NEUTRAL');



  let confianzaGlobal, decision;



  if (allLong) {

    confianzaGlobal = Math.min(100, Math.round(longConf * 1.25));

    decision = 'LONG ✅';

  } else if (allShort) {

    confianzaGlobal = Math.min(100, Math.round(shortConf * 1.25));

    decision = 'SHORT 🔻';

  } else if (!allNeutral) {

    const longs = sesgos.filter(s => s === 'LONG').length;

    const shorts = sesgos.filter(s => s === 'SHORT').length;

    if (longs > shorts) {

      confianzaGlobal = Math.min(100, Math.round(longConf * 0.85));

      decision = 'LONG DÉBIL';

    } else if (shorts > longs) {

      confianzaGlobal = Math.min(100, Math.round(shortConf * 0.85));

      decision = 'SHORT DÉBIL';

    } else {

      confianzaGlobal = Math.min(100, Math.round(Math.max(longConf, shortConf) * 0.6));

      decision = 'DIVERGENTE ⚠️';

    }

  } else {

    confianzaGlobal = Math.min(100, Math.round((longConf + shortConf) / 2 * 0.5));

    decision = 'NEUTRAL ⏸️';

  }



  return { tf1m, tf5m, tf15m, confianzaGlobal, decision, longConf: Math.round(longConf), shortConf: Math.round(shortConf) };

}



function renderMultiTF(){

  const mtf = computeScoreMultiTF(allCandles1m[activeAsset], allCandles5m[activeAsset], allCandles15m[activeAsset]);

  if(!mtf)return;



  const tfs = [

    {key:'tf1m', label:'1 minuto', data:mtf.tf1m},

    {key:'tf5m', label:'5 minutos', data:mtf.tf5m},

    {key:'tf15m', label:'15 minutos', data:mtf.tf15m}

  ];



  tfs.forEach(({key,label,data})=>{

    const el = document.getElementById(key);

    if(!el) return;

    const sesgoCol = data.sesgo==='LONG'?'var(--teal)':data.sesgo==='SHORT'?'var(--red)':'var(--gold)';

    const rsiCol = data.rsi!==null ? (data.rsi>70?'var(--red)':data.rsi<30?'var(--teal)':'var(--txt)') : 'var(--dim)';

    const tenCol = data.tendencia.includes('ALCISTA')?'var(--teal)':data.tendencia.includes('BAJISTA')?'var(--red)':'var(--dim)';



    el.innerHTML = `

      <div class="mtf-header">

        <span class="mtf-label">${label}</span>

        <span class="mtf-sesgo" style="color:${sesgoCol}">${data.sesgo}</span>

      </div>

      <div class="mtf-body">

        <div class="mtf-row">

          <span class="mtf-row-label">RSI</span>

          <span class="mtf-row-val" style="color:${rsiCol}">${data.rsi!==null?data.rsi.toFixed(1):'—'}</span>

        </div>

        <div class="mtf-row">

          <span class="mtf-row-label">Tendencia</span>

          <span class="mtf-row-val" style="color:${tenCol}">${data.tendencia}</span>

        </div>

        <div class="mtf-row">

          <span class="mtf-row-label">Confianza</span>

          <span class="mtf-row-val" style="color:${sesgoCol}">${data.confianza}%</span>

        </div>

      </div>

    `;

  });



  // Global confidence

  const gcEl = document.getElementById('mtfGlobalConf');

  if(gcEl){

    const gcCol = mtf.decision.includes('LONG')?'var(--teal)':mtf.decision.includes('SHORT')?'var(--red)':mtf.decision.includes('DIVERGENTE')?'var(--amber)':'var(--gold)';

    gcEl.textContent = mtf.confianzaGlobal+'%';

    gcEl.style.color = gcCol;

  }

  const decEl = document.getElementById('mtfDecision');

  if(decEl){

    const gcCol2 = mtf.decision.includes('LONG')?'var(--teal)':mtf.decision.includes('SHORT')?'var(--red)':mtf.decision.includes('DIVERGENTE')?'var(--amber)':'var(--gold)';

    decEl.textContent = mtf.decision;

    decEl.style.color = gcCol2;

  }

  const lgEl = document.getElementById('mtfLongConf');

  if(lgEl)lgEl.textContent = mtf.longConf+'%';

  const shEl = document.getElementById('mtfShortConf');

  if(shEl)shEl.textContent = mtf.shortConf+'%';

}



// ── WS Status ────────────────────────────────────────────────

function setWsStatus(s){

  const dot=document.getElementById('wsDot');

  const lbl=document.getElementById('wsLabel');

  const sbWs=document.getElementById('sbWs');

  const cols={live:'#16a34a',connecting:'#f59e0b',stalled:'#dc2626',error:'#dc2626'};

  if(dot){dot.className='ws-dot '+s;dot.style.background=cols[s]??'#3d5570';}

  if(lbl){lbl.textContent=s.toUpperCase();lbl.style.color=cols[s]??'#3d5570';}

  if(sbWs)sbWs.textContent='WS: '+s.toUpperCase();

}



// ── Binance REST ─────────────────────────────────────────────

async function loadCandles(asset){

  const t0=Date.now();

  try{

    const res=await fetch(`${BINANCE_REST}/klines?symbol=${ASSETS_CFG[asset].sym}&interval=${INTERVAL}&limit=${LIMIT}`);

    if(!res.ok)throw new Error(res.status);

    const raw=await res.json();

    document.getElementById('hLatency').textContent=`${Date.now()-t0}ms`;

    document.getElementById('hSource').textContent='BINANCE';

    document.getElementById('sbSource').textContent='FUENTE: BINANCE';

    allCandles[asset]=raw.map(k=>({time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}));

    if(asset===activeAsset)renderAll();

  }catch(e){

    document.getElementById('hSource').textContent='ERROR';

    console.warn('REST fail',e.message);

  }

}



async function loadCandles1m(asset){

  try{

    const res=await fetch(`${BINANCE_REST}/klines?symbol=${ASSETS_CFG[asset].sym}&interval=1m&limit=${LIMIT}`);

    if(!res.ok)throw new Error(res.status);

    const raw=await res.json();

    const parsed=raw.map(k=>({time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}));

    allCandles1m[asset]=parsed;

    if(parsed.length>=5)allCandles5m[asset]=aggregateCandles(parsed,5);

    if(parsed.length>=15)allCandles15m[asset]=aggregateCandles(parsed,15);

    if(asset===activeAsset)renderAll();

  }catch(e){

    console.warn('REST 1m fail',e.message);

  }

}



async function loadTicker(asset){

  try{

    const res=await fetch(`${BINANCE_REST}/ticker/24hr?symbol=${ASSETS_CFG[asset].sym}`);

    const d=await res.json();

    allTicker[asset]={close:+d.lastPrice,high:+d.highPrice,low:+d.lowPrice,change:+d.priceChangePercent,volume:+d.quoteVolume};

    renderAll();

  }catch(e){}

}



// ── Binance WebSocket ────────────────────────────────────────

function connectWS(asset){

  if(wsConn)wsConn.close();

  clearInterval(pingTimer);clearTimeout(reconnTimer);clearTimeout(staleTimer);

  let ws;

  try{ws=new WebSocket(`${BINANCE_WS}/${ASSETS_CFG[asset].sym.toLowerCase()}@kline_${INTERVAL}`);}

  catch(e){setWsStatus('error');reconnTimer=setTimeout(()=>connectWS(asset),8000);return;}

  wsConn=ws;setWsStatus('connecting');



  ws.onopen=()=>{

    setWsStatus('live');

    pingTimer=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({method:'ping'}));},20000);

  };

  ws.onmessage=({data})=>{

    try{

      const msg=JSON.parse(data);

      if(!msg.k)return;

      const k=msg.k;

      const candle={time:+k.t,open:+k.o,high:+k.h,low:+k.l,close:+k.c,volume:+k.v};

      lastUpdate=Date.now();

      clearTimeout(staleTimer);

      staleTimer=setTimeout(()=>setWsStatus('stalled'),240000);

      const cur=[...(allCandles[asset]||[])];

      const last=cur.at(-1);

      if(last&&last.time===candle.time)cur[cur.length-1]=candle;

      else if(candle.time>(last?.time??0)){cur.push(candle);if(cur.length>LIMIT)cur.shift();}

      allCandles[asset]=cur;

      allTicker[asset]={...allTicker[asset],close:+k.c};

      if(asset===activeAsset){

        renderAll();

        // Update last update indicator

        const upEl=document.getElementById('hUpdate');

        if(upEl)upEl.textContent='AHORA';

      }

    }catch(e){}

  };

  ws.onerror=()=>setWsStatus('error');

  ws.onclose=()=>{

    clearInterval(pingTimer);setWsStatus('stalled');

    reconnTimer=setTimeout(()=>connectWS(asset),4000);

  };

}



// ── Binance WebSocket for 1m candles (multi-TF) ─────────────

function connectWS1m(asset){

  if(wsConn1m)wsConn1m.close();

  clearTimeout(reconnTimer1m);clearTimeout(staleTimer1m);

  let ws;

  try{ws=new WebSocket(`${BINANCE_WS}/${ASSETS_CFG[asset].sym.toLowerCase()}@kline_1m`);}

  catch(e){reconnTimer1m=setTimeout(()=>connectWS1m(asset),8000);return;}

  wsConn1m=ws;



  ws.onopen=()=>{};

  ws.onmessage=({data})=>{

    try{

      const msg=JSON.parse(data);

      if(!msg.k)return;

      const k=msg.k;

      const candle={time:+k.t,open:+k.o,high:+k.h,low:+k.l,close:+k.c,volume:+k.v};

      clearTimeout(staleTimer1m);

      staleTimer1m=setTimeout(()=>{},240000);

      let cur=[...(allCandles1m[asset]||[])];

      const last=cur.at(-1);

      if(last&&last.time===candle.time)cur[cur.length-1]=candle;

      else if(candle.time>(last?.time??0)){cur.push(candle);if(cur.length>350)cur.shift();}

      allCandles1m[asset]=cur;



      if(cur.length>=5){

        const c5=aggregateCandles(cur,5);

        if(c5.length)allCandles5m[asset]=c5;

      }

      if(cur.length>=15){

        const c15=aggregateCandles(cur,15);

        if(c15.length)allCandles15m[asset]=c15;

      }



      if(asset===activeAsset)renderAll();

    }catch(e){}

  };

  ws.onerror=()=>{};

  ws.onclose=()=>{

    reconnTimer1m=setTimeout(()=>connectWS1m(asset),4000);

  };

}



function aggregateCandles(sourceCandles, period) {

  const result = [];

  for (let i = 0; i < sourceCandles.length; i += period) {

    const slice = sourceCandles.slice(i, i + period);

    if (slice.length < period / 2) break;

    const open = slice[0].open;

    const high = Math.max(...slice.map(c => c.high));

    const low = Math.min(...slice.map(c => c.low));

    const close = slice.at(-1).close;

    const volume = slice.reduce((s, c) => s + c.volume, 0);

    const time = slice[0].time;

    result.push({ time, open, high, low, close, volume });

  }

  return result;

}



// ── Asset tabs ───────────────────────────────────────────────

document.querySelectorAll('.asset-tab').forEach(btn=>{

  btn.addEventListener('click',()=>{

    document.querySelectorAll('.asset-tab').forEach(b=>b.classList.remove('active'));

    btn.classList.add('active');

    activeAsset=btn.dataset.k;

    prevSignal=null;

    if(!allCandles[activeAsset]||allCandles[activeAsset].length<10){

      loadCandles(activeAsset);

      loadTicker(activeAsset);

    }

    connectWS(activeAsset);

    connectWS1m(activeAsset);

    renderAll();

  });

});



// ── Clock ────────────────────────────────────────────────────

setInterval(()=>{

  const t=new Date().toLocaleTimeString('es');

  const sbClock=document.getElementById('sbClock');

  if(sbClock)sbClock.textContent=t;

  const hUp=document.getElementById('hUpdate');

  if(hUp&&lastUpdate){

    const s=Math.round((Date.now()-lastUpdate)/1000);

    hUp.textContent=s<60?`${s}s`:`${Math.floor(s/60)}m`;

    hUp.style.color=s>45?'#dc2626':'#e2e8f0';

  }

},1000);



// ── Ticker refresh (all assets every 12s) ────────────────────

setInterval(()=>{

  Object.keys(ASSETS_CFG).forEach(k=>loadTicker(k));

},12000);



// ── INIT ─────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════
// MEJORAS MACRO (Mifuturapp-style)
// ═══════════════════════════════════════════════════════════════

// 1. RSI Macro 3D desde Binance
let macroRSI = null;
async function computeMacroRSI() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30');
    const raw = await res.json();
    const closes = raw.map(k => +k[4]);
    if (closes.length < 15) return;
    const gains = [], losses = [];
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i-1];
      gains.push(Math.max(0, diff));
      losses.push(Math.max(0, -diff));
    }
    const avgGain = gains.slice(-14).reduce((a,b) => a+b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a,b) => a+b, 0) / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    macroRSI = { value: rsi, close: closes.at(-1), time: raw.at(-1)[0] };
    renderMacroRSI();
  } catch(e) { console.warn('Macro RSI fail', e); }
}

function renderMacroRSI() {
  const el = document.getElementById('macroRsiVal');
  if (!el || !macroRSI) return;
  const v = macroRSI.value;
  const label = v > 70 ? 'SOBRECOMPRA' : v < 30 ? 'SOBREVENTA' : 'NEUTRAL';
  const col = v > 70 ? 'var(--red)' : v < 30 ? 'var(--teal)' : 'var(--txt)';
  el.textContent = v.toFixed(1);
  el.style.color = col;
  document.getElementById('macroRsiLabel').textContent = label;
  // Histórico
  saveMacroHistory('rsi3d', v);
  const h = getMacroHistory('rsi3d');
  if (h && h.length > 1) {
    const vals = h.map(x => x.v);
    document.getElementById('macroRsiMin').textContent = Math.min(...vals).toFixed(1);
    document.getElementById('macroRsiMax').textContent = Math.max(...vals).toFixed(1);
    document.getElementById('macroRsiDelta').textContent = (vals.at(-1) - vals[0]).toFixed(1);
  }
}

// 2. Volumen 24h global
let globalVolume = null;
async function loadGlobalVolume() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global');
    const data = await res.json();
    globalVolume = data.data.total_volume?.usd || 0;
    const el = document.getElementById('globalVolume');
    if (el) {
      const v = globalVolume;
      if (v >= 1e12) el.textContent = '$' + (v / 1e12).toFixed(2) + 'T';
      else el.textContent = '$' + (v / 1e9).toFixed(2) + 'B';
    }
  } catch(e) {}
}

// 3. Texto interpretativo por fase
function getPhaseDescription(score) {
  if (score == null) return '';
  if (score >= 78) return 'Contexto de impulso alcista con confirmación de cruce. Sesgo: LONG. Riesgo: BAJO';
  if (score >= 62) return 'Contexto de acumulación con momentum positivo. Sesgo: LONG PRUDENTE. Riesgo: BAJO-MEDIO';
  if (score >= 52) return 'Contexto de transición con señales mixtas. Sesgo: NEUTRAL-ACUMULACIÓN. Riesgo: MEDIO';
  if (score >= 42) return 'Contexto neutral sin dirección clara. Sesgo: NEUTRAL. Riesgo: MEDIO';
  if (score >= 30) return 'Contexto de distribución con presión vendedora. Sesgo: SHORT PRUDENTE. Riesgo: MEDIO-ALTO';
  if (score >= 18) return 'Contexto de venta con momentum negativo. Sesgo: SHORT. Riesgo: ALTO';
  return 'Contexto de capitulación con riesgo extremo. Sesgo: SHORT FUERTE. Riesgo: MUY ALTO';
}

// 4. Histórico en localStorage
function saveMacroHistory(key, value) {
  try {
    let h = JSON.parse(localStorage.getItem('sono_macro_history') || '{}');
    if (!h[key]) h[key] = [];
    const today = new Date().toDateString();
    const last = h[key].at(-1);
    if (!last || last.d !== today) {
      h[key].push({ v: value, t: Date.now(), d: today });
      if (h[key].length > 100) h[key] = h[key].slice(-100);
      localStorage.setItem('sono_macro_history', JSON.stringify(h));
    }
  } catch(e){}
}

function getMacroHistory(key) {
  try {
    const h = JSON.parse(localStorage.getItem('sono_macro_history') || '{}');
    const today = new Date().toDateString();
    return (h[key] || []).filter(x => x.d === today);
  } catch(e){ return []; }
}

// Init macro features
setTimeout(() => { computeMacroRSI(); loadGlobalVolume(); }, 3000);
setInterval(computeMacroRSI, 60000);
setInterval(loadGlobalVolume, 60000);



// █▓▒░ ALERTAS SONORAS + NOTIFICACIONES (desde React Sono Pro v3) ░▒▓█
let signalAlertRef = '';

function playAlertSignal(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.06;
    if (type === 'buy_strong') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'sell_strong') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'buy') {
      osc.frequency.value = 600;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'sell') {
      osc.frequency.value = 400;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    }
  } catch(e) {}
}

function sendSignalNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(function(p) {
      if (p === 'granted') new Notification(title, { body });
    });
  }
}

// TELEGRAM BOT INTEGRATION
const TELEGRAM_BOT_TOKEN = '814011…TE7s';
const TELEGRAM_CHAT_ID = '352182197';
const TELEGRAM_ENABLED = true;

function sendTelegramAlert(msg) {
  if (!TELEGRAM_ENABLED) return;
  fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown'})
  }).catch(function(){});
}

// Hook into signal changes (check each 3s)
setInterval(function() {
  var el = document.getElementById('phaseLabel');
  if (!el) return;
  var curr = el.textContent.trim();
  if (curr && curr !== signalAlertRef && curr !== '---' && curr !== 'CARGANDO') {
    var prev = signalAlertRef;
    signalAlertRef = curr;
    if (prev) {
      var priceEl = document.getElementById('priceMain');
      var priceStr = priceEl ? priceEl.textContent : '';
      if (curr === 'COMPRA FUERTE') { playAlertSignal('buy_strong'); sendSignalNotification(activeAsset + ' COMPRA FUERTE', priceStr); sendTelegramAlert('🚀 *' + activeAsset + ' COMPRA FUERTE*\nPrecio: ' + priceStr + '\nScore Sono: ' + (document.getElementById('gaugeScore')?.textContent || '?')); }
      else if (curr === 'CAPITULACI' + 'ÓN' || curr === 'VENTA') { playAlertSignal('sell_strong'); sendSignalNotification(activeAsset + ' ' + curr, priceStr); sendTelegramAlert('🔻 *' + activeAsset + ' ' + curr + '*\nPrecio: ' + priceStr + '\nScore Sono: ' + (document.getElementById('gaugeScore')?.textContent || '?')); }
      else if (curr === 'COMPRA' || curr === 'ACUMULACI' + 'ÓN') { playAlertSignal('buy'); }
      else if (curr === 'DISTRIBUCI' + 'ÓN') { playAlertSignal('sell'); }
    }
  }
}, 3000);



// ── VIX desde Cloudflare Worker ──────────────────────────────
let vixData = null;
const VIX_WORKER_URL = 'https://vix-proxy.sono-pro.workers.dev'; // Reemplazar tras deploy

async function loadVIX() {
  try {
    const res = await fetch(VIX_WORKER_URL);
    const data = await res.json();
    if (data && data.vix != null) {
      vixData = data;
      renderVIX();
    }
  } catch(e) { console.warn('VIX load fail', e); }
}

function renderVIX() {
  const vixEl = document.getElementById('vixValue');
  const vixChg = document.getElementById('vixChange');
  const vixStatus = document.getElementById('vixStatus');
  if (!vixData) return;
  if (vixEl) {
    vixEl.textContent = vixData.vix.toFixed(2);
    vixEl.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--txt)';
  }
  if (vixChg && vixData.change != null) {
    const v = vixData.change;
    vixChg.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
    vixChg.style.color = v >= 0 ? '#dc2626' : '#16a34a';
  }
  if (vixStatus) {
    const lbl = vixData.vix > 30 ? 'MIEDO EXTREMO 🔴' : vixData.vix > 25 ? 'MIEDO 🔶' : vixData.vix > 20 ? 'NEUTRAL ⚪' : vixData.vix > 15 ? 'CALMA 🟢' : 'MUY CALMA 💚';
    vixStatus.textContent = lbl;
    vixStatus.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--dim)';
  }
}

// Init VIX loading
setTimeout(loadVIX, 5000);
setInterval(loadVIX, 120000);

async function init(){

  // Load all tickers in parallel

  await Promise.all(Object.keys(ASSETS_CFG).map(k=>loadTicker(k)));

  await loadCandles(activeAsset);

  await loadCandles1m(activeAsset);

  connectWS(activeAsset);

  connectWS1m(activeAsset);



  // Load other candles in background

  setTimeout(()=>{

    ['ETH','SOL','XRP'].forEach((k,i)=>setTimeout(()=>loadCandles(k),(i+1)*2000));

  },1000);

  setTimeout(()=>{

    ['ETH','SOL','XRP'].forEach((k,i)=>setTimeout(()=>loadCandles1m(k),(i+1)*3000));

  },2000);



  // Hide loader, show app

  setTimeout(()=>{

    const ov=document.getElementById('loadOverlay');

    if(ov)ov.classList.add('hidden');

    const app=document.getElementById('app');

    if(app)app.style.opacity='1';

  },2200);

}



// ═══════════════════════════════════════════════════════════════

// RANGE INTELLIGENCE — Análisis de Rango multi-TF (cliente-side)

// ═══════════════════════════════════════════════════════════════



const RANGE_TFS = ['1m','3m','5m','15m'];

const RANGE_DOMINANT = '15m';



function computeRangeAnalysis(candles1m, candles3m) {

  function analyzeTF(candles, tfLabel) {

    if (!candles || candles.length < 20) {

      return {

        tf: tfLabel, rango: null, posicion: 50, clusters: [],

        sweeps: [], presion: 0, bias: 'NEUTRAL', liquidez: 0,

        mensaje: 'Datos insuficientes', contexto: '?', dominio: false

      };

    }



    const closes = candles.map(c => c.close);

    const prices = candles.flatMap(c => [c.high, c.low]);

    const high = Math.max(...candles.map(c => c.high));

    const low = Math.min(...candles.map(c => c.low));

    const currentPrice = closes.at(-1);

    const range = high - low;

    const posicion = range > 0 ? ((currentPrice - low) / range) * 100 : 50;



    // N velas a considerar según TF

    const nCandles = tfLabel === '1m' ? 60 : tfLabel === '3m' ? 40 : tfLabel === '5m' ? 30 : 20;

    const recent = candles.slice(-nCandles);

    const recentHigh = Math.max(...recent.map(c => c.high));

    const recentLow = Math.min(...recent.map(c => c.low));

    const recentRange = recentHigh - recentLow;



    // Contexto: zona alta/media/baja

    let contexto;

    if (posicion >= 70) contexto = 'ALTA ↑';

    else if (posicion >= 30) contexto = 'MEDIA ↔';

    else contexto = 'BAJA ↓';



    // ── Clusters de soporte/resistencia (densidad de toques) ──

    // Usamos histograma de precios redondeados

    const binSize = recentRange / 20;

    const histogram = {};

    recent.forEach(c => {

      [c.high, c.low].forEach(p => {

        const bin = Math.round(p / binSize) * binSize;

        histogram[bin] = (histogram[bin] || 0) + 1;

      });

    });



    // Ordenar bins por frecuencia

    const sortedBins = Object.entries(histogram)

      .map(([price, count]) => ({ price: +price, count }))

      .sort((a, b) => b.count - a.count);



    // Top clusters: agrupar bins cercanos

    const clusters = [];

    const visited = new Set();

    sortedBins.forEach(bin => {

      if (visited.has(bin.price)) return;

      const neighbors = sortedBins.filter(b =>

        !visited.has(b.price) && Math.abs(b.price - bin.price) < binSize * 1.5

      );

      neighbors.forEach(n => visited.add(n.price));

      const avgPrice = neighbors.reduce((s, n) => s + n.price, 0) / neighbors.length;

      const totalCount = neighbors.reduce((s, n) => s + n.count, 0);

      const isSupport = avgPrice < currentPrice;

      const isResistance = avgPrice > currentPrice;

      if (totalCount >= 3) {

        clusters.push({

          price: avgPrice,

          strength: Math.min(10, totalCount),

          type: isSupport ? 'support' : isResistance ? 'resistance' : 'neutral',

          distance: Math.abs(avgPrice - currentPrice)

        });

      }

    });



    // Ordenar clusters por distancia al precio

    clusters.sort((a, b) => a.distance - b.distance);

    const topClusters = clusters.slice(0, 6);



    // ── Sweeps (stop hunts) ──

    // Detectamos si el precio barrió máximos/mínimos recientes

    let sweeps = [];

    const lookbackHigh = Math.max(...recent.slice(0, -3).map(c => c.high));

    const lookbackLow = Math.min(...recent.slice(0, -3).map(c => c.low));

    const last3 = recent.slice(-3);



    last3.forEach(c => {

      // Sweep de máximos

      if (c.high > lookbackHigh && c.high > recentHigh * 0.98) {

        sweeps.push({

          tipo: 'ALTA',

          price: c.high,

          level: lookbackHigh,

          time: c.time

        });

      }

      // Sweep de mínimos

      if (c.low < lookbackLow && c.low < recentLow * 1.02) {

        sweeps.push({

          tipo: 'BAJA',

          price: c.low,

          level: lookbackLow,

          time: c.time

        });

      }

    });



    // ── Presión compra/venta ──

    const greenCandles = recent.filter(c => c.close > c.open).length;

    const redCandles = recent.length - greenCandles;

    const greenVolume = recent.filter(c => c.close > c.open).reduce((s, c) => s + c.volume, 0);

    const redVolume = recent.filter(c => c.close <= c.open).reduce((s, c) => s + c.volume, 0);

    const totalVolume = greenVolume + redVolume;

    let presion = 0;

    if (totalVolume > 0) {

      // -100 (venta total) a +100 (compra total)

      const buyRatio = greenVolume / totalVolume;

      presion = (buyRatio - 0.5) * 200;

    }

    presion = Math.max(-100, Math.min(100, presion));



    // ── Liquidez ──

    // Basado en clusters cercanos y volumen relativo

    const nearClusters = topClusters.filter(c => c.distance < range * 0.15).length;

    const avgVolume = recent.reduce((s, c) => s + c.volume, 0) / recent.length;

    const lastVol = recent.at(-1).volume;

    const volRatio = avgVolume > 0 ? lastVol / avgVolume : 1;

    const liquidez = Math.min(100, Math.round(

      nearClusters * 12 + Math.min(40, volRatio * 20) + (presion > 0 ? Math.abs(presion) * 0.15 : 0)

    ));



    // ── Bias ──

    let bias, mensaje;

    const hasSweepHigh = sweeps.some(s => s.tipo === 'ALTA');

    const hasSweepLow = sweeps.some(s => s.tipo === 'BAJA');



    if (presion > 30 && posicion < 70 && !hasSweepHigh) {

      bias = 'LONG';

      mensaje = 'Presión compradora dominante. Buscar reacción en soportes.';

    } else if (presion < -30 && posicion > 30 && !hasSweepLow) {

      bias = 'SHORT';

      mensaje = 'Presión vendedora dominante. Buscar rechazo en resistencias.';

    } else if (hasSweepLow && presion > -20) {

      bias = 'LONG CAUTELOSO';

      mensaje = 'Sweep de mínimos detectado. Posible absorción y giro alcista.';

    } else if (hasSweepHigh && presion < 20) {

      bias = 'SHORT CAUTELOSO';

      mensaje = 'Sweep de máximos detectado. Posible distribución y giro bajista.';

    } else if (posicion > 80 && presion < -10) {

      bias = 'SHORT';

      mensaje = 'Precio en zona de resistencia con presión bajista. Rechazo esperado.';

    } else if (posicion < 20 && presion > 10) {

      bias = 'LONG';

      mensaje = 'Precio en zona de soporte con presión compradora. Rebote esperado.';

    } else {

      bias = 'NEUTRAL';

      mensaje = 'Sin sesgo claro. Esperar confirmación direccional.';

    }



    return {

      tf: tfLabel, rango: range, posicion,

      high: recentHigh, low: recentLow, currentPrice,

      clusters: topClusters, sweeps, presion: Math.round(presion),

      bias, liquidez,

      greenRatio: greenCandles / recent.length,

      contexto, dominio: tfLabel === RANGE_DOMINANT,

      mensaje, highRaw: high, lowRaw: low,

      zScores: clusters.map(c => (c.price - currentPrice) / (range || 1))

    };

  }



  // Análisis para 1m desde velas 1m

  const tf1m = analyzeTF(candles1m, '1m');



  // 3m desde velas 3m (disponibles como candelas 3m, o agregadas)

  const tf3m = candles3m && candles3m.length >= 20

    ? analyzeTF(candles3m, '3m')

    : analyzeTF(candles1m, '3m');



  // 5m agregado desde 1m

  const candles5m = candles1m && candles1m.length >= 5

    ? aggregateCandles(candles1m, 5)

    : null;

  const tf5m = candles5m && candles5m.length >= 10

    ? analyzeTF(candles5m, '5m')

    : { ...tf1m, tf: '5m', mensaje: 'Datos insuficientes para 5m' };



  // 15m agregado desde 1m

  const candles15m = candles1m && candles1m.length >= 15

    ? aggregateCandles(candles1m, 15)

    : null;

  const tf15m = candles15m && candles15m.length >= 5

    ? analyzeTF(candles15m, '15m')

    : { ...tf1m, tf: '15m', dominio: true, mensaje: 'Datos insuficientes para 15m' };



  // Asignar dominio

  const allTFs = [tf1m, tf3m, tf5m, tf15m];

  allTFs.forEach(tf => {

    tf.dominio = tf.tf === RANGE_DOMINANT;

  });



  // Calcular confianza global

  const biases = allTFs.map(t => t.bias);

  const longs = biases.filter(b => b.includes('LONG')).length;

  const shorts = biases.filter(b => b.includes('SHORT')).length;



  let globalConf, globalBias;

  if (longs > shorts && longs >= 3) {

    globalConf = Math.min(100, 55 + (longs - shorts) * 12 + allTFs.reduce((s, t) => s + Math.abs(t.presion) * 0.08, 0));

    globalBias = 'LONG';

  } else if (shorts > longs && shorts >= 3) {

    globalConf = Math.min(100, 55 + (shorts - longs) * 12 + allTFs.reduce((s, t) => s + Math.abs(t.presion) * 0.08, 0));

    globalBias = 'SHORT';

  } else if (longs > shorts) {

    globalConf = Math.min(80, 40 + (longs - shorts) * 10 + allTFs.reduce((s, t) => s + Math.abs(t.presion) * 0.05, 0));

    globalBias = 'LONG DÉBIL';

  } else if (shorts > longs) {

    globalConf = Math.min(80, 40 + (shorts - longs) * 10 + allTFs.reduce((s, t) => s + Math.abs(t.presion) * 0.05, 0));

    globalBias = 'SHORT DÉBIL';

  } else {

    globalConf = Math.min(60, 20 + allTFs.reduce((s, t) => s + Math.abs(t.presion) * 0.05, 0));

    globalBias = 'NEUTRAL';

  }



  globalConf = Math.round(globalConf);



  return {

    tfs: { tf1m, tf3m, tf5m, tf15m },

    globalConfianza: globalConf,

    globalBias

  };

}



// ── Scatter chart con canvas nativo ─────────────────────────

function drawRangeChart(canvasId, rangeData, currentPrice) {

  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  const rect = canvas.parentNode.getBoundingClientRect();

  canvas.width = (rect.width || 300) * 2;

  canvas.height = 120 * 2;

  const ctx = canvas.getContext('2d');

  const W = canvas.width, H = canvas.height;

  const pad = { t: 14, b: 14, l: 20, r: 14 };

  const cw = W - pad.l - pad.r;

  const ch = H - pad.t - pad.b;



  ctx.clearRect(0, 0, W, H);



  if (!rangeData || !rangeData.clusters || !currentPrice) {

    ctx.fillStyle = '#3d5570';

    ctx.font = '9px "JetBrains Mono",monospace';

    ctx.textAlign = 'center';

    ctx.fillText('Esperando datos…', W / 2, H / 2);

    return;

  }



  const { clusters, high, low } = rangeData;

  if (!high || !low || high === low) {

    ctx.fillStyle = '#3d5570';

    ctx.font = '9px "JetBrains Mono",monospace';

    ctx.textAlign = 'center';

    ctx.fillText('Rango insuficiente', W / 2, H / 2);

    return;

  }



  const range = high - low || 1;

  const padAmt = range * 0.08;

  const minP = low - padAmt;

  const maxP = high + padAmt;



  const xPos = i => pad.l + (i / (clusters.length || 1)) * cw;

  const yPos = p => pad.t + ch - ((p - minP) / (maxP - minP)) * ch;

  const midY = yPos(currentPrice);



  // Fondo

  ctx.fillStyle = 'rgba(6,10,18,0.3)';

  ctx.roundRect(pad.l, pad.t, cw, ch, 6);

  ctx.fill();



  // Grid horizontal

  ctx.strokeStyle = '#1a2a40';

  ctx.lineWidth = 0.3;

  for (let i = 0; i <= 4; i++) {

    const y = pad.t + (i / 4) * ch;

    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();

  }



  // Price line central (azul)

  ctx.strokeStyle = '#3b82f6';

  ctx.lineWidth = 0.8;

  ctx.setLineDash([3, 3]);

  ctx.beginPath();

  ctx.moveTo(pad.l, midY);

  ctx.lineTo(W - pad.r, midY);

  ctx.stroke();

  ctx.setLineDash([]);



  // Price dot (azul, centro)

  ctx.beginPath();

  ctx.arc(pad.l + 8, midY, 3, 0, 2 * Math.PI);

  ctx.fillStyle = '#3b82f6';

  ctx.shadowColor = '#3b82f680';

  ctx.shadowBlur = 8;

  ctx.fill();

  ctx.shadowBlur = 0;



  // Halos de liquidez (círculos suaves en zonas de cluster)

  clusters.forEach(c => {

    const cy = yPos(c.price);

    const radius = Math.max(4, c.strength * 3);

    const grad = ctx.createRadialGradient(W - pad.r - 10, cy, 0, W - pad.r - 10, cy, radius);

    const isResistance = c.type === 'resistance';

    const col = isResistance ? '220,38,38' : '22,163,74';

    grad.addColorStop(0, `rgba(${col},0.12)`);

    grad.addColorStop(1, `rgba(${col},0)`);

    ctx.fillStyle = grad;

    ctx.beginPath();

    ctx.arc(W - pad.r - 10, cy, radius, 0, 2 * Math.PI);

    ctx.fill();

  });



  // Líneas de soporte (verde) / resistencia (rojo) con etiquetas

  const supportClusters = clusters.filter(c => c.type === 'support').slice(0, 3);

  const resistanceClusters = clusters.filter(c => c.type === 'resistance').slice(0, 3);



  // Soporte

  supportClusters.forEach((c, i) => {

    const cy = yPos(c.price);

    const x = pad.l + (i + 1) * (cw / (supportClusters.length + resistanceClusters.length + 2));

    ctx.strokeStyle = 'rgba(22,163,74,0.5)';

    ctx.lineWidth = 1.2;

    ctx.beginPath();

    ctx.moveTo(pad.l, cy);

    ctx.lineTo(W - pad.r, cy);

    ctx.stroke();



    // Label

    const label = '$' + (c.price > 1000 ? (c.price / 1000).toFixed(1) + 'k' : c.price.toFixed(1));

    ctx.fillStyle = '#16a34a';

    ctx.font = '6px "JetBrains Mono",monospace';

    ctx.textAlign = 'right';

    ctx.fillText(label + ' S' + (i + 1), W - pad.r - 2, cy - 2);

  });



  // Resistencia

  resistanceClusters.forEach((c, i) => {

    const cy = yPos(c.price);

    ctx.strokeStyle = 'rgba(220,38,38,0.5)';

    ctx.lineWidth = 1.2;

    ctx.beginPath();

    ctx.moveTo(pad.l, cy);

    ctx.lineTo(W - pad.r, cy);

    ctx.stroke();



    const label = '$' + (c.price > 1000 ? (c.price / 1000).toFixed(1) + 'k' : c.price.toFixed(1));

    ctx.fillStyle = '#dc2626';

    ctx.font = '6px "JetBrains Mono",monospace';

    ctx.textAlign = 'right';

    ctx.fillText(label + ' R' + (i + 1), W - pad.r - 2, cy - 2);

  });



  // Traza de precio relativo (scatter de clústers como puntos)

  clusters.forEach((c, i) => {

    const cx = pad.l + (i / Math.max(1, clusters.length - 1)) * cw;

    const cy = yPos(c.price);

    const radius = Math.max(1.5, c.strength * 1);



    ctx.beginPath();

    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

    ctx.fillStyle = c.type === 'support' ? 'rgba(22,163,74,0.6)' :

      c.type === 'resistance' ? 'rgba(220,38,38,0.6)' : 'rgba(100,116,139,0.4)';

    ctx.fill();

  });



  // Label de precio actual

  ctx.fillStyle = '#3b82f6';

  ctx.font = '7px "JetBrains Mono",monospace';

  ctx.textAlign = 'left';

  ctx.fillText('$' + (currentPrice > 1000 ? (currentPrice / 1000).toFixed(1) + 'k' : currentPrice.toFixed(1)), pad.l + 4, midY - 4);

}



// ── Render Range Intelligence ───────────────────────────────

function renderRangeIntelligence() {

  const candles1m = allCandles1m[activeAsset];

  const candles3m = allCandles[activeAsset];



  if (!candles1m || !candles3m || candles1m.length < 20) {

    const grid = document.getElementById('rangeGrid');

    if (grid) grid.innerHTML = '<div style="color:var(--dim);grid-column:1/-1;text-align:center;padding:30px 0;">Acumulando datos para Range Intelligence…</div>';

    return;

  }



  const rangeData = computeRangeAnalysis(candles1m, candles3m);

  if (!rangeData) return;



  const { tfs, globalConfianza, globalBias } = rangeData;

  const currentPrice = allTicker[activeAsset]?.close || candles3m.at(-1)?.close;

  const now = new Date();

  const ts = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });



  // Header price

  const riPrice = document.getElementById('riPrice');

  if (riPrice && currentPrice) {

    riPrice.textContent = '$' + fmtN(currentPrice, ASSETS_CFG[activeAsset].dec);

  }



  // Global confidence

  const confEl = document.getElementById('riGlobalConf');

  if (confEl) {

    confEl.textContent = globalConfianza + '%';

    const confColor = globalBias.includes('LONG') ? '#16a34a' : globalBias.includes('SHORT') ? '#dc2626' : '#c9a84c';

    confEl.style.color = confColor;

  }



  // Update timestamp

  const riUpdate = document.getElementById('riUpdate');

  if (riUpdate) riUpdate.textContent = ts;



  // Render TF grid

  const grid = document.getElementById('rangeGrid');

  if (!grid) return;



  const tfKeys = ['tf1m', 'tf3m', 'tf5m', 'tf15m'];

  const tfLabels = { 'tf1m': '1 MINUTO', 'tf3m': '3 MINUTOS', 'tf5m': '5 MINUTOS', 'tf15m': '15 MINUTOS' };

  const tfSymbols = { 'tf1m': '1m', 'tf3m': '3m', 'tf5m': '5m', 'tf15m': '15m' };



  let html = '';

  tfKeys.forEach(k => {

    const tfData = tfs[k];

    const tfLabel = tfLabels[k];

    const tfSym = tfSymbols[k];

    if (!tfData) return;



    const isDominant = tfData.dominio;

    const biasColor = tfData.bias.includes('LONG') ? '#16a34a' : tfData.bias.includes('SHORT') ? '#dc2626' : '#c9a84c';

    const contextoColor = tfData.contexto === 'ALTA ↑' ? '#dc2626' : tfData.contexto === 'BAJA ↓' ? '#16a34a' : '#c9a84c';



    // Mensaje direccional

    let mensaje = tfData.mensaje;

    if (tfData.bias.includes('LONG')) mensaje = '🟢 ' + mensaje;

    else if (tfData.bias.includes('SHORT')) mensaje = '🔴 ' + mensaje;

    else mensaje = '⚪ ' + mensaje;



    // Sweep info

    const hasSweepHigh = tfData.sweeps && tfData.sweeps.some(s => s.tipo === 'ALTA');

    const hasSweepLow = tfData.sweeps && tfData.sweeps.some(s => s.tipo === 'BAJA');

    const sweepStr = hasSweepHigh ? '⚠️ Sweep Alta' : hasSweepLow ? '⚠️ Sweep Baja' : '—';



    // Liquidez

    const liqStr = tfData.liquidez >= 60 ? 'Alta' : tfData.liquidez >= 30 ? 'Media' : 'Baja';

    const liqColor = tfData.liquidez >= 60 ? '#16a34a' : tfData.liquidez >= 30 ? '#c9a84c' : '#64748b';



    // Presión - posición del dot

    const presionPos = ((tfData.presion + 100) / 200) * 100;



    // Canvas ID

    const canvasId = 'rangeScatter_' + k;



    html += `

      <div class="range-card">

        <div class="range-card-header">

          <span class="range-card-title" style="color:${biasColor}">${tfLabel}</span>

          ${isDominant ? '<span class="range-dominant">DOMINANTE</span>' : ''}

        </div>

        <div style="display:flex;justify-content:space-between;font-size:clamp(8px,0.8vw,10px);margin-bottom:4px;">

          <span style="color:var(--dim);">Rango</span>

          <span style="font-family:'JetBrains Mono',monospace;color:var(--txt);">$${fmtN(tfData.rango||0, ASSETS_CFG[activeAsset].dec)}</span>

        </div>

        <div style="display:flex;justify-content:space-between;font-size:clamp(8px,0.8vw,10px);margin-bottom:4px;">

          <span style="color:var(--dim);">Contexto</span>

          <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${contextoColor};">${tfData.contexto} (${tfData.posicion.toFixed(0)}%)</span>

        </div>

        <div style="display:flex;justify-content:space-between;font-size:clamp(8px,0.8vw,10px);margin-bottom:4px;">

          <span style="color:var(--dim);">H</span>

          <span style="font-family:'JetBrains Mono',monospace;color:var(--red);">$${fmtN(tfData.highRaw||tfData.high, ASSETS_CFG[activeAsset].dec)}</span>

          <span style="color:var(--dim);">L</span>

          <span style="font-family:'JetBrains Mono',monospace;color:var(--teal);">$${fmtN(tfData.lowRaw||tfData.low, ASSETS_CFG[activeAsset].dec)}</span>

        </div>

        <!-- Barra presion 3 segmentos (VENDEDORA | NEUTRA | COMPRADORA) -->
        <div style="position:relative;height:6px;border-radius:3px;margin:8px 0 2px;display:flex;overflow:hidden;">
          <div style="flex:1;background:#FF4444;border-radius:3px 0 0 3px;margin-right:1px;"></div>
          <div style="flex:1;background:#666;margin:0 1px;"></div>
          <div style="flex:1;background:#44FF44;border-radius:0 3px 3px 0;margin-left:1px;"></div>
          <div style="position:absolute;top:-3px;left:${presionPos}%;transform:translateX(-50%);color:${tfData.presion > 10 ? '#44FF44' : tfData.presion < -10 ? '#FF4444' : '#666'};font-size:9px;line-height:1;text-shadow:0 0 4px rgba(0,0,0,0.8);">&blacktriangle;</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:clamp(6px,0.65vw,8px);margin-top:1px;">
          <span style="color:#FF4444;font-weight:700;">VENDEDORA</span>
          <span style="color:#666;font-weight:700;">NEUTRA</span>
          <span style="color:#44FF44;font-weight:700;">COMPRADORA</span>
        </div>

        <div class="range-scatter">

          <canvas id="${canvasId}" style="width:100%;height:100%;"></canvas>

        </div>

        <div class="range-bias-grid">

          <div class="range-bias-item">

            <label>Contexto</label>

            <strong style="color:${contextoColor}">${tfData.contexto}</strong>

          </div>

          <div class="range-bias-item">

            <label>Liquidez</label>

            <strong style="color:${liqColor}">${liqStr} (${tfData.liquidez}%)</strong>

          </div>

          <div class="range-bias-item">

            <label>Sweep</label>

            <strong>${sweepStr}</strong>

          </div>

          <div class="range-bias-item">

            <label>Reacción esperada</label>

            <strong style="color:${biasColor}">${tfData.bias}</strong>

          </div>

        </div>

        <div class="range-message">${mensaje}</div>

      </div>

    `;

  });



  grid.innerHTML = html;



  // Dibujar los scatter canvases

  requestAnimationFrame(() => {

    tfKeys.forEach(k => {

      const tfData = tfs[k];

      if (!tfData) return;

      drawRangeChart('rangeScatter_' + k, tfData, currentPrice);

    });

  });

}



// ── Inicializar actualización periódica de Range Intelligence ──




// - VIX desde Cloudflare Worker -
let vixData = null;
const VIX_WORKER_URL = 'https://vix-proxy.sono-pro.workers.dev';

async function loadVIX() {
  try {
    const res = await fetch(VIX_WORKER_URL);
    const data = await res.json();
    if (data && data.vix != null) {
      vixData = data;
      renderVIX();
    }
  } catch(e) { console.warn('VIX load fail', e); }
}

function renderVIX() {
  const vixEl = document.getElementById('vixValue');
  const vixChg = document.getElementById('vixChange');
  const vixStatus = document.getElementById('vixStatus');
  if (!vixData) return;
  if (vixEl) {
    vixEl.textContent = vixData.vix.toFixed(2);
    vixEl.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--txt)';
  }
  if (vixChg && vixData.change != null) {
    const v = vixData.change;
    vixChg.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
    vixChg.style.color = v >= 0 ? '#dc2626' : '#16a34a';
  }
  if (vixStatus) {
    const lbl = vixData.vix > 30 ? 'MIEDO EXTREMO' : vixData.vix > 25 ? 'MIEDO' : vixData.vix > 20 ? 'NEUTRAL' : vixData.vix > 15 ? 'CALMA' : 'MUY CALMA';
    vixStatus.textContent = lbl;
    vixStatus.style.color = vixData.vix > 25 ? '#dc2626' : vixData.vix < 15 ? '#16a34a' : 'var(--dim)';
  }
}

// Init VIX loading
setTimeout(loadVIX, 5000);
setInterval(loadVIX, 120000);


setTimeout(() => {

  setInterval(() => {

    renderRangeIntelligence();

  }, 3000);

}, 5000);



// ── Exponer función para llamada desde renderAll ──

window.renderRangeIntelligence = renderRangeIntelligence;



init();

