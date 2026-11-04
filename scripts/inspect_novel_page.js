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
    console.log("Navigating to novel page https://fanqienovel.com/page/7703749876651150360 ...");
    await page.goto("https://fanqienovel.com/page/7703749876651150360", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log("Current URL:", page.url());
    const shotPath = path.resolve(__dirname, '../assets/novel_page_screenshot.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a, .arco-btn, .arco-menu-item')).map(el => ({
            tag: el.tagName,
            text: el.innerText.trim(),
            href: el.getAttribute('href') || '',
            classes: el.className
        })).filter(x => x.text.length > 0 && x.text.length < 50);
    });

    console.log("=== BUTTONS / LINKS FOUND ===");
    console.log(JSON.stringify(buttons, null, 2));

    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log("=== BODY TEXT SNIPPET ===");
    console.log(bodySnippet);

    await context.close();
})();
