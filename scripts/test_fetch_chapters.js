const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

const BOOK_ID = '7704518175408278552';

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    // 先进入一个有效后台页面建立 session
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);

    // 测试常见的番茄作家接口
    const apiTestResults = await page.evaluate(async (bid) => {
        const endpoints = [
            '/api/author/book/chapter/list/v1/?book_id=' + bid,
            '/api/author/chapter/list/v1/?book_id=' + bid,
            '/api/author/book/chapter_list/v0/?book_id=' + bid,
            '/api/author/book/item_list/v0/?book_id=' + bid,
            '/api/author/book/detail/v0/?book_id=' + bid,
            '/api/author/book/info/v0/?book_id=' + bid,
            '/api/author/chapter/detail/v1/?book_id=' + bid
        ];
        const results = [];
        for (const ep of endpoints) {
            try {
                const res = await fetch(ep, { credentials: 'include' });
                const text = await res.text();
                let json = null;
                try { json = JSON.parse(text); } catch (e) {}
                results.push({
                    endpoint: ep,
                    status: res.status,
                    snippet: text.slice(0, 300),
                    dataCount: json && json.data ? (Array.isArray(json.data) ? json.data.length : Object.keys(json.data).length) : null
                });
            } catch (err) {
                results.push({ endpoint: ep, error: err.message });
            }
        }
        return results;
    }, BOOK_ID);

    console.log('API 探测结果:\n', JSON.stringify(apiTestResults, null, 2));

    await context.close();
})();
