// simple-playwright-test.mjs
import { chromium } from 'playwright';

async function testPlaywright() {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await (await browser.newContext()).newPage();

    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();

    await browser.close();
    return JSON.stringify({ success: true, title: title });

  } catch(e) {
    if (browser) await browser.close().catch(()=>{});
    return JSON.stringify({ success: false, error: e.message });
  }
}

testPlaywright().then(r => process.stdout.write(r));
