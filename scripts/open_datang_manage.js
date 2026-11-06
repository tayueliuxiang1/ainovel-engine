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

    console.log('打开 book-manage 页面...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 点击左侧小说导航（确保显示小说卡片）
    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    console.log('定位卡片: ' + novelName);
    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });

    const btn = card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
    console.log('点击章节管理按钮...');
    await btn.click();
    await page.waitForTimeout(5000);

    console.log('当前页面 URL:', page.url());

    // 检查 arco-table-cell
    const cells = await page.locator('.arco-table-cell, tr, .arco-table-row').allInnerTexts();
    console.log('抓取到的表格单元格数量:', cells.length);
    console.log('包含章节的单元格:\n', cells.filter(t => t.includes('第') && t.includes('章')));

    // 查找所有的操作按钮（如“修改”、“编辑”、“查看”）
    const actions = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr, .arco-table-row'));
        return rows.map(r => {
            const text = r.innerText.replace(/\n+/g, ' ').trim();
            const btns = Array.from(r.querySelectorAll('button, a, span'))
                .map(b => b.innerText.trim())
                .filter(b => b.length > 0 && b.length < 15);
            return { text, btns };
        }).filter(r => r.text.includes('第') && r.text.includes('章'));
    });

    console.log('章节行与操作按钮明细:\n', JSON.stringify(actions, null, 2));

    await page.screenshot({ path: 'assets/datang_chapters_final_success.png', fullPage: true });
    await context.close();
})();
