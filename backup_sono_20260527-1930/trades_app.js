const ASSETS_CFG={BTC:{sym:'BTCUSDT',dec:2,col:'#F7931A'},ETH:{sym:'ETHUSDT',dec:2,col:'#627EEA'},SOL:{sym:'SOLUSDT',dec:3,col:'#9945FF'},XRP:{sym:'XRPUSDT',dec:4,col:'#00AAE4'}};
const BINANCE_REST='https://api.binance.com/api/v3',BINANCE_WS='wss://stream.binance.com:9443/ws',LIMIT=350,INTERVAL='3m';
let activeAsset='BTC',allCandles={},allTicker={},wsConn=null;
let signalLog=JSON.parse(localStorage.getItem('sono_signals_v3')||'[]').map(s=>({...s,time:new Date(s.time)}));
let realTrades=JSON.parse(localStorage.getItem('sono_real_trades')||'[]');
let tradeIdCounter=100;
setInterval(()=>{},1000);
const fmtN=(n,d)=>n==null?'---':n.toFixed(d);
function el(id,txt){const e=document.getElementById(id);if(e)e.textContent=txt;}
function renderTicker(){
  document.querySelectorAll('.asset-tab').forEach(b=>{const k=b.dataset.k;const t=allTicker[k];if(!t)return;b.querySelector('.tkr-price').textContent='$'+fmtN(t.close,ASSETS_CFG[k].dec);const c=document.getElementById('chg'+k);if(c)c.textContent=(t.change>=0?'+':'')+t.change.toFixed(2)+'%';});
}
async function init(){
  // Load candles
  const r=await fetch(BINANCE_REST+'/klines?symbol=BTCUSDT&interval=3m&limit=350');
  const raw=await r.json();
  allCandles.BTC=raw.map(k=>({time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}));
  // Load all tickers
  for(const k of Object.keys(ASSETS_CFG)){
    const t=await fetch(BINANCE_REST+'/ticker/24hr?symbol='+ASSETS_CFG[k].sym).then(r=>r.json());
    allTicker[k]={close:+t.lastPrice,high:+t.highPrice,low:+t.lowPrice,change:+t.priceChangePercent,volume:+t.quoteVolume};
  }
  renderTicker();
  el('sbSource','FUENTE: BINANCE');
  // Show real trades
  const openT=realTrades.filter(t=>t.estado==='OPEN');
  el('openCount',openT.length);
  el('closedCount',realTrades.filter(t=>t.estado==='CLOSED').length);
  if(openT.length){
    document.getElementById('openTradesBody').innerHTML=openT.map(t=>'<tr><td>'+t.id+'</td><td>OPEN</td><td>'+t.side+'</td><td>'+t.signal+'</td><td>$'+t.entry.toFixed(2)+'</td><td>$'+t.sl.toFixed(2)+'</td><td>$'+t.tp.toFixed(2)+'</td><td>0R</td><td>0R</td><td>'+t.duration+'</td><td>0R</td><td>$'+t.entry.toFixed(2)+'</td></tr>').join('');
  }
  el('totalSignalsFooter',signalLog.length);
  el('eqWin',signalLog.filter(s=>s.signal.includes('COMPRA')||s.signal.includes('ACUMULAR')).length);
  document.getElementById('loadOverlay').classList.add('hidden');
  document.getElementById('app').style.opacity='1';
}
init();
