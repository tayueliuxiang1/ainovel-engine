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

    // 检查表头和分页
    const details = await page.evaluate(() => {
        const ths = Array.from(document.querySelectorAll('th, .arco-table-th')).map(th => th.innerText.trim());
        const pagers = Array.from(document.querySelectorAll('.arco-pagination-item, .arco-pagination-total, .arco-pagination')).map(p => p.innerText.trim());
        
        // 抓取每一行的完整单元格
        const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
        const rowsInfo = trs.map(tr => {
            const tds = Array.from(tr.querySelectorAll('td, .arco-table-td')).map(td => {
                const btns = Array.from(td.querySelectorAll('button, a, span')).map(b => ({
                    text: b.innerText.trim(),
                    tag: b.tagName,
                    href: b.getAttribute('href') || '',
                    className: b.className
                })).filter(b => b.text.length > 0 && b.text.length < 20);
                return {
                    text: td.innerText.replace(/\n+/g, ' ').trim(),
                    btns: btns
                };
            });
            return {
                rowText: tr.innerText.replace(/\n+/g, ' ').trim(),
                cells: tds
            };
        }).filter(r => r.rowText.includes('第') && r.rowText.includes('章'));

        return {
            headers: ths,
            pagination: pagers,
            rows: rowsInfo
        };
    });

    console.log('表头信息:', details.headers);
    console.log('分页信息:', details.pagination);
    console.log('\n章节行与单元格操作:');
    details.rows.forEach((r, idx) => {
        console.log(`\n行 [${idx}] ${r.rowText}`);
        r.cells.forEach((c, cIdx) => {
            if (c.btns.length > 0) {
                console.log(`   列 [${cIdx}]: 文本="${c.text}", 按钮=`, JSON.stringify(c.btns));
            }
        });
    });

    await context.close();
})();
