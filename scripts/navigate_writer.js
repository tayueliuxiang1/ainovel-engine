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
        
        console.log("1. 访问工作台主页...");
        await page.goto("https://fanqienovel.com/main/writer/home", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(6000);
        
        const homeScreenshot = path.resolve(__dirname, '../assets/fanqie_home.png');
        await page.screenshot({ path: homeScreenshot, fullPage: true });
        console.log(`工作台截图已保存: ${homeScreenshot}`);
        
        const homeText = await page.evaluate(() => document.body.innerText);
        console.log("工作台文本摘要 (前800字):\n" + homeText.slice(0, 800));
        
        // 查找所有包含书名的元素
        const booksFound = await page.evaluate(() => {
            const res = [];
            document.querySelectorAll('a, button, div, span, h1, h2, h3, h4').forEach(el => {
                const t = el.innerText ? el.innerText.trim() : '';
                if (t.includes('大唐') || t.includes('抗旱') || t.includes('盗我')) {
                    res.push({ tag: el.tagName, text: t.slice(0, 100), className: el.className });
                }
            });
            return res;
        });
        console.log("工作台搜寻目标书名结果:", JSON.stringify(booksFound, null, 2));
        
        await context.close();
    } catch (e) {
        console.error("异常:", e.message);
    }
})();
