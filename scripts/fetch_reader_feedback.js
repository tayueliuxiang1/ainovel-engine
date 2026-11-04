const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const outputFile = path.resolve(__dirname, '../02_memories/reader_feedback.json');

(async () => {
    console.log('[数据闭环引擎] 启动读者反馈与平台数据采集流水线...');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        await simulateHumanMouseMove(page);

        console.log('抓取作品管理中心数据看板...');
        const bookCards = page.locator('.book-card, .novel-item, .card, .book-item');
        const count = await bookCards.count();
        console.log('检测到管理书籍卡片数量: ' + count);

        const feedbackData = {
            fetch_time: new Date().toLocaleString(),
            platform: '番茄小说',
            books: [],
            sentiment_summary: {
                overall_status: '数据采集就绪',
                suggestions_for_next_batch: '继续保持单章高爽点反差与四幕式结构，关注前三屏读者留存'
            }
        };

        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const card = bookCards.nth(i);
                const title = await card.locator('.book-name, .title, .book-title').innerText().catch(() => '未知作品');
                const status = await card.locator('.book-status, .status').innerText().catch(() => '连载中');
                console.log('书籍 ' + (i + 1) + ': ' + title + ' (' + status + ')');
                feedbackData.books.push({ title, status });
            }
        }

        fs.writeFileSync(outputFile, JSON.stringify(feedbackData, null, 2), 'utf8');
        console.log('[数据闭环引擎] 读者与平台反馈数据已成功同步至: ' + outputFile);

    } catch (e) {
        console.error('采集异常:', e.message);
    } finally {
        await context.close();
    }
})();
