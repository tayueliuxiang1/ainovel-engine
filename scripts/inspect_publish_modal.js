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

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节"), button:has-text("新建章节"), a:has-text("新建章节")').first();
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

    // 填入简单正文以激活下一步
    const chapInput = editorPage.locator('input.serial-input:not([placeholder])').first();
    if (await chapInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chapInput.click();
        await chapInput.fill('4');
        await chapInput.blur();
    }
    const titleLocator = editorPage.locator('input[placeholder*="请输入标题"]').first();
    await titleLocator.click();
    await titleLocator.fill('测试章节标题');
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
        await editorPage.waitForTimeout(2500);
    }

    const nextBtn = editorPage.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
    await nextBtn.click({ force: true });
    await editorPage.waitForTimeout(2000);

    // 检查错别字或检测弹窗
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

    // 此时应当出现“发布设置”弹窗！
    const shotPath = path.resolve(__dirname, '../assets/publish_settings_modal.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    const publishModalInfo = await editorPage.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.arco-modal, [role="dialog"]'));
        const modal = modals.find(m => m.innerText && m.innerText.includes('发布设置')) || modals[0];
        if (!modal) return "No modal";
        return {
            title: modal.innerText.slice(0, 500),
            radioOptions: Array.from(modal.querySelectorAll('.arco-radio, label, input[type="radio"], [role="radio"]')).map(r => r.innerText || r.value),
            inputs: Array.from(modal.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder, value: i.value })),
            buttons: Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim())
        };
    });

    console.log("Publish Modal Info:", JSON.stringify(publishModalInfo, null, 2));

    await context.close();
})();
