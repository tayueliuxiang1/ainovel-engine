// 探查草稿箱每行元素及操作按钮
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
    await page.waitForTimeout(3000);

    const card = page.locator('.completion-book-item-main, div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    // 点击草稿箱
    const draftTab = page.locator('.arco-tabs-header-title').filter({ hasText: '草稿箱' }).first();
    await draftTab.click();
    await page.waitForTimeout(3000);

    // 检查表格中所有的按钮和链接
    const rowDetails = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map((tr, idx) => {
            const cells = Array.from(tr.querySelectorAll('td'));
            const text = tr.innerText.trim().replace(/\n+/g, ' | ');
            const buttons = Array.from(tr.querySelectorAll('button, a, span[role="button"]')).map(b => ({
                text: b.innerText.trim(),
                cls: b.className,
                tag: b.tagName
            }));
            return { idx: idx + 1, text, buttons };
        });
    });

    console.log('草稿箱表格前 5 行详情:');
    console.log(JSON.stringify(rowDetails.slice(0, 5), null, 2));

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
