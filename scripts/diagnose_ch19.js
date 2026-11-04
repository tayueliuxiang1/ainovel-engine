const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1", { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 填入 19
    const inputs = page.locator('input');
    await inputs.nth(0).fill('19');
    await inputs.nth(1).fill('负二层废弃太平间：当无头女尸要求接生，先开一张死亡证明！');

    const editor = page.locator('.serial-editor-content .ProseMirror').first();
    await editor.click();
    const chap19File = path.resolve(__dirname, '../03_chapters/chapter_019.md');
    const text = fs.readFileSync(chap19File, 'utf8').split('\n').filter(l => !l.startsWith('# ') && !l.includes('---')).join('\n').trim();
    await editor.evaluate((el, bodyText) => {
        el.innerHTML = bodyText.split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`).join('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, text);

    await page.waitForTimeout(2000);

    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    console.log("Clicking next button...");
    await nextBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Check all visible text on the page
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("Body text on page after click next:");
    console.log(bodyText);

    // Check all dialogs/modals
    const modals = await page.locator('.arco-modal, [role="dialog"], .arco-message, .arco-notification, .byte-modal').allInnerTexts().catch(() => []);
    console.log("All modals/messages found:", modals);

    await context.close();
})();
