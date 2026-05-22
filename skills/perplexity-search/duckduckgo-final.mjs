// C:\Users\sparreno\.openclaw\workspace\skills\perplexity-search\duckduckgo-final.mjs

import { chromium } from 'playwright';

const query = process.argv[2] || 'precio bitcoin hoy';

async function searchDuckDuckGo() {
 let browser;
 try {
 console.error(`[DEBUG] Buscando: ${query}`);

 // Lanzar navegador visible para debugging
 browser = await chromium.launch({
 headless: false, // Visible para ver qué pasa
 args: ['--no-sandbox']
 });

 const page = await browser.newPage();

 // Ir a DuckDuckGo HTML (versión ligera)
 const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
 console.error(`[DEBUG] Navegando a: ${url}`);

 await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

 // Esperar explícitamente a que aparezcan los resultados
 await page.waitForSelector('.result', { timeout: 10000 });

 // Extraer resultados
 const results = await page.evaluate(() => {
 const items = document.querySelectorAll('.result');
 return Array.from(items).slice(0, 5).map(result => ({
 title: result.querySelector('.result__a')?.innerText?.trim() || '',
 snippet: result.querySelector('.result__snippet')?.innerText?.trim() || '',
 url: result.querySelector('.result__a')?.getAttribute('href') || ''
 })).filter(r => r.title && r.snippet);
 });

 // Construir respuesta
 const answer = results.map(r => `${r.title}\n${r.snippet}\nFuente: ${r.url}`).join('\n\n');

 await browser.close();

 console.log(JSON.stringify({
 success: results.length > 0,
 answer: answer || 'No se encontraron resultados',
 sources: results.map(r => ({
 title: r.title,
 url: r.url
 })),
 query: query
 }));

 } catch (error) {
 if (browser) await browser.close();
 console.log(JSON.stringify({
 success: false,
 answer: `Error: ${error.message}`,
 sources: [],
 query: query
 }));
 }
}

searchDuckDuckGo();