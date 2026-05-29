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


function test(){}
