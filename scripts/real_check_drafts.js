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

    const tabs = await page.locator('.arco-tabs-tab').all();
    console.log(`Found ${tabs.length} tabs:`);
    for (const t of tabs) {
        console.log('Tab text:', await t.innerText());
    }

    const draftTab = page.locator('.arco-tabs-tab:has-text("草稿箱")').first();
    if (await draftTab.isVisible()) {
        console.log("Clicking 草稿箱 tab...");
        await draftTab.click();
        await page.waitForTimeout(3000);
        const text = await page.evaluate(() => document.body.innerText);
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        console.log("=== DRAFT TAB CONTENT ===");
        lines.filter(l => l.includes('第') && l.includes('章') || l.includes('草稿') || l.includes('暂无')).forEach(l => console.log(l));
    }

    await context.close();
})();
