const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

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

    // 检查 (258, 320) 位置的元素
    const elInfo = await editorPage.evaluate(() => {
        const el = document.elementFromPoint(258, 320);
        return {
            tag: el ? el.tagName : null,
            text: el ? el.innerText : null,
            className: el ? el.className : null,
            outerHTML: el ? el.outerHTML : null,
            parentHTML: el && el.parentElement ? el.parentElement.outerHTML.slice(0, 300) : null
        };
    });

    console.log("Element at (258, 320):", JSON.stringify(elInfo, null, 2));

    // 点击它
    console.log("Clicking element at (258, 320)...");
    await editorPage.mouse.click(258, 320);
    await editorPage.waitForTimeout(1000);

    const shot1 = path.resolve(__dirname, '../assets/test_guide_step2.png');
    await editorPage.screenshot({ path: shot1, fullPage: true });
    console.log("Screenshot after step 1 click saved to:", shot1);

    await context.close();
})();
