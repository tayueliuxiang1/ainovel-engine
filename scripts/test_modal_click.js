const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

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

    // Fill title
    const inputs = page.locator('input');
    await inputs.nth(0).fill('24');
    await inputs.nth(1).fill('午夜四路幽灵末班车靠站，上车先刷老年卡！');

    // Fill body
    const editor = page.locator('.serial-editor-content .ProseMirror').first();
    await editor.click();
    const chap24File = path.resolve(__dirname, '../03_chapters/chapter_024.md');
    const text = require('fs').readFileSync(chap24File, 'utf8').split('\n').filter(l => !l.startsWith('# ') && !l.includes('---')).join('\n').trim();
    await editor.evaluate((el, bodyText) => {
        el.innerHTML = bodyText.split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`).join('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, text);

    await page.waitForTimeout(2000);

    // Click next
    const nextBtn = page.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
    console.log("Clicking next button...");
    await nextBtn.click({ force: true });

    // Wait and screenshot every 1 second for 5 seconds
    for (let s = 1; s <= 5; s++) {
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.resolve(__dirname, `../assets/test_step_${s}.png`) });
        const modalText = await page.locator('.arco-modal, [role="dialog"]').allInnerTexts().catch(() => []);
        console.log(`Sec ${s} modals:`, modalText);
    }

    await context.close();
})();
