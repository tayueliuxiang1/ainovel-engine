const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log("访问章节管理列表...");
        const url = `https://fanqienovel.com/main/writer/book-manage`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        // 点击章节管理
        const chapManage = page.locator('text=章节管理').first();
        if (await chapManage.isVisible().catch(() => false)) {
            await chapManage.click();
            await page.waitForTimeout(4000);
        }

        const shotPath = path.resolve(__dirname, '../assets/all_five_chapters_published.png');
        await page.screenshot({ path: shotPath, fullPage: true });
        console.log("已保存五章完整发布截图: " + shotPath);

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
