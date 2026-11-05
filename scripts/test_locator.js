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
        console.log("进入页面...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 用 playwright locator 查找文字
        const titleLoc = page.getByPlaceholder('请输入标题');
        console.log("getByPlaceholder('请输入标题') 数量:", await titleLoc.count());

        const saveDraft = page.getByRole('button', { name: '存草稿' });
        console.log("getByRole('button', { name: '存草稿' }) 数量:", await saveDraft.count());

        // 探测所有可见标签与 innerText
        const textElements = await page.evaluate(() => {
            const res = [];
            document.querySelectorAll('div, span, p, input, h1, h2').forEach(el => {
                const t = el.innerText ? el.innerText.trim() : '';
                if (t === '第' || t === '章' || t.includes('请输入标题') || t.includes('存草稿')) {
                    res.push({
                        tag: el.tagName,
                        text: t,
                        html: el.outerHTML.slice(0, 200)
                    });
                }
            });
            return res;
        });
        console.log("找到的相关元素:\n", JSON.stringify(textElements, null, 2));

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
