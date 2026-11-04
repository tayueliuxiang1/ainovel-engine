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

    console.log("Navigating to book-manage...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });
    console.log("Found book card!");

    // 直接点击该卡片中的“创建章节”按钮
    console.log("Clicking '创建章节' on novel card...");
    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节")').first();
    await createBtn.click();
    await page.waitForTimeout(5000);

    console.log("Pages count:", context.pages().length);
    let editorPage = page;
    for (const p of context.pages()) {
        console.log("Page URL:", p.url());
        if (p.url().includes('/publish/')) {
            editorPage = p;
            break;
        }
    }

    await editorPage.bringToFront();
    await editorPage.waitForTimeout(3000);

    const shotPath = path.resolve(__dirname, '../assets/editor_page_opened.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Editor screenshot saved to:", shotPath);

    const editorInputs = await editorPage.evaluate(() => {
        return Array.from(document.querySelectorAll('input, [contenteditable="true"], button')).map(el => ({
            tag: el.tagName,
            placeholder: el.getAttribute('placeholder') || '',
            text: el.innerText.trim(),
            className: el.className
        })).filter(x => x.placeholder || (x.text && x.text.length < 30));
    });

    console.log("=== EDITOR INPUTS / BUTTONS ===");
    console.log(JSON.stringify(editorInputs, null, 2));

    await context.close();
})();
