const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    const targetUrl = 'https://fanqienovel.com/main/writer/chapter-manage/7704518175408278552&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1';
    console.log('正在打开大唐章节管理页:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);

    console.log('当前 URL:', page.url());

    // 抓取页面结构
    const info = await page.evaluate(() => {
        const rows = [];
        // 查找表格行或列表项
        const elements = document.querySelectorAll('tr, .arco-table-row, div[class~="chapter-item"], div[class~="list-item"]');
        elements.forEach(el => {
            const txt = el.innerText || '';
            if (txt.includes('第') && (txt.includes('章') || txt.includes('审核') || txt.includes('已发布') || txt.includes('修改') || txt.includes('编辑'))) {
                const buttons = Array.from(el.querySelectorAll('a, button, span')).map(b => ({
                    text: b.innerText.trim(),
                    tag: b.tagName,
                    href: b.getAttribute('href') || '',
                    className: b.className
                })).filter(b => b.text.length > 0 && b.text.length < 15);
                rows.push({
                    text: txt.replace(/\n+/g, ' ').trim(),
                    buttons: buttons
                });
            }
        });
        return {
            pageText: document.body.innerText.slice(0, 1500),
            matchedRows: rows
        };
    });

    console.log('页面摘要文本:\n', info.pageText);
    console.log('\n匹配到的章节行信息:');
    info.matchedRows.forEach((r, idx) => {
        console.log(`行 [${idx}]: ${r.text}`);
        console.log(`   操作按钮:`, JSON.stringify(r.buttons));
    });

    await page.screenshot({ path: 'assets/datang_chapter_manage_actual.png', fullPage: true });
    await context.close();
})();
