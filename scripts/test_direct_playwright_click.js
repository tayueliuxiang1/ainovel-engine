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

    console.log('1. 打开 book-manage...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    console.log('2. 点击左侧小说菜单...');
    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    await novelMenu.click();
    await page.waitForTimeout(4000);

    console.log('3. 定位大唐的章节管理链接并用 Playwright 点击...');
    const chapLink = page.locator('a[href^="/main/writer/chapter-manage/7704518175408278552"]').first();
    const count = await chapLink.count();
    console.log('匹配到的链接数:', count);

    if (count > 0) {
        await chapLink.click();
        console.log('已点击链接，等待页面加载...');
        await page.waitForTimeout(6000);

        console.log('跳转后的 URL:', page.url());
        const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1500));
        console.log('页面内容截取:\n', bodySnippet);

        await page.screenshot({ path: 'assets/real_chapter_manage_success.png', fullPage: true });
    } else {
        console.log('未找到目标链接，检查页面所有包含 chapter-manage 的 a 标签');
        const allHrefs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href') || '').filter(h => h.includes('chapter'));
        });
        console.log('找到的含 chapter 的链接:', allHrefs);
    }

    await context.close();
})();
