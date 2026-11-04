const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '让你遵守规则，你把诡异逼疯了？';

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        await page.goto('https://fanqienovel.com/main/writer/book-manage');
        const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
        await card.waitFor({ timeout: 25000 });
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(4000);

        // 查看第一页第一行的操作按钮
        const firstRow = page.locator('.arco-table-tr').nth(1); // 0通常是表头
        const rowText = await firstRow.innerText().catch(() => '');
        console.log("第一行(最新章节)内容:\n", rowText);

        const actions = await firstRow.locator('button, a').all();
        console.log("第一行可点击按钮数量:", actions.length);
        for (let i = 0; i < actions.length; i++) {
            const txt = await actions[i].innerText().catch(() => '');
            const cls = await actions[i].getAttribute('class').catch(() => '');
            console.log(`按钮[${i}]: text='${txt}', class='${cls}'`);
        }

    } catch (e) {
        console.error("异常:", e.message);
    } finally {
        await context.close();
    }
})();
