const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
    page.on('requestfailed', request => console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`));
    
    console.log('Navigating to http://localhost:5174/#/trees/proxi...');
    try {
        await page.goto('http://localhost:5174/#/trees/proxi', { waitUntil: 'networkidle0', timeout: 15000 });
    } catch(e) {
        console.log(`[ERROR] goto failed: ${e.message}`);
    }
    
    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
    
    await browser.close();
})();
