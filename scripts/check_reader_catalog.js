const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log("Fetching novel page...");
    await page.goto("https://fanqienovel.com/page/7703749876651150360", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const catalogItems = await page.locator('.chapter-item, .catalog-item, [class*="chapter"]').allInnerTexts().catch(() => []);
    console.log("Catalog items on reader page:\n", catalogItems);

    await context.close();
})();
