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

    const tipsBtn = page.locator('button:has-text("我知道了")').first();
    if (await tipsBtn.isVisible().catch(() => false)) await tipsBtn.click();

    await page.locator('button:has-text("编辑分卷")').first().click();
    await page.waitForTimeout(1000);

    const modalDetails = await page.evaluate(() => {
        const modal = document.querySelector('.arco-modal');
        if (!modal) return "No modal";
        return {
            innerHTML: modal.innerHTML,
            inputs: Array.from(modal.querySelectorAll('input')).map(i => i.outerHTML),
            buttons: Array.from(modal.querySelectorAll('button, svg, span')).map(el => ({
                tag: el.tagName,
                text: el.innerText,
                className: el.className
            }))
        };
    });

    console.log("Modal Details:", JSON.stringify(modalDetails, null, 2));
    await context.close();
})();
