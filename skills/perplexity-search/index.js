const { chromium } = require('playwright');

async function perplexitySearch(query) {
  console.log(`[Perplexity] Buscando: ${query}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();

  try {
    await page.goto('https://www.perplexity.ai/', { waitUntil: 'networkidle' });
    await page.waitForSelector('textarea[placeholder*="Ask"]', { timeout: 10000 });
    await page.fill('textarea[placeholder*="Ask"]', query);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    
    const content = await page.evaluate(() => {
      const answerDiv = document.querySelector('[class*="answer"]') || 
                        document.querySelector('[class*="response"]') ||
                        document.querySelector('main [class*="prose"]');
      return answerDiv ? answerDiv.innerText : null;
    });
    
    await browser.close();
    
    if (content && content.trim().length > 0) {
      return {
        success: true,
        query: query,
        result: content.trim(),
        source: 'Perplexity.ai'
      };
    } else {
      return {
        success: false,
        query: query,
        error: 'No se pudo extraer contenido de Perplexity',
        result: 'Intenta reformular la pregunta'
      };
    }
    
  } catch (error) {
    await browser.close();
    console.error('[Perplexity] Error:', error.message);
    
    return {
      success: false,
      query: query,
      error: error.message,
      result: 'Error al buscar en Perplexity'
    };
  }
}

module.exports = { 
  perplexitySearch,
  tools: {
    search: async (params) => {
      return await perplexitySearch(params.query);
    }
  }
};
