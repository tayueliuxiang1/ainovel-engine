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

    // Search for 20
    console.log("=== SEARCHING FOR CHAPTER 20 ===");
    const searchInput = page.locator('input[placeholder*="搜索章节"]').first();
    if (await searchInput.isVisible()) {
        await searchInput.fill('第20章');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        const text = await page.evaluate(() => document.body.innerText);
        console.log("Search 20 result snippet:\n", text.split('\n').filter(l => l.includes('20') || l.includes('暂无') || l.includes('审核')).join(' | '));
        
        await searchInput.fill('第22章');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        const text22 = await page.evaluate(() => document.body.innerText);
        console.log("Search 22 result snippet:\n", text22.split('\n').filter(l => l.includes('22') || l.includes('暂无') || l.includes('审核')).join(' | '));
    }

    // Check Audit Status Dropdown
    const statusSelect = page.locator('.arco-select:has-text("审核状态"), .arco-select:has-text("全部")').first();
    if (await statusSelect.isVisible()) {
        await statusSelect.click();
        await page.waitForTimeout(1000);
        const options = await page.locator('.arco-select-option, [role="option"]').allInnerTexts();
        console.log("Status dropdown options:", options);
    }

    await context.close();
})();
