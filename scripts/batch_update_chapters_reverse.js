// 批量倒序覆盖更新发布重构版章节到番茄小说后台（支持任意起始与终止章号倒序解环）
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
            await page.waitForTimeout(2000);
        }
        const editBtn = page.locator('a[href^="' + targetHref + '"]').first();
        if (await editBtn.isVisible().catch(() => false)) {
            console.log('在第 ' + p + ' 页命中目标编辑链接: ' + targetHref);
            await editBtn.click();
            await page.waitForTimeout(3500);
            return true;
        }
    }
    return false;
}

async function updateEditorContent(page, chapNum, chapFile) {
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(1200);
    await simulateHumanMouseMove(page);

    const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
        }
        await page.waitForTimeout(800);
    }

    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click({ force: true }).catch(() => {});
            await page.waitForTimeout(400);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal, .reactour__helper, .publish-tour-guide');
        guides.forEach(e => e.remove());
    });

    const fullPath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('第 ' + chapNum + ' 章违禁包含星号，阻断提交！');
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
    await page.waitForTimeout(300);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chapTitle);
    await inputs.nth(1).blur();
    await page.waitForTimeout(300);

    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click({ force: true });
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1200);

    // 存草稿
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click({ force: true });
        await page.waitForTimeout(2000);
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
    await page.waitForTimeout(2000);

    let isConfirmed = false;
    let lastErrorToast = '';
    let clickConfirmCount = 0;

    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1400);

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }

        // 检查错误 Toast
        const msgs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.arco-message, .byte-message')).map(el => (el.innerText || '').trim()).filter(Boolean);
        });
        if (msgs.some(m => m.includes('重复标题') || m.includes('失败') || m.includes('错误') || m.includes('上限') || m.includes('请修改'))) {
            lastErrorToast = msgs.join(' | ');
            console.error('拦截到错误消息 Toast:', lastErrorToast);
            break;
        }

        const hasDetect = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.disabled);
            const basic = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (basic) { basic.click(); return '仅基础检测'; }
            const allD = btns.find(b => b.innerText && b.innerText.trim() === '全面检测');
            if (allD) { allD.click(); return '全面检测'; }
            return null;
        });
        if (hasDetect) {
            console.log('点击检测: ' + hasDetect);
            await page.waitForTimeout(1600);
            continue;
        }

        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click({ force: true });
                console.log('已确认错别字提示');
                await page.waitForTimeout(1400);
                continue;
            }
        }

        if (clickConfirmCount === 0 || (clickConfirmCount === 1 && step % 5 === 0)) {
            const hasNoAiRadio = await page.evaluate(() => {
                const radios = Array.from(document.querySelectorAll('.arco-radio, label, span')).filter(r => r.offsetParent !== null);
                const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
                if (noAi) {
                    noAi.click();
                    return true;
                }
                return false;
            });
            if (hasNoAiRadio) {
                await page.waitForTimeout(400);
            }

            const pubBtnText = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.disabled);
                const confirmBtn = btns.find(b => {
                    const t = b.innerText ? b.innerText.trim() : '';
                    return t === '确认提交' || t === '确认发布' || t === '确认修改' || t === '发布';
                });
                if (confirmBtn) {
                    const text = confirmBtn.innerText.trim();
                    confirmBtn.click();
                    return text;
                }
                return null;
            });

            if (pubBtnText) {
                clickConfirmCount++;
                console.log('第 ' + clickConfirmCount + ' 次点击终极按钮 [' + pubBtnText + ']！持续监测回跳...');
                await page.waitForTimeout(2000);
            }
        }

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', 'fail_ch' + chapNum + '.png') }).catch(() => {});
    }

    return { num: chapNum, title: chapTitle, isConfirmed, error: lastErrorToast || null, url: page.url() };
}

(async () => {
    // 参数: node batch_update_chapters_reverse.js 23,22,21... 或 start end (倒序)
    const arg1 = process.argv[2] || '23';
    const arg2 = process.argv[3] || '1';

    let targetNums = [];
    if (arg1.includes(',')) {
        targetNums = arg1.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    } else {
        const a = parseInt(arg1, 10);
        const b = parseInt(arg2, 10);
        if (a >= b) {
            for (let i = a; i >= b; i--) targetNums.push(i);
        } else {
            for (let i = a; i <= b; i++) targetNums.push(i);
        }
    }

    const planPath = path.resolve(__dirname, '..', 'assets', 'chapters_1_to_23_update_plan.json');
    const allPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const targets = targetNums.map(n => allPlan.find(c => c.num === n)).filter(Boolean);

    console.log('启动倒序/指定更新发布队列 (共 ' + targets.length + ' 章): [' + targets.map(t => t.num).join(', ') + ']');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    const results = [];
    try {
        for (const chap of targets) {
            console.log('\n======================================');
            console.log('开始更新第 ' + chap.num + ' 章 《' + chap.title + '》 (ID: ' + chap.id + ')...');
            await navigateToChapterManage(page);
            const found = await findChapterAndClickEdit(page, chap.id);
            if (!found) {
                console.error('未找到第 ' + chap.num + ' 章编辑链接！id=' + chap.id);
                results.push({ num: chap.num, title: chap.title, isConfirmed: false, error: 'not found' });
                continue;
            }
            const res = await updateEditorContent(page, chap.num, chap.file);
            results.push(res);
            console.log('第 ' + chap.num + ' 章真实核验结果: ' + JSON.stringify(res));
            if (!res.isConfirmed) {
                console.error('警告：第 ' + chap.num + ' 章未通过真实跳转核验！');
            }
            await page.waitForTimeout(1500);
        }

        const outPath = path.resolve(__dirname, '..', 'assets', 'update_reverse_result.json');
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log('\n本批次执行完毕，汇总存入:', outPath);
    } finally {
        await context.close();
    }
})();
