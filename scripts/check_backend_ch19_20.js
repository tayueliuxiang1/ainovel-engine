const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: [
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log('正在导航进入书籍管理...');
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
        await card.waitFor({ timeout: 25000 });
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(5000);

        console.log('当前章节管理页URL:', page.url());

        // 查找所有章节行
        const chapters = await page.evaluate(() => {
            const list = [];
            const links = document.querySelectorAll('a[href^="/main/writer/"]');
            links.forEach(a => {
                const href = a.getAttribute('href');
                if (href && href.includes('/publish/')) {
                    const tr = a.closest('tr') || a.parentElement;
                    const text = tr ? tr.innerText.replace(/\n+/g, ' | ') : a.innerText;
                    list.push({ href: href, text: text });
                }
            });
            return list;
        });

        console.log('第一页抓取到的章节列表 (共 ' + chapters.length + ' 条):');
        chapters.forEach(c => console.log(c.href, '-->', c.text));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await context.close();
    }
})();
