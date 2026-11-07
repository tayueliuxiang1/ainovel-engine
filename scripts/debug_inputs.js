// 诊断发布页输入框
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

        const inputs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input')).map(inp => ({
                id: inp.id,
                className: inp.className,
                placeholder: inp.placeholder,
                value: inp.value,
                type: inp.type
            }));
        });
        console.log('所有 input 元素:', JSON.stringify(inputs, null, 2));

    } catch (err) {
        console.error('诊断 input 异常:', err);
    } finally {
        await browserContext.close();
    }
}

main();
