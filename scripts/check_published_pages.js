// 准确抓取已发布全部页面
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

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

    console.log('导航进入作品管理列表...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    // 抓取第1页的已发布章节
    const p1 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('=== 已发布 第1页 (' + p1.length + ' 条) ===');
    p1.forEach((r, idx) => console.log((idx + 1) + ': ' + r));

    // 点击第2页
    console.log('正在切换到第 2 页...');
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.arco-pagination-item'));
        const p2 = items.find(el => el.innerText.trim() === '2');
        if (p2) p2.click();
    });
    await page.waitForTimeout(4000);

    const p2 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('=== 已发布 第2页 (' + p2.length + ' 条) ===');
    p2.forEach((r, idx) => console.log((idx + 1) + ': ' + r));

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
