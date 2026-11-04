const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const targetUrl = "https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const tooltipText = await page.evaluate(() => {
        const infoIcons = Array.from(document.querySelectorAll('svg, i, span')).filter(el => {
            const p = el.parentElement;
            return p && p.innerText && p.innerText.includes('正文字数');
        });
        return {
            infoParentText: infoIcons[0] ? infoIcons[0].parentElement.innerText : '',
            infoTitle: infoIcons[0] ? (infoIcons[0].getAttribute('title') || infoIcons[0].getAttribute('data-tooltip')) : ''
        };
    });

    console.log("Tooltip Info:", JSON.stringify(tooltipText, null, 2));
    await context.close();
})();
