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

    // 1. 关闭任何弹窗引导
    await editorPage.keyboard.press('Escape');
    await editorPage.waitForTimeout(500);

    // 2. 填写章节序号 (第 1 章)
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
        console.log("✅ 序号已填入: 1");
    }

    // 3. 填写章节标题
    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();
    console.log("✅ 标题已填入");

    // 4. 从 chapter_001.md 读取纯正文
    const chapFile = path.resolve(__dirname, '../03_chapters/chapter_001.md');
    const rawContent = fs.readFileSync(chapFile, 'utf8');
    const lines = rawContent.split(/\r?\n/);
    let bodyLines = [];
    let isBody = false;
    for (let l of lines) {
        if (l.startsWith('# ')) { isBody = true; continue; }
        if (l.includes('【Editor') || (l.trim() === '---' && isBody)) break;
        if (isBody) bodyLines.push(l);
    }
    const cleanBody = bodyLines.join('\n').trim();

    // 5. 聚焦正文编辑器 (.serial-editor-content .ProseMirror)
    const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
    await mainEditor.click();
    await editorPage.waitForTimeout(500);

    // 6. 使用 DataTransfer 模拟 paste 事件注入纯文本
    console.log("👉 注入正文到 .serial-editor-content .ProseMirror...");
    await editorPage.evaluate((text) => {
        const pmEl = document.querySelector('.serial-editor-content .ProseMirror');
        pmEl.focus();
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        pmEl.dispatchEvent(pasteEvent);
    }, cleanBody);

    await editorPage.waitForTimeout(3000);

    // 7. 检查字数与下一步按钮状态
    const status = await editorPage.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/正文字数\s*(\d+)/);
        const nextBtn = document.querySelector('button.publish-button, button.auto-editor-next');
        return {
            wordCount: match ? match[1] : 'not found',
            nextBtnText: nextBtn ? nextBtn.innerText : 'null',
            nextBtnDisabled: nextBtn ? nextBtn.classList.contains('arco-btn-disabled') || nextBtn.disabled : null
        };
    });

    console.log("=== INJECTION STATUS ===");
    console.log(JSON.stringify(status, null, 2));

    const shotPath = path.resolve(__dirname, '../assets/test_main_editor_injected.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    await context.close();
})();
