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

    await bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节")').first().click({ force: true });
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

    const chapInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await chapInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chapInput.click();
        await chapInput.fill('4');
        await chapInput.blur();
    }
    const titleLocator = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleLocator.click();
    await titleLocator.fill('第4章：隔壁 403 的半夜歌声，与一张天价水费单');
    await titleLocator.blur();

    const chapFile = path.resolve(__dirname, '../03_chapters/chapter_004.md');
    const rawContent = fs.readFileSync(chapFile, 'utf8');
    const paragraphs = rawContent.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => `<p>${l.trim()}</p>`).join('');

    await editorPage.evaluate((html) => {
        const el = document.querySelector('.serial-editor-content .ProseMirror, .ProseMirror');
        if (el) {
            el.innerHTML = html;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, paragraphs);

    const saveBtn = editorPage.locator('button:has-text("存草稿")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await editorPage.waitForTimeout(2000);
    }

    const nextBtn = editorPage.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click({ force: true });
    await editorPage.waitForTimeout(2500);

    const typoModal = editorPage.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
    if (await typoModal.isVisible().catch(() => false)) {
        await typoModal.locator('button:has-text("提交"), button:has-text("确定")').first().click();
        await editorPage.waitForTimeout(1500);
    }

    const riskModal = editorPage.locator('[role="dialog"]:has-text("请选择内容检测方式"), .arco-modal:has-text("基础检测")').first();
    if (await riskModal.isVisible().catch(() => false)) {
        const basicBtn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测")').first();
        if (await basicBtn.isVisible().catch(() => false)) await basicBtn.click();
        await editorPage.waitForTimeout(2000);
    }

    // 点击“否”
    const noRadio = editorPage.locator('.publish-confirm-container-new .arco-radio:has-text("否")').first();
    if (await noRadio.isVisible()) {
        console.log("Clicking '否' for AI...");
        await noRadio.click();
        await editorPage.waitForTimeout(1500);
    }

    // 再次 dump modal
    const afterRadioHtml = await editorPage.evaluate(() => {
        const m = document.querySelector('.publish-confirm-container-new');
        return m ? m.innerHTML : "Not found";
    });
    fs.writeFileSync(path.resolve(__dirname, '../assets/modal_after_radio.html'), afterRadioHtml, 'utf8');

    // 检查页面上所有文字
    const pageAllText = await editorPage.evaluate(() => document.body.innerText);
    console.log("=== MODAL AFTER RADIO TEXT ===");
    console.log(pageAllText.slice(pageAllText.indexOf('发布设置'), pageAllText.indexOf('发布设置') + 500));

    await context.close();
})();
