const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const matches = await page.evaluate(() => {
        const res = [];
        const tags = ['a', 'button', 'span', 'div'];
        tags.forEach(tag => {
            const elements = document.getElementsByTagName(tag);
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if ((el.innerText || '').trim() === '章节管理') {
                    res.push({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        href: el.getAttribute('href') || '',
                        parentTag: el.parentElement ? el.parentElement.tagName : '',
                        parentClass: el.parentElement ? el.parentElement.className : '',
                        parentText: el.parentElement ? el.parentElement.innerText.slice(0, 80) : ''
                    });
                }
            }
        });
        return res;
    });

    console.log('所有【章节管理】按钮/元素:', JSON.stringify(matches, null, 2));

    await context.close();
})();
