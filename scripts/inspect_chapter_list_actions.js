const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log("Navigating to book-manage...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });

    const chapManageBtn = bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
    await chapManageBtn.click({ force: true });
    await page.waitForTimeout(4000);

    const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr, .arco-table-tr'));
        return trs.map((tr, idx) => {
            const btns = Array.from(tr.querySelectorAll('button, a, svg, span')).map(b => ({
                tag: b.tagName,
                text: b.innerText || '',
                className: String(b.className.baseVal || b.className || ''),
                href: b.getAttribute('href') || ''
            }));
            return {
                idx,
                text: tr.innerText.replace(/\n+/g, ' | ').slice(0, 100),
                buttons: btns.filter(b => b.href || b.className.includes('edit') || b.className.includes('icon') || b.tag === 'BUTTON')
            };
        }).filter(r => r.text.includes('第'));
    });

    console.log("Rows found:", JSON.stringify(rows, null, 2));

    await context.close();
})();
