const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const BOOK_ID = '7704518175408278552';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log('正在访问章节管理页面...');
    const url = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/chapter-manage';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log('当前页面 URL:', page.url());
    console.log('当前页面标题:', await page.title());

    if (!fs.existsSync('assets')) {
        fs.mkdirSync('assets', { recursive: true });
    }
    await page.screenshot({ path: 'assets/chapter_manage_inspect.png', fullPage: true });

    const info = await page.evaluate(() => {
        const rows = [];
        document.querySelectorAll('tr, .arco-table-tr').forEach(tr => {
            const txt = tr.innerText.trim();
            if (txt.includes('第') && txt.includes('章')) {
                const btns = Array.from(tr.querySelectorAll('button, a, span')).map(b => b.innerText.trim()).filter(Boolean);
                rows.push({
                    text: txt.split('\n')[0] + ' | ' + txt.split('\n').slice(1).join(' / '),
                    buttons: btns
                });
            }
        });
        return {
            rowCount: rows.length,
            rows: rows,
            allBodyTextSnippet: document.body.innerText.slice(0, 1000)
        };
    });

    console.log('获取到的章节管理信息:', JSON.stringify(info, null, 2));

    await context.close();
})();
