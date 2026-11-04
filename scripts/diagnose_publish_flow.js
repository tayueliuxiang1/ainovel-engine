const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    console.log("Navigating to book-manage...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 30000 });

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节"), button:has-text("新建章节"), a:has-text("新建章节"), button:has-text("写新章节"), a:has-text("写新章节")').first();
    await createBtn.click({ force: true });

    let targetPage = page;
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
        for (const p of context.pages()) {
            if (p.url().includes('/publish') || p.url().includes('chapter_edit') || p.url().includes('create')) {
                targetPage = p;
                break;
            }
        }
        if (targetPage !== page) break;
        await page.waitForTimeout(500);
    }
    console.log("Target page URL:", targetPage.url());
    await targetPage.waitForTimeout(3000);

    // Read chapter 18
    const chapFile = path.resolve(__dirname, '../03_chapters/chapter_018.md');
    const lines = fs.readFileSync(chapFile, 'utf8').split('\n');
    let title = "第18章：你说我是精神病？先给我出示你的执业医师资格证！";
    let body = lines.filter(l => !l.startsWith('# ') && !l.includes('---')).join('\n').trim();

    // Fill title
    const titleInputs = targetPage.locator('input.auto-editor-title, input[placeholder*="章节序号"], input[placeholder*="章节名"], input[placeholder*="正文标题"]');
    const count = await titleInputs.count();
    console.log("Title input count:", count);
    if (count >= 2) {
        await titleInputs.nth(0).fill('18');
        await titleInputs.nth(1).fill('你说我是精神病？先给我出示你的执业医师资格证！');
    } else {
        await titleInputs.first().fill(title);
    }

    // Fill content
    const editor = targetPage.locator('.serial-editor-content .ProseMirror, .editor-content, [contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    await editor.click();
    await editor.evaluate((el, text) => {
        el.innerHTML = text.split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`).join('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, body);

    await targetPage.waitForTimeout(2000);
    await targetPage.screenshot({ path: path.resolve(__dirname, '../assets/diag_1_filled.png') });
    console.log("Saved diag_1_filled.png");

    // Click next
    const nextBtn = targetPage.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
    console.log("Next button visible?", await nextBtn.isVisible());
    console.log("Next button disabled?", await nextBtn.getAttribute('disabled'));
    
    // Check if next button has class disabled
    const nextBtnClass = await nextBtn.getAttribute('class');
    console.log("Next button class:", nextBtnClass);

    await nextBtn.click({ force: true });
    console.log("Clicked next button!");
    await targetPage.waitForTimeout(2000);
    await targetPage.screenshot({ path: path.resolve(__dirname, '../assets/diag_2_after_click.png') });
    console.log("Saved diag_2_after_click.png");

    // Check all modals/dialogs/messages
    const dialogs = await targetPage.locator('.arco-modal, [role="dialog"], .arco-message, .arco-notification').allInnerTexts().catch(() => []);
    console.log("Dialogs found:", dialogs);

    await context.close();
})();
