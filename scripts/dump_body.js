const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome'
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    console.log("Current URL:", page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("=== BODY TEXT PREVIEW (first 1000 chars) ===\n", bodyText.slice(0, 1000));
    await context.close();
})();
