// 诊断页面DOM结构
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

    try {
        const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
        await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 获取所有可见 modal / popover / tooltip
        const info = await page.evaluate(() => {
            const list = Array.from(document.querySelectorAll('.arco-modal, .arco-popover, .arco-tooltip, [role="dialog"], .byte-modal'));
            return list.map(el => ({
                tag: el.tagName,
                className: el.className,
                text: el.innerText.slice(0, 150)
            }));
        });
        console.log('当前可见弹窗数量:', info.length);
        console.log('弹窗详情:', JSON.stringify(info, null, 2));

        // 查找所有按钮
        const btns = await page.evaluate(() => {
            const list = Array.from(document.querySelectorAll('button'));
            return list.map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 30);
        });
        console.log('页面所有按钮:', JSON.stringify(btns));

    } catch (err) {
        console.error('诊断异常:', err);
    } finally {
        await browserContext.close();
    }
}

main();
