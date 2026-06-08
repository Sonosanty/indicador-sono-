const fs = require('fs');
const h = fs.readFileSync('C:/Users/sparreno/AppData/Local/Temp/html_with_ajram.html', 'utf8');

const mStart = h.indexOf('id="page-metodo"');
const mEnd = h.indexOf('PÁGINA: TRADES');
const metodoSection = h.substring(mStart, mEnd);

const hasAjram = metodoSection.includes('ajram-card');
const hasEstrategias = metodoSection.includes('est-card');
const hasCalc = metodoSection.includes('ajram-calc-btn');
const hasAjramComment = metodoSection.includes('AJRAM');

console.log('AJRAM dentro de page-metodo:', hasAjram);
console.log('Estrategias:', hasEstrategias);
console.log('Calculadora:', hasCalc);
console.log('Contiene MÓDULO AJRAM:', hasAjramComment);
console.log('Longitud metodo section:', metodoSection.length);
console.log('\nÚltimos 100 chars:');
console.log(metodoSection.substring(metodoSection.length - 100));
