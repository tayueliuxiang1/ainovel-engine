const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true, channel: 'chrome' });
    const page = context.pages()[0] || await context.newPage();
    
    await page.goto('https://fanqienovel.com/main/writer/book-manage');
    const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    // Get all cells with chapter titles
    const titlesP1 = await page.locator('.arco-table-cell').allInnerTexts();
    console.log("Titles on Page 1:", titlesP1.filter(t => t.includes('第') && t.includes('章')));

    // Page 2
    const page2 = page.locator('.arco-pagination-item:has-text("2"), button:has-text("2")').first();
    if (await page2.isVisible()) {
        await page2.click();
        await page.waitForTimeout(3000);
        const titlesP2 = await page.locator('.arco-table-cell').allInnerTexts();
        console.log("Titles on Page 2:", titlesP2.filter(t => t.includes('第') && t.includes('章')));
    }

    await context.close();
})();
