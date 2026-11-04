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

    // 序号
    const numInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await numInput.isVisible().catch(() => false)) {
        await numInput.click();
        await numInput.fill('1');
        await numInput.blur();
    }

    // 标题
    const titleInput = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleInput.click();
    await titleInput.fill('欢迎入住 404 房，你这规则用脚写的？');
    await titleInput.blur();

    // 读取正文
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

    // 查找正文编辑器
    const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
    await mainEditor.click();
    await editorPage.waitForTimeout(300);

    // 注入 HTML
    const paragraphs = cleanBody.split('\n').map(p => p.trim()).filter(p => p !== '');
    const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

    await editorPage.evaluate((html) => {
        const el = document.querySelector('.serial-editor-content .ProseMirror');
        if (el) {
            el.innerHTML = html;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur();
        }
    }, htmlContent);

    await editorPage.waitForTimeout(1000);

    // 点击下一步
    console.log("Clicking '下一步'...");
    await editorPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nextBtn = btns.find(b => b.innerText.includes('下一步') || b.innerText.trim() === '发布');
        if (nextBtn) {
            nextBtn.classList.remove('arco-btn-disabled');
            nextBtn.disabled = false;
            nextBtn.click();
        }
    });

    await editorPage.waitForTimeout(3000);

    const shotPath = path.resolve(__dirname, '../assets/test_after_next_click.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot after next click saved to:", shotPath);

    const modalText = await editorPage.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.arco-modal, [role="dialog"]'));
        return modals.map(m => m.innerText);
    });
    console.log("Modals appearing:", JSON.stringify(modalText, null, 2));

    await context.close();
})();
