const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    let browser = null;
    try {
        browser = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            channel: 'chrome',
            viewport: { width: 1440, height: 900 }
        });
        const page = await browser.newPage();
        await page.goto('https://fanqienovel.com/main/writer/chapter-manage/7704518175408278552?type=1', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const draftTab = page.locator('div, span, button').filter({ hasText: /^草稿箱/ }).first();
        await draftTab.click();
        await page.waitForTimeout(3000);

        const item14 = page.locator('tr, .arco-table-tr, div').filter({ hasText: '第14章 崔家老料跌成废柴' }).first();
        console.log('正在定位第14章草稿并点击编辑/修改...');
        const editBtn = item14.locator('button:has-text("编辑"), a:has-text("编辑"), button:has-text("修改"), a:has-text("修改")').first();
        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
        } else {
            await item14.click();
        }

        await page.waitForTimeout(5000);
        console.log('进入编辑器页面:', page.url());

        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        console.log('点击右上角【下一步】...');
        const allNextBtns = page.locator('button:has-text("下一步")');
        const nextCount = await allNextBtns.count();
        for (let i = 0; i < nextCount; i++) {
            const btn = allNextBtns.nth(i);
            const box = await btn.boundingBox();
            if (box && box.y < 120 && box.x > 800) {
                await btn.click({ force: true });
                console.log('已点击右上角下一步');
                break;
            }
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'debug_step_modal.png'), fullPage: true });

        const modalBtns = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"], span'));
            return btns.map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 20);
        });
        console.log('页面上所有可见按钮/短标签:');
        console.log(JSON.stringify(Array.from(new Set(modalBtns))));

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
})();
