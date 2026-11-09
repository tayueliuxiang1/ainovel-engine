// 全面探查番茄作家后台全部分页已发布章节及操作链接
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
    await page.waitForTimeout(5000);

    const allChapters = [];
    const pageItems = page.locator('.arco-pagination-item, .byte-pagination-item, ul.arco-pagination li.arco-pagination-item');
    const pagesCount = await pageItems.count();
    console.log('检测到分页按钮数量:', pagesCount);

    // 读取页码最大数
    const pageNums = [];
    for (let i = 0; i < pagesCount; i++) {
        const t = (await pageItems.nth(i).innerText()).trim();
        if (/^\d+$/.test(t)) pageNums.push(parseInt(t, 10));
    }
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;
    console.log('总页数:', maxPage);

    for (let p = 1; p <= maxPage; p++) {
        if (p > 1) {
            const btn = page.locator('.arco-pagination-item, .byte-pagination-item').filter({ hasText: new RegExp('^' + p + '$') }).first();
            await btn.click();
            await page.waitForTimeout(2500);
        }

        const rows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tbody tr, .arco-table-tr'));
            return trs.map(tr => {
                const text = (tr.innerText || '').trim().replace(/\s+/g, ' ');
                const links = Array.from(tr.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean);
                const svgCount = tr.querySelectorAll('svg').length;
                return { text, links, svgCount };
            });
        });

        rows.forEach((r) => {
            if (!r.text || r.text.includes('章节名称')) return;
            allChapters.push({ page: p, ...r });
        });
    }

    console.log('\n=== 已发布章节全量清单 (共 ' + allChapters.length + ' 条) ===');
    allChapters.forEach((c, idx) => {
        console.log((idx + 1) + '. [P' + c.page + '] ' + c.text + ' | Links: ' + JSON.stringify(c.links));
    });

    // 保存清单到 scratch
    const outPath = path.join(__dirname, '..', 'assets', 'fanqie_backend_inventory.json');
    fs.writeFileSync(outPath, JSON.stringify(allChapters, null, 2));
    console.log('全量清单已保存至:', outPath);

    // 检查草稿箱
    const draftTab = page.locator('div, span, a, button').filter({ hasText: /^草稿箱$/ }).first();
    if (await draftTab.isVisible().catch(() => false)) {
        await draftTab.click();
        await page.waitForTimeout(3000);
        const draftRows = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tbody tr, .arco-table-tr'));
            return trs.map(tr => (tr.innerText || '').trim().replace(/\s+/g, ' '));
        });
        console.log('\n=== 草稿箱清单 ===');
        draftRows.forEach(r => console.log(r));
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
