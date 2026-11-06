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

    console.log('正在访问作品管理主页...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log('当前页面 URL:', page.url());

    // 检查页面上所有与大唐相关的卡片或按钮
    const books = await page.evaluate(() => {
        const res = [];
        const items = document.querySelectorAll('.completion-book-item-main, div[class*="book-item"], .book-card');
        items.forEach(item => {
            res.push({
                text: item.innerText.slice(0, 200),
                links: Array.from(item.querySelectorAll('a, button')).map(a => ({
                    text: a.innerText.trim(),
                    href: a.getAttribute('href') || ''
                }))
            });
        });
        return res;
    });

    console.log('找到的书籍卡片:', JSON.stringify(books, null, 2));

    // 如果找到了，点击“章节管理”或相关链接
    const manageBtn = page.locator('button:has-text("章节管理"), a:has-text("章节管理"), div:has-text("章节管理")').first();
    if (await manageBtn.isVisible().catch(() => false)) {
        console.log('找到【章节管理】按钮，准备点击...');
        await manageBtn.click();
        await page.waitForTimeout(5000);
        console.log('进入章节管理后的 URL:', page.url());
        await page.screenshot({ path: 'assets/real_chapter_manage.png', fullPage: true });

        // 抓取章节列表信息
        const pageText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
        console.log('页面内容摘要:\n', pageText);
    } else {
        console.log('未直接找到【章节管理】按钮，截取当前页面凭证');
        await page.screenshot({ path: 'assets/book_manage_page.png', fullPage: true });
    }

    await context.close();
})();
