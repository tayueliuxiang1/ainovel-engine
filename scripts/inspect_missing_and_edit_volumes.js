const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    // 1. Check Draft box
    console.log("=== CHECKING DRAFT BOX ===");
    const draftTab = page.locator('.arco-tabs-header-cell:has-text("草稿箱"), [role="tab"]:has-text("草稿箱"), div:has-text("草稿箱")').first();
    if (await draftTab.isVisible().catch(() => false)) {
        await draftTab.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.resolve(__dirname, '../assets/draft_box_view.png') });
        const draftText = await page.evaluate(() => document.body.innerText);
        const draftLines = draftText.split('\n').map(l => l.trim()).filter(Boolean);
        console.log("Draft Box Lines:");
        draftLines.filter(l => l.includes('第') && l.includes('章')).forEach(l => console.log('  ' + l));
    }

    // 2. Go back to chapter manage
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    // 3. Click "编辑分卷"
    console.log("\n=== CLICKING 编辑分卷 ===");
    const editVolBtn = page.locator('button:has-text("编辑分卷"), a:has-text("编辑分卷")').first();
    if (await editVolBtn.isVisible().catch(() => false)) {
        await editVolBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.resolve(__dirname, '../assets/edit_volume_view.png') });
        const modalText = await page.evaluate(() => document.body.innerText);
        console.log("Edit Volume View Text Snippet:\n", modalText.slice(0, 1500));
    }

    await context.close();
})();
