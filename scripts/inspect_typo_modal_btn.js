const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1", { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // If modal is already there or click next
    const modal = page.locator('.arco-modal:has-text("发布提示"), [role="dialog"]:has-text("发布提示")').first();
    let isVis = await modal.isVisible().catch(() => false);
    if (!isVis) {
        const nextBtn = page.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
        if (await nextBtn.isVisible()) {
            await nextBtn.click({ force: true });
            await page.waitForTimeout(2000);
        }
    }

    const modalHtml = await page.locator('.arco-modal:has-text("发布提示"), [role="dialog"]:has-text("发布提示")').first().innerHTML().catch(() => 'none');
    console.log("Modal innerHTML:\n", modalHtml);

    // Try clicking submit
    const btn = page.locator('.arco-modal:has-text("发布提示") button:has-text("提交"), .arco-modal:has-text("发布提示") .arco-btn:has-text("提交")').first();
    console.log("Submit button visible?", await btn.isVisible());
    if (await btn.isVisible()) {
        await btn.click();
        console.log("Clicked submit on typo modal!");
        await page.waitForTimeout(2000);
        const nextModals = await page.locator('.arco-modal, [role="dialog"]').allInnerTexts().catch(() => []);
        console.log("Next modals after clicking typo submit:", nextModals);
    }

    await context.close();
})();
