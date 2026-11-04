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
    await createBtn.click({ force: true });
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

    // 检查所有页面文本看是否有“定时”或“预约”
    const allText = await editorPage.evaluate(() => document.body.innerText);
    console.log("Has '定时' in editor page?", allText.includes('定时'));
    console.log("Has '预约' in editor page?", allText.includes('预约'));

    // 填入章节号与标题
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

    // 注入正文
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

    // 点击存草稿触发更新
    const saveBtn = editorPage.locator('button:has-text("存草稿")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await editorPage.waitForTimeout(2000);
    }

    // 搜索整个编辑器页面里所有按钮和标签
    const buttons = await editorPage.evaluate(() => {
        return Array.from(document.querySelectorAll('button, span, div, a, label')).map(el => ({
            tag: el.tagName,
            text: el.innerText ? el.innerText.trim() : '',
            className: el.className
        })).filter(x => x.text && (x.text.includes('定时') || x.text.includes('预约') || x.text.includes('发布')));
    });
    console.log("=== BUTTONS WITH TIMED / PUBLISH ===");
    console.log(JSON.stringify(buttons, null, 2));

    // 点击下一步
    const nextBtn = editorPage.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click({ force: true });
    await editorPage.waitForTimeout(2500);

    // 错别字弹窗
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

    // 现在查看发布设置弹窗
    const modalShot = path.resolve(__dirname, '../assets/inspect_publish_modal_detailed.png');
    await editorPage.screenshot({ path: modalShot, fullPage: true });
    console.log("Modal screenshot saved to:", modalShot);

    const modalDetails = await editorPage.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.arco-modal, [role="dialog"], .arco-modal-wrapper'));
        return modals.map(m => ({
            html: m.innerHTML,
            text: m.innerText
        }));
    });
    console.log("=== MODAL DETAILS COUNT ===", modalDetails.length);
    if (modalDetails.length > 0) {
        console.log("Modal text:\n", modalDetails[0].text);
        fs.writeFileSync(path.resolve(__dirname, '../assets/modal_dump.html'), modalDetails[0].html, 'utf8');
    }

    await context.close();
})();
