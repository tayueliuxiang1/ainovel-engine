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

    const firstRow = page.locator('tbody tr').first();
    const rowTitle = await firstRow.locator('td').first().innerText();
    console.log("First row title:", rowTitle);

    const deleteBtn = firstRow.locator('.auto-editor-chapter-delete, .icon-delete').first();
    console.log("Delete button visible?", await deleteBtn.isVisible());
    if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForTimeout(2000);
        const modal = await page.locator('.arco-modal, [role="dialog"]').innerText().catch(() => 'no modal');
        console.log("Delete confirmation modal:\n", modal);
    }

    await context.close();
})();
