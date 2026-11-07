// 检查草稿箱与章节管理详细信息
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await applyStealthEvasions(page);

    try {
        const manageUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/chapter-manage';
        await page.goto(manageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 查找所有 tab
        const tabs = await page.locator('.arco-tabs-header-cell, [role="tab"]').allInnerTexts().catch(() => []);
        console.log('所有可用 Tab:', JSON.stringify(tabs));

        // 检查当前表格数据
        const rows = await page.locator('.arco-table-tr').allInnerTexts().catch(() => []);
        console.log('当前表格行数:', rows.length);
        rows.slice(0, 12).forEach((r, idx) => {
            console.log('Row ' + (idx + 1) + ': ' + r.replace(/\n+/g, ' | '));
        });

        // 尝试切换到【草稿箱】
        const draftTab = page.locator('.arco-tabs-header-cell, [role="tab"]').filter({ hasText: '草稿' }).first();
        if (await draftTab.isVisible().catch(() => false)) {
            console.log('点击草稿箱 Tab...');
            await draftTab.click({ force: true });
            await page.waitForTimeout(3000);

            const draftRows = await page.locator('.arco-table-tr').allInnerTexts().catch(() => []);
            console.log('草稿箱表格行数:', draftRows.length);
            draftRows.slice(0, 10).forEach((r, idx) => {
                console.log('Draft ' + (idx + 1) + ': ' + r.replace(/\n+/g, ' | '));
            });
        }

    } catch (err) {
        console.error('检查草稿箱异常:', err);
    } finally {
        await browserContext.close();
    }
}

main();
