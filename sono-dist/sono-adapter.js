// Sono Terminal adapter
(function(){
var $ = function(id){return document.getElementById(id);};

function updateTerminalPrice(price, change, high, low, volume) {
  var p = $('#current-price'); if(p) p.textContent = '$' + formatNum(price);
  var c = $('#price-change'); if(c) { var isPos = change >= 0; c.className = 'price-change ' + (isPos?'positive':'negative'); c.innerHTML = '<span>' + (isPos?'▲':'▼') + '</span> ' + Math.abs(change).toFixed(2) + '%'; }
  if($('#high-24h')) $('#high-24h').textContent = '$' + formatNum(high);
  if($('#low-24h')) $('#low-24h').textContent = '$' + formatNum(low);
  if($('#volume-24h')) $('#volume-24h').textContent = formatVol(volume);
}

function updateTerminalScore(sc) {
  if($('#score-number')) $('#score-number').textContent = sc.total;
  if($('#score-fill')) $('#score-fill').style.width = sc.total + '%';
  var s = 'NEUTRAL', d = 'Equilibrio';
  if(sc.total<20){s='PANICO EXTREMO';d='Oportunidad historica';}else if(sc.total<35){s='ACUMULACION';d='Zona de acumulacion';}else if(sc.total<45){s='ACUMULACION MODERADA';d='Todavia zona de compra';}else if(sc.total<55){s='NEUTRAL';d='Mercado en equilibrio';}else if(sc.total<65){s='OPTIMISMO';d='Mercado optimista';}else if(sc.total<80){s='EUFORIA';d='Cuidado sobrecompras';}else{s='BURBUJA';d='Riesgo extremo';}
  if($('#score-status')) $('#score-status').textContent = s;
  if($('#score-description')) $('#score-description').textContent = d;
}

function formatNum(n){if(!n)return'0';return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function formatVol(v){if(v>1e6)return(v/1e6).toFixed(2)+'M';if(v>1e3)return(v/1e3).toFixed(2)+'K';return v.toFixed(0);}

window.TerminalAdapter = {
  updatePrice: updateTerminalPrice,
  updateScore: updateTerminalScore,
  formatNum: formatNum,
  formatVol: formatVol
};

})();
