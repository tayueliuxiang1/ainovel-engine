const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    console.log('1. 访问作品管理页...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // 点击大唐作品卡片中的“章节管理”
    const chapManage = page.locator('text=章节管理').first();
    if (await chapManage.isVisible().catch(() => false)) {
        await chapManage.click();
        await page.waitForTimeout(5000);
    }

    console.log('当前章节管理 URL:', page.url());

    // 抓取章节列表的所有行以及每行的操作
    const result = await page.evaluate(() => {
        const rows = [];
        // 查找所有行
        const tableRows = document.querySelectorAll('tr, .arco-table-row, div[class~="chapter-item"]');
        tableRows.forEach(row => {
            const rowText = row.innerText || '';
            const links = Array.from(row.querySelectorAll('a, button, span')).map(el => ({
                text: el.innerText.trim(),
                tag: el.tagName,
                href: el.getAttribute('href') || '',
                className: el.className
            })).filter(el => el.text.length > 0 && el.text.length < 20);

            if (rowText.includes('第') && (rowText.includes('章') || rowText.includes('字'))) {
                rows.push({
                    text: rowText.replace(/\n+/g, ' | ').trim(),
                    actions: links
                });
            }
        });
        return {
            totalRows: rows.length,
            rows: rows,
            bodyText: document.body.innerText.slice(0, 2000)
        };
    });

    console.log('章节数量:', result.totalRows);
    console.log('章节行详情:');
    result.rows.forEach((r, i) => {
        console.log(`[${i}] ${r.text}`);
        console.log(`    操作项:`, JSON.stringify(r.actions));
    });

    await page.screenshot({ path: 'assets/chapter_manage_table.png', fullPage: true });
    await context.close();
})();
