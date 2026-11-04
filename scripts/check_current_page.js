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
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const shotPath = path.resolve(__dirname, '../assets/current_dashboard.png');
    await page.screenshot({ path: shotPath, fullPage: true });

    // 检查页面上所有文本内容
    const allText = await page.evaluate(() => document.body.innerText);
    console.log("=== FULL PAGE TEXT ===");
    console.log(allText);

    await context.close();
})();
