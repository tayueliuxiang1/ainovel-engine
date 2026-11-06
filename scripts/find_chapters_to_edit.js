const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log('正在访问作品管理主页: https://fanqienovel.com/main/writer/book-manage');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log('当前 URL:', page.url());

    // 检查页面上的全部书籍
    const books = await page.evaluate(() => {
        const res = [];
        const items = document.querySelectorAll('div, li, tr');
        items.forEach(el => {
            const txt = el.innerText || '';
            if (txt.includes('大唐') || txt.includes('诛你九族') || txt.includes('7704518175408278552')) {
                const links = Array.from(el.querySelectorAll('a, button')).map(a => ({
                    text: a.innerText.trim(),
                    href: a.getAttribute('href') || '',
                    className: a.className
                }));
                if (links.length > 0) {
                    res.push({
                        sampleText: txt.slice(0, 150),
                        links: links
                    });
                }
            }
        });
        return res;
    });

    console.log('匹配到的大唐相关元素数量:', books.length);
    if (books.length > 0) {
        console.log('样本 0:', JSON.stringify(books[0], null, 2));
    }

    // 查找包含“大唐”或 ID 的卡片并寻找章节管理按钮
    const datangCard = page.locator('div, tr, li').filter({ hasText: '大唐' }).filter({ hasText: '章节管理' }).first();
    const isFound = await datangCard.isVisible().catch(() => false);
    console.log('是否找到大唐卡片的章节管理:', isFound);

    if (isFound) {
        const btn = datangCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
        await btn.click();
        await page.waitForTimeout(4000);
        console.log('点击章节管理后 URL:', page.url());
        await page.screenshot({ path: 'assets/datang_chapter_manage.png', fullPage: true });

        // 查看章节列表
        const chapterRows = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr, .arco-table-row, div[class~="chapter-item"]'));
            return rows.map(r => ({
                text: r.innerText.replace(/\n+/g, ' ').trim(),
                buttons: Array.from(r.querySelectorAll('a, button')).map(b => b.innerText.trim())
            })).filter(r => r.text.includes('第') && r.text.includes('章'));
        });
        console.log('检测到的章节行:', chapterRows);
    } else {
        console.log('尝试抓取全局所有的章节管理按钮或链接');
        const allManage = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button'))
                .filter(a => (a.innerText || '').includes('章节管理'))
                .map(a => ({
                    text: a.innerText.trim(),
                    href: a.getAttribute('href') || '',
                    parentText: a.parentElement ? a.parentElement.innerText.slice(0, 100) : ''
                }));
        });
        console.log('所有章节管理链接/按钮:', allManage);
        await page.screenshot({ path: 'assets/book_manage_snapshot.png', fullPage: true });
    }

    await context.close();
})();
