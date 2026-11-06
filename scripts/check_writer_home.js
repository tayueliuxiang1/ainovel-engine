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

    console.log('访问作家专区后台首页...');
    await page.goto('https://fanqienovel.com/main/writer/index', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log('首页 URL:', page.url());
    console.log('首页标题:', await page.title());

    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    console.log('首页内容摘要:\n', bodySnippet);

    await page.screenshot({ path: 'assets/writer_home.png', fullPage: true });

    // 查看导航菜单和链接
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button')).map(el => ({
            text: el.innerText.trim(),
            href: el.getAttribute('href') || ''
        })).filter(l => l.text.length > 0 && l.text.length < 30);
    });
    console.log('可见导航与按钮:', links.slice(0, 30));

    await context.close();
})();
