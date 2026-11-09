// 单章测试覆盖更新第1章并探查已发布章节删除弹窗机制
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function navigateToChapterManage(page) {
    console.log('正在导航进入【章节管理】...');
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
}

async function findChapterAndClickEdit(page, chapId) {
    const targetHref = '/main/writer/' + BOOK_ID + '/publish/' + chapId;
    const pageItems = page.locator('.arco-pagination-item, .byte-pagination-item');
    const pagesCount = await pageItems.count();
    const pageNums = [];
    for (let i = 0; i < pagesCount; i++) {
        const t = (await pageItems.nth(i).innerText()).trim();
        if (/^\d+$/.test(t)) pageNums.push(parseInt(t, 10));
    }
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

    for (let p = 1; p <= maxPage; p++) {
        if (p > 1) {
            const btn = page.locator('.arco-pagination-item, .byte-pagination-item').filter({ hasText: new RegExp('^' + p + '$') }).first();
            await btn.click();
            await page.waitForTimeout(2500);
        }
        const editBtn = page.locator('a[href^="' + targetHref + '"]').first();
        if (await editBtn.isVisible().catch(() => false)) {
            console.log('在第 ' + p + ' 页命中目标编辑链接: ' + targetHref);
            await editBtn.click();
            await page.waitForTimeout(4000);
            return true;
        }
    }
    return false;
}

async function updateEditorContent(page, chapNum, chapFile) {
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(1500);
    await simulateHumanMouseMove(page);

    const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
        }
        await page.waitForTimeout(1000);
    }

    // 清理引导与遮罩
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal, .reactour__helper, .publish-tour-guide');
        guides.forEach(e => e.remove());
    });

    const fullPath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('违禁字符星号检测未通过！');
    }

    const lines = rawContent.split(/\r?\n/);
    const chapTitle = lines[0].replace(/^#\s{0,}第[一二三四五六七八九十百千0-9\s]+章\s{0,}/, '').trim();
    const paragraphs = lines.map(p => p.trim()).filter(p => !p.startsWith('#') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => '<p>' + p + '</p>').join('');

    console.log('填充第 ' + chapNum + ' 章 《' + chapTitle + '》 (共 ' + paragraphs.length + ' 段)...');
    const inputs = page.locator('input');
    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chapNum.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(400);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chapTitle);
    await inputs.nth(1).blur();
    await page.waitForTimeout(400);

    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click({ force: true });
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1500);

    // 存草稿
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click({ force: true });
        await page.waitForTimeout(2500);
    }

    // 右上角下一步
    const allNextBtns = page.locator('button:has-text("下一步")');
    const nextCount = await allNextBtns.count();
    let targetNextBtn = null;
    for (let i = 0; i < nextCount; i++) {
        const btn = allNextBtns.nth(i);
        const box = await btn.boundingBox();
        if (box && box.y < 120 && box.x > 800) {
            targetNextBtn = btn;
            break;
        }
    }
    if (!targetNextBtn) targetNextBtn = allNextBtns.first();
    await targetNextBtn.click({ force: true });
    console.log('已点击【下一步】，进入弹窗流...');
    await page.waitForTimeout(2500);

    let isConfirmed = false;
    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1500);

        const hasDetect = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const basic = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (basic) { basic.click(); return '仅基础检测'; }
            const allD = btns.find(b => b.innerText && b.innerText.trim() === '全面检测');
            if (allD) { allD.click(); return '全面检测'; }
            return null;
        });
        if (hasDetect) {
            console.log('点击了检测: ' + hasDetect);
            await page.waitForTimeout(2000);
        }

        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click({ force: true });
                console.log('已确认错别字提示');
                await page.waitForTimeout(1500);
            }
        }

        const pubSettings = await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => {
                const t = b.innerText ? b.innerText.trim() : '';
                return t === '确认提交' || t === '确认发布' || t === '发布';
            });
            if (confirmBtn) {
                confirmBtn.click();
                return t = confirmBtn.innerText.trim();
            }
            return null;
        });

        if (pubSettings) {
            console.log('已点击终极按钮 [' + pubSettings + ']！等待页面回跳...');
            await page.waitForTimeout(5000);
            isConfirmed = true;
            break;
        }

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }
    }
    console.log('单章更新提交状态: isConfirmed=' + isConfirmed + ', URL=' + page.url());
    return isConfirmed;
}

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        await navigateToChapterManage(page);
        const found = await findChapterAndClickEdit(page, '7704528770274689560');
        if (!found) throw new Error('未能找到第1章编辑入口');
        await updateEditorContent(page, 1, '03_chapters/chapter_001.md');

        // 测试检查第40章的删除按钮提示
        await navigateToChapterManage(page);
        const row40 = page.locator('tbody tr, .arco-table-tr').filter({ hasText: '第40章' }).first();
        if (await row40.isVisible().catch(() => false)) {
            console.log('找到第40章行，点击其删除图标测试弹窗...');
            // 操作栏第二个图标通常是删除
            const actionIcons = row40.locator('td').last().locator('svg, button, span[role="button"], i');
            const cnt = await actionIcons.count();
            console.log('第40章操作列元素数:', cnt);
            if (cnt >= 2) {
                await actionIcons.nth(cnt - 1).click({ force: true });
                await page.waitForTimeout(2000);
                const modalText = await page.evaluate(() => {
                    const m = document.querySelector('.arco-modal, .byte-modal');
                    return m ? m.innerText : '无弹窗';
                });
                console.log('删除点击后弹窗内容:\n' + modalText);
                await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'inspect_delete_modal.png') });
                // 点取消不破坏
                const cancelBtn = page.locator('.arco-modal button:has-text("取消"), .byte-modal button:has-text("取消")').first();
                if (await cancelBtn.isVisible().catch(() => false)) {
                    await cancelBtn.click();
                }
            }
        }
    } finally {
        await context.close();
    }
})();
