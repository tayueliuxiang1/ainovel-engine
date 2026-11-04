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
        viewport: { width: 1440, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write']
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

    // 1. 序号
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
    }

    // 2. 标题
    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();

    // 3. 读取正文
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

    // 4. 写入剪贴板并通过 Control+v 粘贴
    console.log("👉 写入剪贴板并通过 Control+v 粘贴到编辑器...");
    await editorPage.evaluate((text) => navigator.clipboard.writeText(text), cleanBody);

    const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
    await mainEditor.click();
    await editorPage.waitForTimeout(300);

    await editorPage.keyboard.press('Control+v');
    await editorPage.waitForTimeout(3000);

    // 5. 检查字数显示
    const countInfo = await editorPage.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/正文字数\s*(\d+)/);
        const nextBtn = document.querySelector('button.publish-button, button.auto-editor-next');
        return {
            wordCountMatch: match ? match[0] : 'not found',
            nextBtnDisabled: nextBtn ? nextBtn.classList.contains('arco-btn-disabled') || nextBtn.disabled : null
        };
    });

    console.log("=== COUNT AFTER CLIPBOARD PASTE ===");
    console.log(JSON.stringify(countInfo, null, 2));

    const shotPath = path.resolve(__dirname, '../assets/test_ctrl_v_result.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    await context.close();
})();
