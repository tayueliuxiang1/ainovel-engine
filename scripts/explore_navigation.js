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

    // 监听网络请求
    page.on('response', async resp => {
        const url = resp.url();
        if (url.includes('/api/') || url.includes('book') || url.includes('chapter')) {
            try {
                if (url.includes('list') || url.includes('detail') || url.includes('info')) {
                    console.log('API 命中:', resp.status(), url);
                }
            } catch (e) {}
        }
    });

    console.log('打开 book-manage 页面...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'networkidle', timeout: 45000 }).catch(e => {
        console.log('页面加载 networkidle 超时，继续处理');
    });
    await page.waitForTimeout(3000);

    // 点击左侧的“小说”菜单
    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        console.log('点击左侧【小说】菜单项...');
        await novelMenu.click().catch(() => {});
        await page.waitForTimeout(4000);
    }

    console.log('当前 URL:', page.url());
    const fullText = await page.evaluate(() => document.body.innerText);
    console.log('页面内容截取 (前 1000 字):\n', fullText.slice(0, 1000));

    // 查看页面中的所有链接
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.getAttribute('href') || ''
        })).filter(l => l.text.length > 0);
    });
    console.log('可见链接:', links);

    await page.screenshot({ path: 'assets/novel_list_explored.png', fullPage: true });
    await context.close();
})();
