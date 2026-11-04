const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

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

    // Look at table rows
    const rows = await page.locator('.arco-table-tr, tr').all();
    console.log(`Found ${rows.length} table rows:`);
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const text = await rows[i].innerText();
        const btns = await rows[i].locator('button, a, span[role="button"]').allInnerTexts();
        console.log(`Row ${i}: ${text.split('\n')[0]} | Actions: ${btns.join(', ')}`);
    }

    await context.close();
})();
