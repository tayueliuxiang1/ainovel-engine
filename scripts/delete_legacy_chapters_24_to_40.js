// 安全精确清除线上与新版割裂冲突的旧版第24至40章（严格依据 ID 定位，绝不误删第1至23章）
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function navigateToChapterManage(page) {
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(2000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);
}

(async () => {
    const invPath = path.resolve(__dirname, '..', 'assets', 'fanqie_backend_inventory.json');
    const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));

    // 构建第40章倒序到第24章的安全目标清单（严格校验编号 >= 24）
    const targets = [];
    for (let i = 40; i >= 24; i--) {
        const hit = inv.find(x => x.text.startsWith('第' + i + '章 '));
        if (hit) {
            const href = hit.links.find(l => l.includes('/publish/'));
            const id = href ? href.split('/publish/')[1].split('/')[0] : '';
            if (id) {
                targets.push({ num: i, title: hit.text.split(' ')[1] || '', id });
            }
        }
    }

    console.log('准备精确清理旧版割裂章节，共 ' + targets.length + ' 章 (第40章至第24章)...');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    const deleted = [];
    let blockedReason = null;

    try {
        await navigateToChapterManage(page);

        for (const t of targets) {
            console.log('\n--- 查找并删除旧版第 ' + t.num + ' 章 (' + t.title + ', ID=' + t.id + ') ---');
            const targetHref = '/main/writer/' + BOOK_ID + '/publish/' + t.id;

            const pageItems = page.locator('.arco-pagination-item, .byte-pagination-item');
            const pagesCount = await pageItems.count();
            const pageNums = [];
            for (let i = 0; i < pagesCount; i++) {
                const txt = (await pageItems.nth(i).innerText()).trim();
                if (/^\d+$/.test(txt)) pageNums.push(parseInt(txt, 10));
            }
            const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

            let hitRow = false;
            for (let p = 1; p <= maxPage; p++) {
                const pageBtn = page.locator('.arco-pagination-item, .byte-pagination-item').filter({ hasText: new RegExp('^' + p + '$') }).first();
                if (await pageBtn.isVisible().catch(() => false)) {
                    await pageBtn.click();
                    await page.waitForTimeout(1500);
                }
                const editLink = page.locator('a[href^="' + targetHref + '"]').first();
                if (await editLink.isVisible().catch(() => false)) {
                    const row = page.locator('tr.arco-table-tr').filter({ has: editLink }).first();
                    const delBtn = row.locator('.auto-editor-chapter-delete, .tomato-delete, .icon-delete').first();
                    await delBtn.click({ force: true });
                    hitRow = true;
                    break;
                }
            }

            if (!hitRow) {
                console.log('未在后台找到旧版第 ' + t.num + ' 章 (可能已删除)，跳过。');
                continue;
            }

            await page.waitForTimeout(1200);
            const confirmModal = page.locator('.arco-modal, .byte-modal').filter({ hasText: '确定删除' }).first();
            if (!(await confirmModal.isVisible().catch(() => false))) {
                const msgs = await page.evaluate(() => Array.from(document.querySelectorAll('.arco-message, .byte-message')).map(e => e.innerText.trim()));
                console.error('点击删除未见确认框，Toast:', msgs);
                if (msgs.length > 0) {
                    blockedReason = msgs.join(' | ');
                    break;
                }
                continue;
            }

            const confirmDelBtn = confirmModal.locator('button:has-text("删除"), button:has-text("确定")').last();
            await confirmDelBtn.click({ force: true });
            await page.waitForTimeout(2200);

            const afterMsgs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.arco-message, .byte-message')).map(e => (e.innerText || '').trim()).filter(Boolean);
            });
            console.log('删除操作后消息:', JSON.stringify(afterMsgs));

            if (afterMsgs.some(m => m.includes('上限') || m.includes('限制') || m.includes('失败') || m.includes('不可') || m.includes('最多'))) {
                blockedReason = afterMsgs.join(' | ');
                console.error('触发平台删除限制，立即终止清理！原因:', blockedReason);
                break;
            }

            // 确认该链接从当前 DOM 消失
            const stillVisible = await page.locator('a[href^="' + targetHref + '"]').first().isVisible().catch(() => false);
            if (stillVisible) {
                await page.reload({ waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(3000);
                const stillAfterReload = await page.locator('a[href^="' + targetHref + '"]').first().isVisible().catch(() => false);
                if (stillAfterReload) {
                    blockedReason = '点击确认删除后记录仍存在于页面';
                    console.error(blockedReason);
                    break;
                }
            }

            console.log('旧版第 ' + t.num + ' 章已从线上确认清除！');
            deleted.push(t);
            await page.waitForTimeout(800);
        }

        const outPath = path.resolve(__dirname, '..', 'assets', 'delete_legacy_24_40_result.json');
        fs.writeFileSync(outPath, JSON.stringify({ deletedCount: deleted.length, blockedReason, deleted }, null, 2));
        console.log('\n清理执行结束！共清理: ' + deleted.length + ' 章，阻断原因:', blockedReason);
    } finally {
        await context.close();
    }
})();
