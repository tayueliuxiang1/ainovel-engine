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

    await bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click({ force: true });
    await page.waitForTimeout(4000);

    const draftTab = page.locator('text=草稿箱').first();
    await draftTab.click();
    await page.waitForTimeout(3000);

    // 点击第一个草稿的标题进入编辑
    const firstDraft = page.locator('text=第4章 测试章节标题').first();
    if (await firstDraft.isVisible()) {
        console.log("Clicking on draft...");
        await firstDraft.click();
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

        const shot = path.resolve(__dirname, '../assets/draft_editor_opened.png');
        await editorPage.screenshot({ path: shot, fullPage: true });
        console.log("Draft editor screenshot:", shot);

        // 检查草稿页面所有按钮文字
        const btns = await editorPage.evaluate(() => {
            return Array.from(document.querySelectorAll('button, a, span, .arco-btn')).map(b => b.innerText.trim()).filter(Boolean);
        });
        console.log("Buttons on draft editor:", Array.from(new Set(btns)));
    }

    await context.close();
})();
