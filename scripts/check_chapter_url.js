const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '让你遵守规则，你把诡异逼疯了？';

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, { headless: true, channel: 'chrome' });
    const page = context.pages()[0] || await context.newPage();
    await page.goto('https://fanqienovel.com/main/writer/book-manage');
    const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    const firstRow = page.locator('.arco-table-tr').nth(1);
    const link = firstRow.locator('a, button, span').filter({ hasText: '45' }).first();
    console.log('点击链接文本:', await link.innerText().catch(() => ''));
    await link.click();
    await page.waitForTimeout(4000);
    console.log('当前页面URL:', page.url());

    // 检查页面上是否有标题输入框和富文本编辑器
    const inputs = await page.locator('input').all();
    console.log('输入框数量:', inputs.length);
    for (let i = 0; i < inputs.length; i++) {
        console.log(`输入框[${i}]: val='${await inputs[i].inputValue().catch(() => '')}'`);
    }

    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    console.log('下一步按钮可见性:', await nextBtn.isVisible().catch(() => false));

    await context.close();
})();
