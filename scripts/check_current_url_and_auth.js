const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter_1';
    console.log('正在访问:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    console.log('实际跳转后 URL:', page.url());
    console.log('页面标题:', await page.title());

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('页面主体纯文本:\n------------------------------------');
    console.log(bodyText.slice(0, 1000));
    console.log('------------------------------------');

    await page.screenshot({ path: 'assets/auth_or_page_status.png', fullPage: true });
    await context.close();
})();
