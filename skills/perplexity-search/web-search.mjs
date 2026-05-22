// C:\Users\sparreno\.openclaw\workspace\skills\perplexity-search\perplexity-search.mjs

import { chromium } from 'playwright';

const query = process.argv[2] || 'precio bitcoin hoy';
const HEADLESS = process.env.HEADLESS !== 'false';

async function searchDuckDuckGo() {
 let browser;
 try {
 console.error(`[DEBUG] Buscando: ${query}`);

 // Lanzar navegador visible para debugging
 browser = await chromium.launch({
 headless: HEADLESS, // Ahora configurable
 args: ['--no-sandbox']
 });

 const page = await browser.newPage();

 // Ir a DuckDuckGo HTML (versión ligera)
 const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
 console.error(`[DEBUG] Navegando a: ${url}`);

 await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

 // Esperar explícitamente a que aparezcan los resultados
 await page.waitForSelector('.result', { timeout: 15000 });
 await page.waitForTimeout(3000); // Fallback para asegurar carga

 // Extraer resultados
 const results = await page.evaluate(() => {
 const selectors = [
 '.result',
 '.results_links',
 '.web-result'
 ];
 let items = [];
 for (const selector of selectors) {
 items = Array.from(document.querySelectorAll(selector));
 if (items.length > 0) break;
 }

 return items.slice(0, 5).map(result => ({
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
 engine: "duckduckgo", // Nuevo campo
 query: query,
 results_count: results.length, // Nuevo campo
 answer: answer || 'No se encontraron resultados de búsqueda.',
 sources: results.map(r => ({
 title: r.title,
 url: r.url
 }));

 } catch (error) {
 if (browser) {
 await page.screenshot({
 path: 'debug-web-search-error.png',
 fullPage: true
 }).catch(() => {}); // Intentar screenshot, ignorar errores
 await browser.close();
 }
 console.log(JSON.stringify({
 success: false,
 engine: "duckduckgo",
 query: query,
 results_count: 0,
 answer: `Error al realizar la búsqueda: ${error.message}`,
 sources: [],
 debug_screenshot: 'debug-web-search-error.png'
 }));
 }
}

searchDuckDuckGo();