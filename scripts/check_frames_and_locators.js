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

    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    const frames = page.frames();
    console.log('检测到的 frame 数量:', frames.length);
    frames.forEach((f, idx) => {
        console.log(`frame [${idx}]: url=${f.url()}, name=${f.name()}`);
    });

    // 检查 Playwright locator 能否找到文本
    const manageLocator = page.locator('text=章节管理');
    const count = await manageLocator.count();
    console.log('locator("text=章节管理") 数量:', count);

    for (let i = 0; i < count; i++) {
        const item = manageLocator.nth(i);
        const isVis = await item.isVisible();
        const box = await item.boundingBox();
        console.log(`章节管理 [${i}]: visible=${isVis}, box=`, box);
    }

    await context.close();
})();
