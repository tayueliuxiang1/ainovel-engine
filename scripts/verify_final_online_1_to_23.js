// 终极全量线上验收核对第1至23章真实入库状态与全分页截屏
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
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    try {
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3500);

        const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
        if (await novelMenu.isVisible().catch(() => false)) {
            await novelMenu.click();
            await page.waitForTimeout(2500);
        }

        const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
        await card.waitFor({ timeout: 25000 });
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(4500);

        // 先尝试按章节名称升序/默认列表全部抓取所有分页
        const allChapters = [];
        const pageItems = page.locator('.arco-pagination-item, .byte-pagination-item');
        const pagesCount = await pageItems.count();
        const pageNums = [];
        for (let i = 0; i < pagesCount; i++) {
            const t = (await pageItems.nth(i).innerText()).trim();
            if (/^\d+$/.test(t)) pageNums.push(parseInt(t, 10));
        }
        const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;
        console.log('线上当前总分页数:', maxPage);

        for (let p = 1; p <= maxPage; p++) {
            const btn = page.locator('.arco-pagination-item, .byte-pagination-item').filter({ hasText: new RegExp('^' + p + '$') }).first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click();
                await page.waitForTimeout(2500);
            }

            await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'verified_final_page_' + p + '.png'), fullPage: true });

            const rows = await page.evaluate(() => {
                const trs = Array.from(document.querySelectorAll('tbody tr, .arco-table-tr'));
                return trs.map(tr => {
                    const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.innerText || '').trim().replace(/\s+/g, ' '));
                    const links = Array.from(tr.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean);
                    return { cols: tds, text: (tr.innerText || '').trim().replace(/\s+/g, ' '), links };
                });
            });

            rows.forEach(r => {
                if (!r.text || r.text.includes('章节名称')) return;
                allChapters.push({ page: p, ...r });
            });
        }

        fs.writeFileSync(path.join(__dirname, '..', 'assets', 'fanqie_backend_inventory.json'), JSON.stringify(allChapters, null, 2));

        // 读取本地 1-23 章进行逐章严密核对
        console.log('\n=== 全量线上第1至23章真实核对报告 (线上总章数: ' + allChapters.length + ') ===');
        let mismatchCount = 0;

        for (let i = 1; i <= 23; i++) {
            const pad = String(i).padStart(3, '0');
            const f = path.join(__dirname, '..', '03_chapters', 'chapter_' + pad + '.md');
            const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
            const localTitle = lines[0].replace(/^#\s{0,}第[一二三四五六七八九十百千0-9\s]+章\s{0,}/, '').trim();
            const localBody = lines.filter(p => p.trim() && !p.trim().startsWith('#') && !p.includes('---')).join('');
            const localLen = localBody.length;

            const match = allChapters.find(c => c.text.startsWith('第' + i + '章 '));
            if (!match) {
                console.log('[MISSING] 第' + i + '章 《' + localTitle + '》 在线上缺失！');
                mismatchCount++;
                continue;
            }
            const onlineTitleCol = match.cols[0] || '';
            const onlineTitle = onlineTitleCol.replace(/^第\d+章\s{0,}/, '').trim();
            const onlineLen = parseInt(match.cols[1] || '0', 10);
            const status = match.cols[3] || '';
            const ok = (onlineTitle === localTitle && Math.abs(onlineLen - localLen) <= 30 && status === '已发布');
            if (!ok) mismatchCount++;
            console.log(
                String(i).padStart(2, '0') + ' | ' +
                (ok ? 'OK  ' : 'DIFF') + ' | 本地: 《' + localTitle + '》(' + localLen + '字) | 线上: ' +
                onlineTitleCol + ' (' + onlineLen + '字, ' + status + ')'
            );
        }

        // 检查有无超出 23 的残留章
        const extras = allChapters.filter(c => {
            const m = c.text.match(/^第(\d+)章/);
            return m && parseInt(m[1], 10) > 23;
        });
        console.log('\n线上第24章及以上残留数量:', extras.length);
        extras.forEach(e => console.log('  EXTRA:', e.text));
        console.log('总核对差异数:', mismatchCount);

        if (mismatchCount > 0 || extras.length > 0 || allChapters.length !== 23) {
            process.exitCode = 1;
        }
    } finally {
        await browserContext.close();
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
