// 检查最新的已发布章节列表
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

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

    const p1 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('=== 最新已发布列表 第1页 (' + p1.length + ' 条) ===');
    p1.forEach((r, idx) => console.log((idx + 1) + ': ' + r));

    // 查看总章节数等统计
    const stats = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        return lines.filter(l => l.includes('共') && l.includes('章') || l.includes('已发布') || l.includes('总字数'));
    });
    console.log('\n统计文本:', stats);

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
