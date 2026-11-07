// 精准检查番茄作家后台章节与草稿状态
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
    await page.waitForTimeout(5000);

    // 检查所有 tab 选择器
    const tabs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.arco-tabs-header-title, .arco-tabs-tab, div[class~="tab"]')).map(e => ({
            text: (e.innerText || '').trim(),
            cls: e.className
        }));
    });
    console.log('所有 Tabs:', JSON.stringify(tabs, null, 2));

    // 查看当前选中的 tab 和表格
    const activeTab = await page.evaluate(() => {
        const active = document.querySelector('.arco-tabs-tab-active, .active');
        return active ? active.innerText.trim() : '未识别active tab';
    });
    console.log('当前激活 Tab:', activeTab);

    // 获取当前表格所有数据
    const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map(tr => (tr.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('当前页面表格 (' + rows.length + ' 行):');
    rows.forEach((r, i) => console.log((i + 1) + ': ' + r));

    // 点击真正带有“草稿箱”文本的 tab
    const realDraftTab = page.locator('.arco-tabs-tab, .arco-tabs-header-title, div, span').filter({ hasText: '草稿箱' }).last();
    if (await realDraftTab.isVisible().catch(() => false)) {
        console.log('点击草稿箱 Tab...');
        await realDraftTab.click();
        await page.waitForTimeout(4000);
        const draftRows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tbody tr'));
            return trs.map(tr => (tr.innerText || '').trim().replace(/\n+/g, ' | '));
        });
        console.log('草稿箱表格内容 (' + draftRows.length + ' 行):');
        draftRows.forEach((r, i) => console.log((i + 1) + ': ' + r));

        const draftShot = path.join(__dirname, '..', 'assets', 'exact_drafts.png');
        await page.screenshot({ path: draftShot, fullPage: false });
        console.log('草稿箱截图已存入:', draftShot);
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
