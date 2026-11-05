const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
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
        console.log("检查页面 Frames...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        const frames = page.frames();
        console.log(`页面 Frame 数量: ${frames.length}`);
        for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            const fUrl = f.url();
            console.log(`Frame [${i}]: ${fUrl}`);
            const inputs = await f.evaluate(() => {
                const list = [];
                document.querySelectorAll('input, [contenteditable="true"]').forEach(el => {
                    list.push({
                        tag: el.tagName,
                        placeholder: el.getAttribute('placeholder') || '',
                        contenteditable: el.getAttribute('contenteditable') || '',
                        className: el.className
                    });
                });
                return list;
            }).catch(e => `Error: ${e.message}`);
            console.log(`Frame [${i}] 内部输入框:\n`, JSON.stringify(inputs, null, 2));
        }

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
