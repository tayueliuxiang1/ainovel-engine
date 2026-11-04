const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const targetUrl = "https://fanqienovel.com/main/writer/chapter-manage/7703749876651150360&%E8%AE%A9%E4%BD%A0%E9%81%B5%E5%AE%88%E8%A7%84%E5%88%99%EF%BC%8C%E4%BD%A0%E6%8A%8A%E8%AF%A1%E5%BC%82%E9%80%BC%E7%96%AF%E4%BA%86%EF%BC%9F?type=1";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 关闭可能的引导提示
    const tipsBtn = page.locator('button:has-text("我知道了")').first();
    if (await tipsBtn.isVisible().catch(() => false)) {
        await tipsBtn.click();
        await page.waitForTimeout(500);
    }

    console.log("Clicking '编辑分卷'...");
    await page.locator('button:has-text("编辑分卷")').first().click();
    await page.waitForTimeout(2000);

    const shotPath = path.resolve(__dirname, '../assets/volume_edit_modal.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    const modalText = await page.evaluate(() => {
        const modal = document.querySelector('.arco-modal, [role="dialog"]');
        return modal ? modal.innerText : 'No modal found';
    });
    console.log("=== MODAL TEXT ===");
    console.log(modalText);

    await context.close();
})();
