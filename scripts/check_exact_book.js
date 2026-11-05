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
        
        console.log("正在访问番茄小说作品管理页面...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        // 查找所有卡片
        const cards = page.locator('.completion-book-item-main');
        const count = await cards.count();
        console.log(`检测到作品卡片数量: ${count}`);
        
        for (let i = 0; i < count; i++) {
            const text = await cards.nth(i).innerText();
            console.log(`卡片 [${i}]:\n${text}\n---------------------------`);
        }
        
        // 如果没有找到卡片，检查整个页面的所有链接和标题
        if (count === 0) {
            console.log("未找到 .completion-book-item-main，检查页面所有可见书名链接...");
            const allLinks = await page.evaluate(() => {
                const res = [];
                document.querySelectorAll('a, button, div, span').forEach(el => {
                    const t = el.innerText ? el.innerText.trim() : '';
                    if (t.includes('大唐') || t.includes('抗旱') || t.includes('书名') || t.includes('作品')) {
                        res.push({ tag: el.tagName, text: t.slice(0, 100) });
                    }
                });
                return res;
            });
            console.log("匹配到的相关元素:", JSON.stringify(allLinks, null, 2));
        }
        
        await context.close();
    } catch (err) {
        console.error("排查出错:", err);
    }
})();
