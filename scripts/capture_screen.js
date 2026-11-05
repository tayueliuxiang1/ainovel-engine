const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    try {
        const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: true,
            channel: 'chrome',
            viewport: { width: 1440, height: 900 }
        });
        const page = context.pages()[0] || await context.newPage();
        
        console.log("访问作品管理并等待渲染...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(6000);
        
        // 截图
        const screenshotPath = path.resolve(__dirname, '../assets/fanqie_screen.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`截图已保存: ${screenshotPath}`);
        
        // 获取页面主要区域的文本
        const mainText = await page.evaluate(() => {
            const container = document.querySelector('.main-content, .layout-content, .content, main') || document.body;
            return container.innerText;
        });
        console.log("主要区域文本:\n" + mainText);
        
        await context.close();
    } catch (e) {
        console.error("执行异常:", e.message);
    }
})();
