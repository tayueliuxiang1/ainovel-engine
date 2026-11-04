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
    
    console.log("=== CHAPTER MANAGEMENT PAGE SNIPPET ===");
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('第') && lines[i].includes('章') || lines[i].includes('草稿') || lines[i].includes('已发布') || lines[i].includes('定时')) {
            console.log(lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(' | '));
        }
    }
    
    await context.close();
})();
