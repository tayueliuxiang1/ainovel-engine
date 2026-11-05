const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    try {
        const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: true,
            channel: 'chrome'
        });
        const page = context.pages()[0] || await context.newPage();
        
        console.log("正在访问番茄小说作家后台...");
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000);
        
        const currentUrl = page.url();
        console.log("当前 URL:", currentUrl);
        
        if (currentUrl.includes('login') || currentUrl.includes('passport')) {
            console.log("⚠️ 检测到当前未登录或登录凭证已过期！需要扫码登录。");
            await context.close();
            process.exit(2);
        }
        
        // 获取所有书名
        const books = await page.evaluate(() => {
            const list = [];
            // 尝试查找所有可能包含书名的元素
            const titles = document.querySelectorAll('.book-title, .completion-book-item-main, h2, h3, .title');
            titles.forEach(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                if (text && !list.includes(text)) {
                    list.push(text);
                }
            });
            return list;
        });
        
        console.log("后台图书列表探测结果:");
        console.log(JSON.stringify(books, null, 2));
        
        // 专门查找包含大唐或抗旱的卡片
        const targetBook = await page.evaluate(() => {
            const allText = document.body.innerText;
            const hasDaTang = allText.includes('大唐');
            const hasKangHan = allText.includes('抗旱');
            return { hasDaTang, hasKangHan };
        });
        console.log("关键字匹配结果:", targetBook);
        
        await context.close();
    } catch (err) {
        console.error("执行出错:", err.message);
        process.exit(1);
    }
})();
