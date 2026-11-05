const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    try {
        const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: true,
            channel: 'chrome',
            viewport: { width: 1440, height: 900 }
        });
        const page = context.pages()[0] || await context.newPage();
        
        // 抹除自动化驱动特征
        await applyStealthEvasions(page);
        
        let foundBooks = [];
        
        // 监听所有响应
        page.on('response', async (res) => {
            const url = res.url();
            if (url.includes('/api/') || url.includes('book') || url.includes('author')) {
                try {
                    const text = await res.text();
                    if (text.includes('大唐') || text.includes('抗旱') || text.includes('book_id') || text.includes('book_name')) {
                        console.log(`[API 命中] ${url}`);
                        try {
                            const json = JSON.parse(text);
                            console.log(`[响应数据预览] ${text.slice(0, 500)}`);
                        } catch (_) {}
                    }
                } catch (_) {}
            }
        });
        
        console.log("导航至番茄作家作品列表...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded', timeout: 35000 });
        await page.waitForTimeout(8000);
        
        // 如果依然没有触发，尝试直接调用 API 获取
        const apiData = await page.evaluate(async () => {
            try {
                // 尝试抓取番茄作家作品列表接口
                const res = await fetch('/api/author/book/list/v1?page=1&page_size=20', { credentials: 'include' });
                return await res.json();
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log("主动请求 /api/author/book/list/v1 结果:\n", JSON.stringify(apiData, null, 2));
        
        const apiData2 = await page.evaluate(async () => {
            try {
                const res = await fetch('/api/author/book/work_list/v1?page=1&size=20', { credentials: 'include' });
                return await res.json();
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log("主动请求 work_list 结果:\n", JSON.stringify(apiData2, null, 2));

        await context.close();
    } catch (e) {
        console.error("执行异常:", e.message);
    }
})();
