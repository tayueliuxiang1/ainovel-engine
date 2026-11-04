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

    const draftTab = page.locator('text=草稿箱').first();
    if (await draftTab.isVisible()) {
        await draftTab.click();
        await page.waitForTimeout(3000);
        const shotPath = path.resolve(__dirname, '../assets/draft_box.png');
        await page.screenshot({ path: shotPath, fullPage: true });
        console.log("Draft screenshot saved to:", shotPath);
        const draftText = await page.evaluate(() => document.body.innerText);
        console.log("=== DRAFT BOX TEXT ===");
        console.log(draftText.slice(0, 1000));
    }
    
    await context.close();
})();
