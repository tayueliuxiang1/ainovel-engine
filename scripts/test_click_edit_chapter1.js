const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '大唐：盗我抗旱图';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    console.log('1. 进入 book-manage...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    console.log('2. 定位第1章的修改链接并点击...');
    const editChap1 = page.locator('a[href^="/main/writer/7704518175408278552/publish/7704528770274689560"]').first();
    await editChap1.waitFor({ timeout: 15000 });
    await editChap1.click();
    console.log('已点击第1章修改链接，等待编辑器加载...');
    await page.waitForTimeout(6000);

    console.log('当前 URL:', page.url());

    // 检查编辑器组件是否可见
    const editor = page.locator('.serial-editor-content, .ProseMirror');
    const isEditorVis = await editor.first().isVisible().catch(() => false);
    console.log('编辑器是否可见:', isEditorVis);

    // 检查序号与标题输入框
    const inputs = page.locator('input');
    const count = await inputs.count();
    console.log('输入框数量:', count);
    if (count >= 2) {
        console.log('序号输入框值:', await inputs.nth(0).inputValue());
        console.log('标题输入框值:', await inputs.nth(1).inputValue());
    }

    // 检查右上角有哪些按钮
    const topButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 20);
    });
    console.log('当前页面可见按钮:\n', topButtons);

    await page.screenshot({ path: 'assets/chapter1_edit_page.png', fullPage: true });
    await context.close();
})();
