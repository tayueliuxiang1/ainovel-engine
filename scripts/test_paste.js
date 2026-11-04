const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write']
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

    // 关闭任何引导遮罩
    await editorPage.keyboard.press('Escape');
    await editorPage.waitForTimeout(500);

    // 聚焦编辑器
    const pm = editorPage.locator('.ProseMirror');
    await pm.click();
    await editorPage.waitForTimeout(500);

    // 测试 1: 直接键盘输入几个字
    console.log("Testing keyboard.type...");
    await editorPage.keyboard.type("这是测试文字一二三四五");
    await editorPage.waitForTimeout(1000);

    let wordCount = await editorPage.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/正文字数\s*(\d+)/);
        return match ? match[1] : 'not found';
    });
    console.log("Word count after keyboard.type:", wordCount);

    // 测试 2: 剪贴板粘贴
    console.log("Testing paste event...");
    const longText = "这是通过粘贴注入的一大段测试内容，用于验证番茄编辑器的字数统计组件是否能够正确响应剪贴板事件。如果字数统计发生变化，则证明粘贴方式完全可行！";
    
    // 使用 evaluate 派发包含 clipboardData 的 paste 事件
    await editorPage.evaluate((pasteContent) => {
        const pmEl = document.querySelector('.ProseMirror');
        pmEl.focus();
        const dt = new DataTransfer();
        dt.setData('text/plain', pasteContent);
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        pmEl.dispatchEvent(pasteEvent);
    }, longText);

    await editorPage.waitForTimeout(2000);

    wordCount = await editorPage.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/正文字数\s*(\d+)/);
        return match ? match[1] : 'not found';
    });
    console.log("Word count after DataTransfer paste:", wordCount);

    const shotPath = path.resolve(__dirname, '../assets/test_paste_result.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    await context.close();
})();
