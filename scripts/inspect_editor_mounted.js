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

    console.log('等待编辑器核心组件挂载...');
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    console.log('编辑器核心组件已成功挂载！');
    await page.waitForTimeout(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('挂载后页面纯文本 (前 1500 字):\n', bodyText.slice(0, 1500));

    // 检查页面上的所有侧边栏或导航菜单
    const sidebarItems = await page.evaluate(() => {
        const res = [];
        const items = document.querySelectorAll('div, li, a, span, button');
        items.forEach(el => {
            const t = el.innerText ? el.innerText.trim() : '';
            if (t.includes('已发布') || t.includes('草稿') || t.includes('回收站') || t.includes('第1章') || t.includes('第2章') || t.includes('第3章') || t.includes('目录')) {
                res.push({
                    text: t.slice(0, 50),
                    tag: el.tagName,
                    className: el.className
                });
            }
        });
        return res;
    });

    console.log('匹配到的侧边栏/目录元素:\n', JSON.stringify(sidebarItems.slice(0, 20), null, 2));

    await page.screenshot({ path: 'assets/mounted_editor.png', fullPage: true });
    await context.close();
})();
