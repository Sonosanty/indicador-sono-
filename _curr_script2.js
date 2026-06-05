window.setCoin = function(btn, coin) {
  // Update coin tabs on dashboard
  document.querySelectorAll('.atab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-metodo .tfp:not(.navbtn)').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-rangos .tfp').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const d = window.COIN_INIT[coin];
  window.currentCoin = coin;

  window.currentCoin = coin;

  window.currentCoin = coin;

  if (!d) return;

  const fmt = (n) => n < 10 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString();
  const usd = (n) => '$' + (n < 1 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString());
  const pct = (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%';

  // === DASHBOARD ===
  gId('coin-pair-main', d.pair.split('/')[0]);
  gId('coin-price-main', usd(d.p));
  gId('coin-price-eur', '\u2248 ' + Math.round(d.pe).toLocaleString() + ' EUR');
  gId('coin-price-chg', '\u25bc ' + pct(d.cp) + ' \u00b7 \u2212' + usd(Math.abs(d.ca)));
  gId('coin-high', usd(d.h24));
  gId('coin-low', usd(d.l24));
  gId('coin-vol', d.v);
  gId('coin-score-num', d.sc);
  gId('coin-score-label', d.sl);
  gId('coin-regime', d.rg);
  gId('coin-p1', d.p1); gId('coin-p2', d.p2); gId('coin-p3', d.p3);
  gId('coin-p1-bar').style.width = Math.round(d.p1 / 35 * 100) + '%';
  gId('coin-p2-bar').style.width = Math.round(d.p2 / 35 * 100) + '%';
  gId('coin-p3-bar').style.width = Math.round(d.p3 / 30 * 100) + '%';
  gId('coin-fg', d.fg); gId('coin-fg-label', d.fgl);
  gId('coin-vix', d.vx); gId('coin-vix-label', d.vxl);
  gId('coin-dom', d.dm); gId('coin-dom-label', d.dml);
  gId('coin-rsi3d', d.r3); gId('coin-rsi3d-label', d.r3l);
  gId('coin-rsi', d.rsi); gId('coin-adx', d.adx); gId('coin-bb', d.bb); gId('coin-ma40', d.ma40.toLocaleString());
  gId('coin-rsi-bar').style.width = Math.round(d.rsi) + '%';
  gId('coin-adx-bar').style.width = Math.round(d.adx / 60 * 100) + '%';
  gId('coin-bb-bar').style.width = Math.round(d.bb / 1 * 100) + '%';
  gId('coin-ma40-chg').textContent = 'precio ' + pct(d.ma40c) + ' bajo MA40';

  gId('coin-ma6', d.ma6.toLocaleString()); gId('coin-ma6-chg', pct(d.ma6c));
  gId('coin-ma40-v', d.ma40.toLocaleString()); gId('coin-ma40chg', pct(d.ma40c));
  gId('coin-ma70', d.ma70.toLocaleString()); gId('coin-ma70-chg', pct(d.ma70c));
  gId('coin-ma200', d.ma200.toLocaleString()); gId('coin-ma200-chg', pct(d.ma200c));

  gId('coin-mtf' + d.m1, d.m1); gId('coin-mtf' + d.m3, d.m3); gId('coin-mtf' + d.m5, d.m5); gId('coin-mtf' + d.m15, d.m15);
  gId('coin-mtf-total', d.mtft);

  gId('coin-sr-r2', usd(d.r2)); gId('coin-sr-r1', usd(d.r1));
  gId('coin-sr-s1', usd(d.s1)); gId('coin-sr-s2', usd(d.s2));
  gId('coin-sr-live', usd(d.p));

  const mcEl = gId('coin-macro');
  mcEl.innerHTML = d.mcl; mcEl.style.color = d.mc;
  gId('coin-macro-score', d.mcs.split('/')[0]);
  gId('coin-macro-regime', d.mcrg);
  gId('coin-macro-bias', d.mcbi);
  gId('coin-macro-risk', d.mcrk);

  // === METODO ===
  gId('coin-pair-metodo', coin);
  gId('coin-price-metodo', usd(d.p));
  gId('coin-sc-metodo', d.msc);
  gId('coin-sl-metodo', d.msl);
  gId('coin-rm-metodo', d.mrg);
  gId('coin-p1sc', d.p1s); gId('coin-p2sc', d.p2s); gId('coin-p3sc', d.p3s);
  gId('coin-fg-metodo', d.fg);
  gId('coin-dom-metodo', d.dm);
  gId('coin-rsi3d-metodo', d.r3);
  gId('coin-mcap-metodo', d.mcp);

  // Debug panel
  gId('coin-debug').innerHTML = d.dbg;

  // === RANGOS ===
  gId('coin-pair-rangos', coin);
  gId('coin-price-rangos', usd(d.p));
  gId('coin-rg-bias', d.rgb);
  gId('coin-rg-conf', d.rgc);
  gId('coin-rg-state', d.rgst || d.rgs || '');

  // Rangos cards
  const rangoCards = document.querySelectorAll('.rango-card');
  if (d.rgtf && d.rgtf.forEach) d.rgtf.forEach(function(tfStr, i) {
    const parts = tfStr.split('|');
    if (rangoCards[i]) {
      const card = rangoCards[i];
      // Update TF name
      card.querySelector('.rc-tf').textContent = parts[0];
      // Zone
      const zone = card.querySelector('.rc-zone');
      zone.textContent = parts[2];
      zone.style.color = parts[1];
      // Gauge
      const gaugeFill = card.querySelector('.gauge-fill');
      gaugeFill.style.width = parts[3] + '%';
      gaugeFill.style.background = parts[5];
      gId2(card.querySelector('.gauge-label'), parts[4]);
      // Context
      gId2(card.querySelector('.rc-ctx-text'), parts[6]);
      // Sparkline
      const poly = card.querySelector('.sparkline polyline');
      if (poly) {
        poly.setAttribute('points', parts[7]);
        poly.setAttribute('stroke', parts[8]);
      }
      // Gauge position dot
      const gpos = card.querySelector('.gauge-pos');
      if (gpos) gpos.style.left = parts[3] + '%';
    }
  });

  // === TRADES ===
  gId('coin-tr-price', usd(d.trp));
  gId('coin-tr-chg', '\u25bc ' + pct(d.trc));
}

window.gId = function(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.textContent = val;
  return el;
}
window.gId2 = function(el, val) {
  if (el) el.textContent = val;
}



window.COIN_INIT = {
    BTC:{
    pair:'BTC/USDT',p:63932,pe:58817,cp:-3.03,ca:-2010,h24:66820,l24:63980,v:'28.4B',
    sc:54,sl:'ACUMULAR',rg:'OSO',
    p1:12,p2:24,p3:18,
    fg:12,fgl:'Miedo Extremo',
    vx:16.06,vxl:'Bajo',dm:55.6,dml:'Baja',
    r3:27,r3l:'NEUTRAL',rsi:26.8,adx:36.1,bb:0.18,
    msc:54,msl:'ACUMULAR',mrg:'CONSOLIDACION',
    rgb:'NEUTRAL',rgc:'MEDIA',rgst:'Rango lateral',
    r2:69700,r1:68500,s1:60700,s2:59000,
    mcp:'1.28T',
    trp:64236,trc:-3.03,
    ma6:64100,ma40:64850,ma70:65220,ma200:67150,
    ma6c:-0.21,ma40c:-0.95,ma70c:-1.51,ma200c:-4.34,
    rx:4,rxl:'OK',
    m1:31,m3:42,m5:50,m15:54,mtft:48,
    mcl:'🟢 MACRO ALCISTA',mc:'#00c8f0',mcs:'4/6',mcrg:'CONSOLIDACIÓN',mcbi:'NEUTRAL',mcrk:'MEDIO',
    p1s:'12/35',p2s:'24/35',p3s:'18/30',
    dbg:'[BTC] RSI:26.8 | ADX:36.1 | BB:0.18 | Score:54 | Macro:4/6 | MTF:48/100',
    rgtf:['1min|#ef4444|ZONA ROJA|85|Agressive Sell|#ef4444|Alta presión bajista, sin soporte cercano|172,63 180,58 185,52 190,48 200,55|#ef4444','3min|#f59e0b|ZONA AMARILLA|55|Bearish|#f59e0b|Momentum bajista, posible rebote|80,45 95,50 110,55 125,48 140,52|#f59e0b','5min|#7aaad0|ZONA AZUL|40|Neutral-Bearish|#7aaad0|Rango sin dirección clara, volumen bajo|60,50 75,48 90,52 105,50 120,51|#7aaad0','15min|#00c8f0|ZONA VERDE|30|Neutral|#00c8f0|Micro tendencia lateral, esperar confirmación|40,55 55,52 70,54 85,51 100,53|#00c8f0']
  },
    ETH:{
    pair:'ETH/USDT',p:1777,pe:1635,cp:-4.12,ca:-76,h24:1850,l24:1755,v:'18.2B',
    sc:38,sl:'VENTA SHORT+',rg:'OSO',
    p1:28,p2:31,p3:29,
    fg:12,fgl:'Miedo Extremo',
    vx:14.2,vxl:'Bajo',dm:10.8,dml:'Baja',
    r3:48,r3l:'NEUTRAL',rsi:42,adx:32,bb:0.08,
    msc:40,msl:'NEUTRAL',mrg:'Consolidacion',
    rgb:'OSO',rgc:'ALTA',rgst:'Rango no direccional',
    r2:1950,r1:1865,s1:1700,s2:1620,
    mcp:'228.5B',
    trp:1777,trc:-4.12,
    ma6:1720,ma40:1690,ma70:1650,ma200:1580,
    ma6c:-2.1,ma40c:0.3,ma70c:1.8,ma200c:5.2,
    rx:4,rxl:'OK',
    m1:35,m3:40,m5:45,m15:48,mtft:42,
    mcl:'🟠 MACRO NEUTRAL',mc:'#f59e0b',mcs:'3/6',mcrg:'CONSOLIDACIÓN',mcbi:'NEUTRAL',mcrk:'MEDIO',
    p1s:'28/35',p2s:'31/35',p3s:'29/30',
    dbg:'[ETH] RSI:42 | ADX:32 | BB:0.08 | Score:38 | Macro:3/6 | MTF:42/100',
    rgtf:['1min|#ef4444|ZONA ROJA|75|Agressive Sell|#ef4444|Alta presión bajista, ETH débil|160,40 175,38 190,35 205,42 220,36|#ef4444','3min|#f59e0b|ZONA AMARILLA|60|Bearish|#f59e0b|Bajista suave, volumen descendiendo|90,42 105,45 120,40 135,48 150,44|#f59e0b','5min|#7aaad0|ZONA AZUL|45|Neutral|#7aaad0|Rango lateral, sin señal clara|65,48 80,50 95,47 110,52 125,49|#7aaad0','15min|#00c8f0|ZONA VERDE|35|Neutral-Bullish|#00c8f0|Micro recuperación, posible entrada|45,50 60,53 75,51 90,55 105,52|#00c8f0']
  },
    SOL:{
    pair:'SOL/USDT',p:69.76,pe:64.18,cp:-5.18,ca:-3.82,h24:73.5,l24:68.2,v:'4.8B',
    sc:35,sl:'VENTA SHORT+',rg:'OSO',
    p1:25,p2:28,p3:24,
    fg:12,fgl:'Miedo Extremo',
    vx:14.2,vxl:'Bajo',dm:2.3,dml:'Baja',
    r3:45,r3l:'NEUTRAL',rsi:38,adx:28,bb:0.12,
    msc:35,msl:'VENTA SHORT+',mrg:'Bajista',
    rgb:'OSO',rgc:'ALTA',rgst:'Rango bajista',
    r2:82,r1:76,s1:62,s2:56,
    mcp:'28.9B',
    trp:69.76,trc:-5.18,
    ma6:65,ma40:62,ma70:58,ma200:52,
    ma6c:-3.2,ma40c:-0.8,ma70c:2.5,ma200c:8.1,
    rx:4,rxl:'BAJO',
    m1:30,m3:35,m5:38,m15:42,mtft:36,
    mcl:'🔴 MACRO BAJISTA',mc:'#ef4444',mcs:'2/6',mcrg:'BAJISTA',mcbi:'OSO',mcrk:'ALTO',
    p1s:'25/35',p2s:'28/35',p3s:'24/30',
    dbg:'[SOL] RSI:38 | ADX:28 | BB:0.12 | Score:35 | Macro:2/6 | MTF:36/100',
    rgtf:['1min|#ef4444|ZONA ROJA|80|Agressive Sell|#ef4444|Venta agresiva, SOL bajista fuerte|150,30 165,28 180,25 195,35 210,30|#ef4444','3min|#f59e0b|ZONA AMARILLA|65|Bearish|#f59e0b|Tendencia bajista, volumen alto|85,32 100,35 115,30 130,38 145,34|#f59e0b','5min|#7aaad0|ZONA AZUL|50|Neutral|#7aaad0|Sin dirección, consolidación|60,40 75,42 90,38 105,44 120,41|#7aaad0','15min|#00c8f0|ZONA VERDE|40|Neutral|#00c8f0|Rebote leve, precaución|40,45 55,48 70,44 85,50 100,47|#00c8f0']
  },
    XRP:{
    pair:'XRP/USDT',p:1.17,pe:1.08,cp:-3.97,ca:-0.048,h24:1.22,l24:1.16,v:'3.5B',
    sc:40,sl:'NEUTRAL',rg:'OSO',
    p1:30,p2:32,p3:28,
    fg:12,fgl:'Miedo Extremo',
    vx:14.2,vxl:'Bajo',dm:3.8,dml:'Baja',
    r3:50,r3l:'NEUTRAL',rsi:44,adx:35,bb:0.1,
    msc:42,msl:'NEUTRAL',mrg:'Neutral',
    rgb:'NEUTRAL',rgc:'MEDIA',rgst:'Rango lateral',
    r2:1.28,r1:1.22,s1:1.1,s2:1.05,
    mcp:'68B',
    trp:1.17,trc:-3.97,
    ma6:1.12,ma40:1.15,ma70:1.08,ma200:1.02,
    ma6c:-1.8,ma40c:-0.5,ma70c:2,ma200c:6.5,
    rx:5,rxl:'OK',
    m1:38,m3:44,m5:48,m15:52,mtft:44,
    mcl:'🟠 MACRO NEUTRAL',mc:'#f59e0b',mcs:'3/6',mcrg:'NEUTRAL',mcbi:'NEUTRAL',mcrk:'MEDIO',
    p1s:'30/35',p2s:'32/35',p3s:'28/30',
    dbg:'[XRP] RSI:44 | ADX:35 | BB:0.10 | Score:40 | Macro:3/6 | MTF:44/100',
    rgtf:['1min|#ef4444|ZONA ROJA|70|Sell|#ef4444|Presión bajista moderada|170,35 185,32 200,30 215,38 230,34|#ef4444','3min|#f59e0b|ZONA AMARILLA|55|Bearish|#f59e0b|Tendencia bajista suave|90,40 105,42 120,38 135,45 150,41|#f59e0b','5min|#7aaad0|ZONA AZUL|45|Neutral|#7aaad0|Rango lateral, volumen normal|65,45 80,48 95,44 110,50 125,47|#7aaad0','15min|#00c8f0|ZONA VERDE|35|Neutral-Bullish|#00c8f0|Micro tendencia alcista, posible acumulación|45,48 60,52 75,49 90,55 105,51|#00c8f0']
  },
};
window.currentCoin = 'BTC';
window.currentCoin = 'BTC';
window.currentCoin = 'BTC';

window.showPage = function(id, btn) {
 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 document.querySelectorAll('.navbtn').forEach(b => b.classList.remove('active'));
 document.getElementById('page-' + id).classList.add('active');
 btn.classList.add('active');
 window.scrollTo(0, 0);
  // Persist currentCoin across pages
  const cc = window.currentCoin || 'BTC';
  document.querySelectorAll('.atab').forEach(t => {
    t.classList.toggle('active', t.textContent.trim() === cc);
  });
}