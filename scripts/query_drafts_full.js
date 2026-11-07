// 完整抓取草稿箱所有条目
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
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const card = page.locator('.completion-book-item-main, div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    // 点击草稿箱
    console.log('点击草稿箱标签...');
    const draftTab = page.locator('div, span, a').filter({ hasText: /^草稿箱/ }).first();
    await draftTab.click();
    await page.waitForTimeout(3000);

    // 抓取草稿箱第1页
    const d1 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('=== 草稿箱 第1页 (' + d1.length + ' 条) ===');
    d1.forEach((r, idx) => console.log((idx + 1) + ': ' + r));

    // 检查草稿箱是否有第2页
    const hasP2 = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.arco-pagination-item'));
        return items.some(el => el.innerText.trim() === '2');
    });

    if (hasP2) {
        console.log('草稿箱存在第 2 页，正在切换...');
        await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.arco-pagination-item'));
            const p2 = items.find(el => el.innerText.trim() === '2');
            if (p2) p2.click();
        });
        await page.waitForTimeout(3000);
        const d2 = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
        });
        console.log('=== 草稿箱 第2页 (' + d2.length + ' 条) ===');
        d2.forEach((r, idx) => console.log((idx + 1) + ': ' + r));
    } else {
        console.log('草稿箱无第 2 页');
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
