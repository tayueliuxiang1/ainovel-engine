const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    try {
        const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: true,
            channel: 'chrome',
            viewport: { width: 1280, height: 800 }
        });
        const page = context.pages()[0] || await context.newPage();
        
        console.log("正在导航到作品管理页...");
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'networkidle', timeout: 35000 });
        await page.waitForTimeout(5000);
        
        const screenshotPath = path.resolve(__dirname, '../assets/fanqie_page_inspect.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`页面截图已保存至: ${screenshotPath}`);
        
        // 打印页面上所有的文本内容（前1000字符）
        const textContent = await page.evaluate(() => document.body.innerText);
        console.log("页面文本内容预览:\n" + textContent.slice(0, 800));
        
        await context.close();
    } catch (err) {
        console.error("排查出错:", err.message);
        process.exit(1);
    }
})();
