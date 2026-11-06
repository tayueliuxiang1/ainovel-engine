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
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        const card = page.locator('div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(5000);

        await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'all_15_chapters_manage.png'), fullPage: true });

        const rows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr, .arco-table-tr'));
            return trs.map(t => t.innerText.replace(/\n+/g, ' | ')).filter(t => t.includes('第'));
        });
        console.log('--- 第1页列表 (' + rows.length + ' 条) ---');
        rows.forEach(r => console.log(r));

        const nextBtn = page.locator('.arco-pagination-next, button[aria-label="下一页"]').first();
        if (await nextBtn.isVisible().catch(() => false)) {
            console.log('检测到分页按钮，点击进入下一页...');
            await nextBtn.click();
            await page.waitForTimeout(4000);
            await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'all_15_chapters_manage_p2.png'), fullPage: true });
            const p2Rows = await page.evaluate(() => {
                const trs = Array.from(document.querySelectorAll('tr, .arco-table-tr'));
                return trs.map(t => t.innerText.replace(/\n+/g, ' | ')).filter(t => t.includes('第'));
            });
            console.log('--- 第2页列表 (' + p2Rows.length + ' 条) ---');
            p2Rows.forEach(r => console.log(r));
        }

        const draftTab = page.locator('div, span, button').filter({ hasText: /^草稿箱/ }).first();
        if (await draftTab.isVisible().catch(() => false)) {
            await draftTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'drafts_inspect.png'), fullPage: true });
            const draftRows = await page.evaluate(() => {
                const trs = Array.from(document.querySelectorAll('tr, .arco-table-tr, .chapter-item'));
                return trs.map(t => t.innerText.replace(/\n+/g, ' | ')).filter(t => t.includes('第'));
            });
            console.log('--- 草稿箱列表 (' + draftRows.length + ' 条) ---');
            draftRows.forEach(r => console.log(r));
        }

    } catch (err) {
        console.error('检查发生异常:', err);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
})();
