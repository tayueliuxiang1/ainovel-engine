// 查询番茄作家后台所有已发布章节脚本
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const BOOK_ID = '7704518175408278552';
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
    const manageUrl = 'https://fanqienovel.com/main/writer/chapter-manage/' + BOOK_ID + '&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1';
    console.log('正在导航到章节管理页面:', manageUrl);
    await page.goto(manageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // 抓取页面上的全部表格行或章节元素
    const rawData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr, .arco-table-tr'));
        return rows.map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
    });

    console.log('=== 当前后台第一页表格提取内容 (共 ' + rawData.length + ' 行) ===');
    rawData.forEach((row, i) => {
        console.log((i + 1) + ': ' + row);
    });

    // 抓取分页总数显示
    const pageText = await page.evaluate(() => {
        const p = document.querySelector('.arco-pagination, .byte-pagination');
        return p ? p.innerText.replace(/\n+/g, ' ') : '无分页组件';
    });
    console.log('分页信息:', pageText);

    // 截图保存
    const shotPath = path.join(__dirname, '..', 'assets', 'check_published_status.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('检查截图存入:', shotPath);

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
