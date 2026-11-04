const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const targetUrl = "https://fanqienovel.com/main/writer/chapter-manage/7703749876651150360&%E8%AE%A9%E4%BD%A0%E9%81%B5%E5%AE%88%E8%A7%84%E5%88%99%EF%BC%8C%E4%BD%A0%E6%8A%8A%E8%AF%A1%E5%BC%82%E9%80%BC%E7%96%AF%E4%BA%86%EF%BC%9F?type=1";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log("Navigating to chapter-manage URL...");
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const shotPath = path.resolve(__dirname, '../assets/chapter_manage_page.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    const text = await page.evaluate(() => document.body.innerText);
    console.log("=== CHAPTER MANAGE BODY TEXT ===");
    console.log(text.slice(0, 1500));

    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a, .arco-btn, .arco-select')).map(b => ({
            tag: b.tagName,
            text: b.innerText.trim(),
            className: b.className
        })).filter(x => x.text.length > 0 && x.text.length < 50);
    });
    console.log("=== BUTTONS ON CHAPTER MANAGE ===");
    console.log(JSON.stringify(buttons, null, 2));

    await context.close();
})();
