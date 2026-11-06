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

    // 切换到草稿箱
    const draftTab = page.locator('.arco-tabs-header-cell, .arco-tabs-tab, div[role="tab"]').filter({ hasText: '草稿箱' }).first();
    await draftTab.click();
    await page.waitForTimeout(4000);

    // 提取草稿箱中的每一项以及其操作链接
    const drafts = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
        return trs.map(tr => {
            const links = Array.from(tr.querySelectorAll('a, button')).map(a => ({
                text: a.innerText.trim(),
                href: a.getAttribute('href') || ''
            }));
            return {
                text: tr.innerText.replace(/\n+/g, ' ').trim(),
                links: links
            };
        }).filter(r => r.links.length > 0);
    });

    console.log('草稿箱详细列表:\n', JSON.stringify(drafts, null, 2));

    await context.close();
})();
