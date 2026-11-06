const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '大唐：盗我抗旱图';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    // 1. 检查第1章行和第3章行的操作列
    const rowOps = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr'));
        return trs.map(tr => {
            const txt = tr.innerText.replace(/\n+/g, ' ').trim();
            const tds = Array.from(tr.querySelectorAll('td'));
            const lastTd = tds[tds.length - 1];
            return {
                summary: txt,
                lastTdHtml: lastTd ? lastTd.innerHTML : '',
                buttons: Array.from(tr.querySelectorAll('button, a')).map(b => ({
                    text: b.innerText.trim(),
                    href: b.getAttribute('href') || '',
                    className: b.className
                }))
            };
        }).filter(r => r.summary.includes('第1章') || r.summary.includes('第3章'));
    });
    console.log('第1章和第3章行操作详情:\n', JSON.stringify(rowOps, null, 2));

    // 2. 检查草稿箱
    console.log('\n切换到【草稿箱】Tab...');
    const draftTab = page.locator('.arco-tabs-header-cell, .arco-tabs-tab, div[role="tab"]').filter({ hasText: '草稿箱' }).first();
    if (await draftTab.isVisible().catch(() => false)) {
        await draftTab.click();
        await page.waitForTimeout(4000);

        const draftRows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
            return trs.map(tr => tr.innerText.replace(/\n+/g, ' ').trim()).filter(t => t.length > 0);
        });
        console.log('草稿箱内容行:\n', draftRows);
        await page.screenshot({ path: 'assets/draft_box_list.png', fullPage: true });
    }

    await context.close();
})();
