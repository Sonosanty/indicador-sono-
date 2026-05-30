// ── BOOT: Iniciar Score Maestro + Live Status ──
setTimeout(function(){
  window._prevSignal = null;
  var sym = 'BTCUSDT';
  fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=210',{cache:'no-store'})
    .then(function(r){return r.json()})
    .then(function(raw){
      var closes = raw.map(function(k){return parseFloat(k[4])});
      var rsiArr = calcRSI(closes, 14);
      var rsi = rsiArr[rsiArr.length-1] || 50;
      var adx = calcADX(closes, 14);
      var p1=0,p2=0,p3=0;
      if(closes.length>=200){
        var m6=closes.slice(-6).reduce(function(a,b){return a+b},0)/6;
        var m40=closes.slice(-40).reduce(function(a,b){return a+b},0)/40;
        var m70=closes.slice(-70).reduce(function(a,b){return a+b},0)/70;
        var m200=closes.slice(-200).reduce(function(a,b){return a+b},0)/200;
        if(m6>m40)p1+=12; if(m6>m70)p1+=10; if(m40>m200)p1+=13;
      }
      if(rsi>50&&rsi<70)p2+=12; else if(rsi>=35)p2+=7; else p2+=2;
      if(adx>35)p2+=15; else if(adx>25)p2+=10; else p2+=3;
      var pr=closes[closes.length-1];
      var bb20=closes.slice(-20).reduce(function(a,b){return a+b},0)/20;
      var bbs=Math.sqrt(closes.slice(-20).map(function(c){return(c-bb20)*(c-bb20)}).reduce(function(a,b){return a+b},0)/20);
      var bbp=bbs>0?(pr-(bb20-2*bbs))/((bb20+2*bbs)-(bb20-2*bbs)):0.5;
      if(bbp<0.15)p3=28;else if(bbp<0.35)p3=20;else if(bbp<0.65)p3=14;else if(bbp<0.85)p3=7;else p3=2;
      var total=Math.min(100,Math.max(0,p1+p2+p3));
      var signal,sigClass;
      if(total>=78){signal='COMPRA FUERTE';sigClass='score-buy';}
      else if(total>=62){signal='COMPRA';sigClass='score-buy';}
      else if(total>=52){signal='ACUMULAR';sigClass='score-accum';}
      else if(total>=42){signal='NEUTRAL';sigClass='score-neutral';}
      else if(total>=30){signal='VENTA';sigClass='score-sell';}
      else if(total>=18){signal='VENTA FUERTE';sigClass='score-sell';}
      else{signal='CAPITULACION';sigClass='score-sell';}
      function s(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
      s('smScore',total);
      var se=document.getElementById('smSignal');if(se){se.textContent=signal;se.className='score-signal '+sigClass;}
      s('smP1','P1: '+p1+'/35');s('smP2','P2: '+p2+'/35');s('smP3','P3: '+p3+'/30');
      s('smRSI','RSI: '+rsi.toFixed(1));s('smADX','ADX: '+adx.toFixed(1));
      window._prevSignal=signal;
    });

  lastTick = Date.now();
  setInterval(function(){
    if(!lastTick) return;
    var secs = Math.floor((Date.now() - lastTick) / 1000);
    var el = document.getElementById('liveStale');
    if(el) el.textContent = secs < 60 ? secs+'s' : Math.floor(secs/60)+'m '+(secs%60)+'s';
  }, 2000);

  renderTimeline();
}, 1000);

document.querySelectorAll('.asset-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.asset-btn').forEach(function(b){b.classList.remove('active')});
    this.classList.add('active');
    var asset = this.dataset.asset;
    var symMap = {BTC:'BTCUSDT',ETH:'ETHUSDT',SOL:'SOLUSDT',XRP:'XRPUSDT'};
    var sym = symMap[asset] || 'BTCUSDT';
    document.getElementById('assetLabel').textContent = asset;

    fetch('https://api.binance.com/api/v3/ticker/24hr?symbol='+sym,{cache:'no-store'})
      .then(function(r){return r.json()})
      .then(function(d){
        var usd=parseFloat(d.lastPrice),chg=parseFloat(d.priceChangePercent);
        document.getElementById('btcUsdLive').textContent='$'+Number(usd).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
        var badge=document.getElementById('btcChange24hLive');
        if(badge){badge.textContent=(chg>=0?'+':'')+Number(chg).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'% 24h';
        badge.className='badge '+(chg>0.3?'positivo':chg<-0.3?'negativo':'neutro');}
        lastTick=Date.now();
      });

    fetch('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval=15m&limit=210',{cache:'no-store'})
      .then(function(r){return r.json()})
      .then(function(raw){
        var closes=raw.map(function(k){return parseFloat(k[4])});
        var rsiArr=calcRSI(closes,14); var rsi=rsiArr[rsiArr.length-1]||50;
        var adx=calcADX(closes,14); var p1=0,p2=0,p3=0;
        if(closes.length>=200){
          var m6=closes.slice(-6).reduce(function(a,b){return a+b},0)/6;
          var m40=closes.slice(-40).reduce(function(a,b){return a+b},0)/40;
          var m70=closes.slice(-70).reduce(function(a,b){return a+b},0)/70;
          var m200=closes.slice(-200).reduce(function(a,b){return a+b},0)/200;
          if(m6>m40)p1+=12;if(m6>m70)p1+=10;if(m40>m200)p1+=13;
        }
        if(rsi>50&&rsi<70)p2+=12;else if(rsi>=35)p2+=7;else p2+=2;
        if(adx>35)p2+=15;else if(adx>25)p2+=10;else p2+=3;
        var pr=closes[closes.length-1];
        var bb20=closes.slice(-20).reduce(function(a,b){return a+b},0)/20;
        var bbs=Math.sqrt(closes.slice(-20).map(function(c){return(c-bb20)*(c-bb20)}).reduce(function(a,b){return a+b},0)/20);
        var bbp=bbs>0?(pr-(bb20-2*bbs))/((bb20+2*bbs)-(bb20-2*bbs)):0.5;
        if(bbp<0.15)p3=28;else if(bbp<0.35)p3=20;else if(bbp<0.65)p3=14;else if(bbp<0.85)p3=7;else p3=2;
        var total=Math.min(100,Math.max(0,p1+p2+p3));
        var signal,sigClass;
        if(total>=78){signal='COMPRA FUERTE';sigClass='score-buy';}
        else if(total>=62){signal='COMPRA';sigClass='score-buy';}
        else if(total>=52){signal='ACUMULAR';sigClass='score-accum';}
        else if(total>=42){signal='NEUTRAL';sigClass='score-neutral';}
        else if(total>=30){signal='VENTA';sigClass='score-sell';}
        else if(total>=18){signal='VENTA FUERTE';sigClass='score-sell';}
        else{signal='CAPITULACION';sigClass='score-sell';}
        function s(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
        s('smScore',total);var se=document.getElementById('smSignal');
        if(se){se.textContent=signal;se.className='score-signal '+sigClass;}
        s('smP1','P1: '+p1+'/35');s('smP2','P2: '+p2+'/35');s('smP3','P3: '+p3+'/30');
        s('smRSI','RSI: '+rsi.toFixed(1));s('smADX','ADX: '+adx.toFixed(1));
        window._prevSignal=signal;
      });
  });
});
