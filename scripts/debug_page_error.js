const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

const BOOK_ID = '7704518175408278552';

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    page.on('console', msg => console.log('浏览器控制台:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('页面未捕获异常:', err.message));
    page.on('requestfailed', req => console.log('请求失败:', req.url(), req.failure() ? req.failure().errorText : ''));

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter_1';
    console.log('打开页面:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(6000);

    const htmlLen = await page.evaluate(() => document.documentElement.outerHTML.length);
    console.log('HTML 长度:', htmlLen);

    await context.close();
})();
