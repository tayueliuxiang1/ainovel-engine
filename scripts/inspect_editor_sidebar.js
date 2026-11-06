const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter_1';
    console.log('打开编辑器页面:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 清理新手引导
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal');
        guides.forEach(g => g.remove());
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 检查页面上的所有文本，特别是章节列表、已发布、草稿箱
    const editorInfo = await page.evaluate(() => {
        const res = [];
        const items = document.querySelectorAll('div, li, span, a, button');
        items.forEach(el => {
            const t = el.innerText ? el.innerText.trim() : '';
            if (t.includes('第1章') || t.includes('第2章') || t.includes('第3章') || t.includes('已发布') || t.includes('草稿') || t.includes('目录') || t.includes('章节列表')) {
                res.push({
                    tag: el.tagName,
                    text: t.slice(0, 80),
                    className: el.className
                });
            }
        });
        return {
            fullText: document.body.innerText.slice(0, 1500),
            matched: res.slice(0, 30)
        };
    });

    console.log('编辑器内文本截取:\n', editorInfo.fullText);
    console.log('匹配到的目录/章节元素:', JSON.stringify(editorInfo.matched, null, 2));

    await page.screenshot({ path: 'assets/editor_with_sidebar.png', fullPage: true });
    await context.close();
})();
