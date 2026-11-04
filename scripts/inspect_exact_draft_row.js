const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });

    await bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click({ force: true });
    await page.waitForTimeout(4000);

    const draftTab = page.locator('text=草稿箱').first();
    await draftTab.click();
    await page.waitForTimeout(3000);

    // 抓取草稿列表每一行的完整 HTML
    const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr, .arco-table-tr'));
        return trs.map(tr => ({
            text: tr.innerText.replace(/\n+/g, ' | '),
            html: tr.innerHTML
        }));
    });
    console.log("=== DRAFT ROWS ===");
    rows.forEach((r, idx) => {
        console.log(`Row ${idx}: ${r.text}`);
    });

    await context.close();
})();
