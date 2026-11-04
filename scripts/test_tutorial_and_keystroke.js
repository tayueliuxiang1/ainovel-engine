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

    // 1. 处理新手引导步骤 (1/3 -> 2/3 -> 3/3)
    console.log("👉 处理新手引导弹窗...");
    for (let step = 0; step < 5; step++) {
        const guideBtn = editorPage.locator('.byte-popover-content button:has-text("下一步"), .serial-guide button:has-text("下一步"), div[role="tooltip"] button:has-text("下一步"), button:has-text("完成"), button:has-text("我知道了")').first();
        if (await guideBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`   点击引导步骤按钮: ${await guideBtn.innerText()}`);
            await guideBtn.click();
            await editorPage.waitForTimeout(600);
        } else {
            break;
        }
    }

    // 2. 填写章节序号
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
    }

    // 3. 填写章节标题
    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();

    // 4. 正文注入
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

    const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
    await mainEditor.click();
    await editorPage.waitForTimeout(300);

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

    await editorPage.waitForTimeout(1000);

    // 5. 触发实际键盘按键 (空格 + 退格) 激活 ProseMirror 内部监听
    console.log("👉 触发键盘敲击激活编辑器监听...");
    await mainEditor.click();
    await editorPage.keyboard.press('End');
    await editorPage.keyboard.type('。');
    await editorPage.waitForTimeout(500);
    await editorPage.keyboard.press('Backspace');
    await editorPage.waitForTimeout(1500);

    // 6. 检查状态
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

    const shotPath = path.resolve(__dirname, '../assets/test_tutorial_dismissed.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    await context.close();
})();
