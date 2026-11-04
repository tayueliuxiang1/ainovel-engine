const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true, channel: 'chrome' });
    const page = context.pages()[0] || await context.newPage();
    
    await page.goto('https://fanqienovel.com/page/7703749876651150360');
    await page.waitForTimeout(4000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("=== READER PAGE BODY TEXT ===");
    console.log(bodyText);

    await context.close();
})();
