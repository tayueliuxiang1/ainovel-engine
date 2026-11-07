// 深度检查 warn 截图与发布页面真实阻断点
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await applyStealthEvasions(page);

    console.log('导航进入新建章节...');
    await page.goto('https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // 检查是否有未保存草稿
    const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | '));
    console.log('页面当前文本概要:', bodyText.slice(0, 500));

    // 查看页面上所有的按钮及其位置
    const buttons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, span[role="button"]'));
        return btns.map(b => {
            const rect = b.getBoundingClientRect();
            return {
                text: (b.innerText || '').trim(),
                tag: b.tagName,
                cls: b.className,
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                visible: rect.width > 0 && rect.height > 0
            };
        }).filter(b => b.visible && b.text.length > 0);
    });

    console.log('所有可见按钮:');
    buttons.forEach(b => console.log('  [' + b.tag + '] ' + b.text + ' -> x=' + b.x + ', y=' + b.y + ', w=' + b.w + ', h=' + b.h));

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
