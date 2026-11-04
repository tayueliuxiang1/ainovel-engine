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
        
        const actions = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tr, .arco-table-tr')).map(tr => {
                const text = tr.innerText.replace(/\n+/g, ' | ');
                const btns = Array.from(tr.querySelectorAll('button, a')).map(b => b.innerText.trim());
                return { text, btns };
            });
        });
        console.log("=== DRAFT ACTIONS ===");
        console.log(JSON.stringify(actions, null, 2));
    }
    
    await context.close();
})();
