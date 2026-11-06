const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('导航到第1章编辑页...');
    await page.goto('https://fanqienovel.com/main/writer/chapter-manage/7704518175408278552&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const page2Btn = page.locator('.arco-pagination-item, li').filter({ hasText: /^2$/ }).first();
    await page2Btn.click();
    await page.waitForTimeout(4000);

    const editBtn = page.locator('a[href^="/main/writer/7704518175408278552/publish/7704528770274689560"]').last();
    await editBtn.click();
    await page.waitForTimeout(5000);

    const modalInfo = await page.evaluate(() => {
        const wrappers = Array.from(document.querySelectorAll('.byte-modal-wrapper, .arco-modal-wrapper, div[role="dialog"]'));
        return wrappers.map(w => ({
            className: w.className,
            text: w.innerText.replace(/\n+/g, ' | ').trim()
        }));
    });

    console.log('检测到的弹窗数量:', modalInfo.length);
    modalInfo.forEach((m, idx) => console.log(`[弹窗 ${idx}] class: ${m.className} -> ${m.text}`));

    await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', 'modal_intercept_inspect.png') });
    console.log('截图已保存');

    await context.close();
})();
