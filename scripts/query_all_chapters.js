// 准确查询番茄作家后台所有已发布章节脚本
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();

    console.log('正在导航进入作品管理列表...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(6000);

    console.log('已到达章节管理真实URL:', page.url());

    // 抓取当前页面所有章节条目与状态
    const result = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.chapter-item, tbody tr, .arco-table-tr, div[class~="chapter-list-item"]'));
        const lines = [];
        items.forEach(el => {
            const txt = (el.innerText || '').trim().replace(/\n+/g, ' | ');
            if (txt.length > 0) lines.push(txt);
        });

        // 尝试抓取纯文本中的章节名
        const allText = document.body.innerText || '';
        const chapMatches = allText.match(/第[一二三四五六七八九十百0-9]+章[^\n|]+/g) || [];

        // 抓取统计数字
        const summaryElems = Array.from(document.querySelectorAll('div, span, p')).filter(e => {
            const t = e.innerText || '';
            return t.includes('已发布') || t.includes('总字数') || t.includes('共') && t.includes('章');
        }).map(e => e.innerText.trim().replace(/\n+/g, ' '));

        return {
            tableRows: lines,
            foundChapters: Array.from(new Set(chapMatches)),
            summaries: Array.from(new Set(summaryElems)).slice(0, 10)
        };
    });

    console.log('\n=== 概要统计信息 ===');
    result.summaries.forEach(s => console.log(s));

    console.log('\n=== 表格行条目 (前 20 条) ===');
    result.tableRows.slice(0, 20).forEach((r, i) => console.log((i + 1) + ': ' + r));

    console.log('\n=== 匹配到的章节名称 (' + result.foundChapters.length + ' 个) ===');
    result.foundChapters.forEach((c, i) => console.log((i + 1) + ': ' + c));

    // 保存最新高清截图
    const shotPath = path.join(__dirname, '..', 'assets', 'backend_verified_chapters.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('\n最新验证截图存入:', shotPath);

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
