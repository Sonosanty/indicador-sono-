// duckduckgo-search.mjs
import { chromium } from 'playwright';

async function searchDuckDuckGo(query) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: false, // Cambiado a false para depuración visual
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await (await browser.newContext()).newPage();

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }); // Aumentado timeout
    await page.waitForTimeout(10000); // Aumentado timeout

    const results = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('a, p, span')); // Selectores más amplios
      const extracted = [];
      let currentTitle = '';
      let currentSnippet = '';
      let currentUrl = '';

      for (const el of allElements) {
        const text = el.innerText?.trim();
        const href = el.href;

        if (href && href.includes('duckduckgo.com/l/?uddg=')) {
          // Es un enlace de resultado
          if (currentTitle && currentSnippet && currentUrl) {
            extracted.push({ title: currentTitle, snippet: currentSnippet, url: decodeURIComponent(currentUrl.match(/uddg=(.*?)(?:&|$)/)[1]) });
            currentTitle = '';
            currentSnippet = '';
            currentUrl = '';
          }
          currentUrl = href;
          currentTitle = text || '';
        } else if (text && currentUrl && !currentSnippet) {
          // Es un snippet asociado al último enlace
          currentSnippet = text;
        } else if (text && !currentTitle && !currentUrl) {
          // Podría ser un título si no hemos encontrado un enlace aún
          currentTitle = text;
        }

        if (extracted.length >= 5) break; // Limitar a 5 resultados
      }
      // Añadir el último resultado si existe
      if (currentTitle && currentSnippet && currentUrl) {
        extracted.push({ title: currentTitle, snippet: currentSnippet, url: decodeURIComponent(currentUrl.match(/uddg=(.*?)(?:&|$)/)[1]) });
      }

      return extracted.filter(Boolean);
    });

    await browser.close();

    let answer = results.map(r => `${r.title}\n${r.snippet}`).join('\n\n');
    let sources = results.map(r => ({ url: r.url, title: r.title }));

    return JSON.stringify({ success: !!answer, query, answer: answer || '', sources: sources });

  } catch(e) {
    if (browser) await browser.close().catch(()=>{});
    return JSON.stringify({ success: false, query, error: e.message, sources: [] });
  }
}

let query = process.argv[2] || '';
if (query) {
  searchDuckDuckGo(query).then(r => process.stdout.write(r));
} else {
  const c = []; process.stdin.on('data', d => c.push(d));
  process.stdin.on('end', async () => {
    try { query = JSON.parse(Buffer.concat(c).toString()).query || ''; } catch { query = Buffer.concat(c).toString().trim(); }
    process.stdout.write(await searchDuckDuckGo(query));
  });
}
