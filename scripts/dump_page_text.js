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

    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('页面完整纯文本如下:\n------------------------------------');
    console.log(bodyText);
    console.log('------------------------------------');
    await context.close();
})();
