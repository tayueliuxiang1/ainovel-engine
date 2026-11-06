const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('正在导航进入作品管理页...');
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
    await page.waitForTimeout(6000);

    console.log('当前章节管理页URL:', page.url());

    const result = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr, .arco-table-row, div[class~="chapter-item"]'));
        return rows.map((r, i) => {
            const links = Array.from(r.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') }));
            const btns = Array.from(r.querySelectorAll('button')).map(b => b.innerText.trim());
            return { index: i, text: r.innerText.replace(/\n+/g, ' | ').trim(), links, btns };
        });
    });

    console.log('识别到行数:', result.length);
    result.forEach(item => {
        console.log(`[行 ${item.index}] ${item.text}`);
        if (item.links.length > 0) console.log('    links:', JSON.stringify(item.links));
    });

    const shot = path.resolve(__dirname, '..', 'assets', 'chapter_manage_inspect.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('截图存入:', shot);

    await context.close();
})();
