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
        console.log("进入干净编辑器...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 探测所有 input 和 contenteditable 元素
        const inputsInfo = await page.evaluate(() => {
            const res = [];
            document.querySelectorAll('input, [contenteditable="true"]').forEach((el, idx) => {
                res.push({
                    idx,
                    tag: el.tagName,
                    placeholder: el.getAttribute('placeholder') || '',
                    className: el.className,
                    contenteditable: el.getAttribute('contenteditable') || '',
                    value: el.value || el.innerText || ''
                });
            });
            return res;
        });
        console.log("编辑器可编辑输入元素列表:\n", JSON.stringify(inputsInfo, null, 2));

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
