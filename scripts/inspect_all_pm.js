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

    const pmDetails = await editorPage.evaluate(() => {
        const allPm = Array.from(document.querySelectorAll('.ProseMirror'));
        return allPm.map((pm, idx) => {
            const rect = pm.getBoundingClientRect();
            // 向上获取主要父级容器的类名
            let parents = [];
            let p = pm.parentElement;
            for (let i = 0; i < 4 && p; i++) {
                parents.push(`${p.tagName.toLowerCase()}.${Array.from(p.classList).join('.')}`);
                p = p.parentElement;
            }
            return {
                idx,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                visible: rect.width > 0 && rect.height > 0,
                innerTextSnippet: pm.innerText.slice(0, 50),
                parents: parents.join(' > ')
            };
        });
    });

    console.log("=== PROSEMIRROR ELEMENTS DETAILS ===");
    console.log(JSON.stringify(pmDetails, null, 2));

    await context.close();
})();
