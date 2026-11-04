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

    // 1. 关闭新手引导 (点击 258, 320 或 ESC)
    await editorPage.mouse.click(258, 320);
    await editorPage.keyboard.press('Escape');
    await editorPage.waitForTimeout(500);

    // 2. 序号
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
    }

    // 3. 标题
    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();

    // 4. 读取第 1 章正文
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

    // 5. 聚焦正文编辑器并使用 execCommand 或 innerHTML
    const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
    await mainEditor.click();
    await editorPage.waitForTimeout(300);

    // 注入富文本段落
    const paragraphs = cleanBody.split('\n').map(p => p.trim()).filter(p => p !== '');
    const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

    await editorPage.evaluate((html) => {
        const el = document.querySelector('.serial-editor-content .ProseMirror');
        if (el) {
            el.innerHTML = html;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, htmlContent);

    // 键盘打入并删去一个符号以触发组件的 dirty 状态
    await editorPage.keyboard.type('。');
    await editorPage.keyboard.press('Backspace');
    await editorPage.waitForTimeout(1000);

    // 6. 点击“存草稿”
    console.log("👉 点击【存草稿】...");
    const saveBtn = editorPage.locator('button:has-text("存草稿")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await editorPage.waitForTimeout(3000);
    }

    // 7. 点击【下一步】
    console.log("👉 尝试原生点击【下一步】按钮...");
    const nextBtn = editorPage.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
    console.log("Next button isVisible:", await nextBtn.isVisible());
    console.log("Next button isEnabled:", await nextBtn.isEnabled());
    
    await nextBtn.click({ force: true });
    await editorPage.waitForTimeout(4000);

    const shotPath = path.resolve(__dirname, '../assets/test_full_next_flow.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    // 检查是否有任何弹窗 (错别字 / 风险检测 / 发布设置)
    const modalDetails = await editorPage.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.arco-modal, [role="dialog"], .byte-modal'));
        return modals.map(m => ({
            className: m.className,
            text: m.innerText.slice(0, 300)
        }));
    });

    console.log("Modals detected:", JSON.stringify(modalDetails, null, 2));

    await context.close();
})();
