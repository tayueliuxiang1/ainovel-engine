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

    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 30000 });

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节"), button:has-text("新建章节"), a:has-text("新建章节"), button:has-text("写新章节"), a:has-text("写新章节")').first();
    await createBtn.click({ force: true });

    let targetPage = page;
    for (let i = 0; i < 15; i++) {
        for (const p of context.pages()) {
            if (p.url().includes('/publish/')) {
                targetPage = p;
                break;
            }
        }
        if (targetPage !== page) break;
        await page.waitForTimeout(1000);
    }

    console.log("URL:", targetPage.url());
    await targetPage.waitForTimeout(2000);

    // 填入 20
    const inputs = targetPage.locator('input');
    await inputs.nth(0).fill('20');
    await inputs.nth(1).fill('护士长送毒药大补汤？无证假药直接查封！'); // 20 chars

    const editor = targetPage.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();
    const rawContent = fs.readFileSync(path.resolve(__dirname, '../03_chapters/chapter_020.md'), 'utf8');
    const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    await targetPage.waitForTimeout(2000);
    await targetPage.screenshot({ path: path.resolve(__dirname, '../assets/debug_ch20_1.png') });

    const nextBtn = targetPage.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click();
    console.log("Clicked next button!");

    for (let s = 1; s <= 10; s++) {
        await targetPage.waitForTimeout(1000);
        await targetPage.screenshot({ path: path.resolve(__dirname, `../assets/debug_ch20_step_${s}.png`) });
        const modals = await targetPage.locator('.arco-modal, [role="dialog"], .arco-message, .arco-notification').allInnerTexts().catch(() => []);
        console.log(`Sec ${s} modals:`, modals);
        if (modals.some(m => m.includes('发布设置'))) {
            console.log("Found publish modal!");
            const noAi = targetPage.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAi.isVisible()) await noAi.click();
            const confirmBtn = targetPage.locator('.arco-modal button:has-text("确认提交"), .arco-modal button:has-text("提交")').first();
            await confirmBtn.click();
            console.log("Clicked confirm submit!");
            await targetPage.waitForTimeout(4000);
            await targetPage.screenshot({ path: path.resolve(__dirname, '../assets/debug_ch20_final.png') });
            break;
        } else if (modals.some(m => m.includes('发布提示') || m.includes('错别字'))) {
            const btn = targetPage.locator('.arco-modal button.arco-btn-primary, .arco-modal button:has-text("提交")').first();
            if (await btn.isVisible()) {
                await btn.click();
                console.log("Clicked submit on typo modal!");
            }
        } else if (modals.some(m => m.includes('检测'))) {
            const btn = targetPage.locator('.arco-modal button:has-text("基础检测"), .arco-modal button:has-text("确定")').first();
            if (await btn.isVisible()) {
                await btn.click();
                console.log("Clicked basic on risk modal!");
            }
        }
    }

    await context.close();
})();
