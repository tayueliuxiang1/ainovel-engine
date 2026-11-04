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

    const bodyText = await page.evaluate(() => document.body.innerText);
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
    
    console.log("=== ALL CHAPTERS FOUND ON PAGE ===");
    for (const line of lines) {
        if (line.includes('第') && line.includes('章')) {
            console.log(line);
        }
    }
    
    // Check pagination
    console.log("=== PAGINATION / FOOTER ===");
    const pagination = await page.locator('.arco-pagination, [class*="pagination"]').innerText().catch(() => 'no pagination found');
    console.log('Pagination:', pagination);

    // If there is next page or page 2, click it
    const page2Btn = page.locator('.arco-pagination-item:has-text("2"), button:has-text("2")').first();
    if (await page2Btn.isVisible().catch(() => false)) {
        console.log("Clicking page 2...");
        await page2Btn.click();
        await page.waitForTimeout(3000);
        const bodyText2 = await page.evaluate(() => document.body.innerText);
        const lines2 = bodyText2.split('\n').map(l => l.trim()).filter(Boolean);
        console.log("=== CHAPTERS ON PAGE 2 ===");
        for (const line of lines2) {
            if (line.includes('第') && line.includes('章')) {
                console.log(line);
            }
        }
    }

    await context.close();
})();
