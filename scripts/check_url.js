const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log("进入页面...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        const currentUrl = page.url();
        const pageTitle = await page.title();
        console.log("当前 URL:", currentUrl);
        console.log("当前 Title:", pageTitle);

        const html = await page.content();
        fs.writeFileSync(path.resolve(__dirname, '../assets/page_dump.html'), html, 'utf8');
        console.log(`页面 HTML 长度: ${html.length} 字符，已保存至 assets/page_dump.html`);

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
