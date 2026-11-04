const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const targetUrl = 'https://fanqienovel.com/main/writer/chapter-manage/7703749876651150360&%E8%AE%A9%E4%BD%A0%E9%81%B5%E5%AE%88%E8%A7%84%E5%88%99%EF%BC%8C%E4%BD%A0%E6%8A%8A%E8%AF%A1%E5%BC%82%E9%80%BC%E7%96%AF%E4%BA%86%EF%BC%9F?type=1';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const draftTab = page.locator('text=草稿箱').first();
    await draftTab.click();
    await page.waitForTimeout(2000);

    const draftTable = await page.evaluate(() => {
        // 找到草稿表格
        const tables = Array.from(document.querySelectorAll('table'));
        const table = tables[tables.length - 1]; // 通常最后一个是草稿表格
        if (!table) return "No table";
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        return rows.map(r => {
            const cells = Array.from(r.querySelectorAll('td')).map(td => ({
                text: td.innerText.trim(),
                buttons: Array.from(td.querySelectorAll('button, a')).map(b => b.innerText.trim())
            }));
            return cells;
        });
    });

    console.log("=== DRAFT TABLE DATA ===");
    console.log(JSON.stringify(draftTable, null, 2));

    await context.close();
})();
