const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });

    const chapManageBtn = bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
    await chapManageBtn.click({ force: true });
    await page.waitForTimeout(3000);

    const shotPath = path.resolve(__dirname, '../assets/updated_123_pure_status.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot of updated chapters 1, 2, 3 saved to:", shotPath);

    await context.close();
})();
