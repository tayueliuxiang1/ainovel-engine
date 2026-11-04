const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节")').first();
    await createBtn.click();
    await page.waitForTimeout(4000);

    let editorPage = page;
    for (const p of context.pages()) {
        if (p.url().includes('/publish/')) {
            editorPage = p;
            break;
        }
    }
    await editorPage.bringToFront();
    await editorPage.waitForTimeout(2000);

    // 填入序号和标题
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
    }

    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();

    // 填入正文
    const stagedFile = path.resolve(__dirname, '../.chapter-staged.txt');
    const rawText = fs.existsSync(stagedFile) 
        ? fs.readFileSync(stagedFile, 'utf8') 
        : "测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文测试正文";

    const paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p !== '');
    const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

    await editorPage.evaluate((html) => {
        const el = document.querySelector('.ProseMirror, .ql-editor, [contenteditable="true"]');
        if (el) {
            el.innerHTML = html;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur();
        }
    }, htmlContent);

    await editorPage.waitForTimeout(2000);

    const shotPath = path.resolve(__dirname, '../assets/test_editor_filled.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot of filled editor saved to:", shotPath);

    const nextBtnState = await editorPage.evaluate(() => {
        const btn = document.querySelector('button.publish-button, button:has-text("下一步")');
        return {
            exists: !!btn,
            disabled: btn ? (btn.disabled || btn.classList.contains('arco-btn-disabled')) : null,
            classes: btn ? btn.className : '',
            text: btn ? btn.innerText : ''
        };
    });
    console.log("Next button state:", JSON.stringify(nextBtnState, null, 2));

    await context.close();
})();
