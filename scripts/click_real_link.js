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

    console.log('1. 进入 book-manage...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // 点击左侧“小说”菜单
    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        console.log('2. 已点击【小说】导航');
        await page.waitForTimeout(3000);
    }

    // 查找包含 7704518175408278552 的链接
    const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const target = links.find(a => {
            const h = a.getAttribute('href') || '';
            return h.includes('7704518175408278552') && h.includes('chapter-manage');
        });
        if (target) {
            target.click();
            return { found: true, href: target.getAttribute('href') };
        }
        return { found: false };
    });

    console.log('点击目标链接结果:', clicked);
    await page.waitForTimeout(6000);
    console.log('点击后 URL:', page.url());

    // 抓取页面上的全部文本
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('页面主体文本 (前 1500 字):\n', bodyText.slice(0, 1500));

    // 查找页面上的所有按钮和链接
    const pageActions = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('button, a, span, div'));
        return items.filter(el => {
            const t = el.innerText ? el.innerText.trim() : '';
            return t === '编辑' || t === '修改' || t === '撤回' || t.includes('第1章') || t.includes('第2章') || t.includes('第3章') || t.includes('草稿');
        }).map(el => ({
            tag: el.tagName,
            text: el.innerText.trim(),
            href: el.getAttribute('href') || '',
            className: el.className
        }));
    });
    console.log('匹配到的关键元素:', pageActions);

    await page.screenshot({ path: 'assets/after_click_chapter_manage.png', fullPage: true });
    await context.close();
})();
