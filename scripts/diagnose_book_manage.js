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

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', resp => {
        if (resp.url().includes('book') || resp.url().includes('author') || resp.url().includes('work') || resp.url().includes('manage')) {
            console.log(`RESP: [${resp.status()}] ${resp.url().slice(0, 100)}`);
        }
    });

    try {
        console.log("Navigating to https://fanqienovel.com/main/writer/book-manage ...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'networkidle' });
        await page.waitForTimeout(6000);
    } catch(e) {
        console.log("Navigation timeout or error:", e.message);
    }

    const shotPath = path.resolve(__dirname, '../assets/current_book_manage_state.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    const fullText = await page.evaluate(() => document.body.innerText);
    console.log("=== FULL PAGE TEXT ===");
    console.log(fullText);

    await context.close();
})();
