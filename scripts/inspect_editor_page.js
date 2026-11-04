const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log("Navigating directly to editor...");
    await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1", { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const shot = path.resolve(__dirname, '../assets/editor_direct_view.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log("Saved editor_direct_view.png");

    const html = await page.content();
    fs.writeFileSync(path.resolve(__dirname, '../assets/editor_direct_view.html'), html, 'utf8');

    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input elements:`);
    for (let i = 0; i < inputs.length; i++) {
        const placeholder = await inputs[i].getAttribute('placeholder');
        const className = await inputs[i].getAttribute('class');
        const value = await inputs[i].inputValue().catch(() => '');
        console.log(`Input ${i}: placeholder="${placeholder}", class="${className}", value="${value}"`);
    }

    const text = await page.evaluate(() => document.body.innerText);
    console.log("Body text snippet:\n", text.slice(0, 500));

    await context.close();
})();
