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

    // We need to delete any chapter >= 18 that was published out of order
    // Chapters to delete: 24, 21, 19, 18, 23 (5 chapters)
    for (let d = 0; d < 5; d++) {
        const firstRow = page.locator('tbody tr').first();
        const titleText = await firstRow.locator('td').first().innerText().catch(() => '');
        console.log(`[删除检查] 当前第一行: ${titleText}`);
        
        // Safety check: only delete if it is chapter 18, 19, 21, 23, 24
        const isTarget = /第(18|19|21|23|24)章/.test(titleText);
        if (!isTarget) {
            console.log(`第一行不是目标章节，停止删除: ${titleText}`);
            break;
        }

        const deleteIcon = firstRow.locator('.auto-editor-chapter-delete, .icon-delete').first();
        await deleteIcon.click();
        await page.waitForTimeout(1000);

        // Click confirm in modal
        const confirmBtn = page.locator('.arco-modal button.arco-btn-primary, .arco-modal button:has-text("删除")').first();
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click();
        console.log(`✅ 已确认删除: ${titleText}`);
        
        // Wait for table to reload
        await page.waitForTimeout(3500);
    }

    // Inspect remaining first row
    const newFirstRow = await page.locator('tbody tr').first().locator('td').first().innerText().catch(() => '');
    console.log(`\n🎉 删除完成，当前第一行章节为: ${newFirstRow}`);

    await context.close();
})();
