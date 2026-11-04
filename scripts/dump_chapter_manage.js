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
    await page.waitForTimeout(5000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.resolve(__dirname, '../assets/chapter_manage_full_text.txt'), bodyText, 'utf8');
    
    // Also take screenshot
    await page.screenshot({ path: path.resolve(__dirname, '../assets/chapter_manage_full.png'), fullPage: true });
    
    console.log("Dumped full text and screenshot!");
    await context.close();
})();
