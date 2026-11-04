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

    // 1. Check Drafts
    console.log("=== CHECKING DRAFT BOX ===");
    const draftTab = page.locator('div:has-text("草稿箱"), button:has-text("草稿箱"), [role="tab"]:has-text("草稿箱")').first();
    if (await draftTab.isVisible().catch(() => false)) {
        await draftTab.click();
        await page.waitForTimeout(3000);
        const draftsText = await page.evaluate(() => document.body.innerText);
        console.log("Draft text lines:");
        draftsText.split('\n').filter(l => l.includes('第') && l.includes('章')).forEach(l => console.log('Draft: ' + l));
    }

    // 2. Check Volumes
    await page.goto('https://fanqienovel.com/main/writer/book-manage');
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);
    
    console.log("=== CHECKING VOLUMES ===");
    const volumeDropdown = page.locator('.arco-select:has-text("卷"), div:has-text("第一卷")').first();
    if (await volumeDropdown.isVisible().catch(() => false)) {
        await volumeDropdown.click();
        await page.waitForTimeout(1000);
        const options = await page.locator('.arco-select-option, [role="option"]').allInnerTexts().catch(() => []);
        console.log("Volume options:", options);
    }

    await context.close();
})();
