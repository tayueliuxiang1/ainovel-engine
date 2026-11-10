// 通用存量章节精准覆写同步脚本（基于最新盘点与 --strict mtime/SHA256 双重门禁）
// 用法: node scripts/update_changed_chapters.js 2,3,4,5,6,8,... [--strict-pregate] [--check-only]
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');
const { analyzeChapter, GATE_DIR } = require('./verify_chapter');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

function enforceChapterGate(chapNum, chapFile, strictMtimeOnly) {
    const fullPath = path.resolve(__dirname, '..', chapFile);
    if (!fs.existsSync(fullPath)) {
        throw new Error('第 ' + chapNum + ' 章文件不存在：' + fullPath);
    }
    const raw = fs.readFileSync(fullPath);
    const str = raw.toString('utf8');
    if (str.indexOf(String.fromCharCode(42)) !== -1) {
        throw new Error('第 ' + chapNum + ' 章违禁包含星号，阻断更新！');
    }

    const stat = fs.statSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
    const gatePath = path.join(GATE_DIR, path.basename(fullPath, '.md') + '.gate.json');

    let needReverify = false;
    if (!fs.existsSync(gatePath)) {
        if (strictMtimeOnly) {
            throw new Error('第 ' + chapNum + ' 章缺少质检门禁凭据：' + gatePath);
        }
        needReverify = true;
    } else {
        const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
        const mtimeChanged = Math.abs((gate.file_mtime_ms || 0) - stat.mtimeMs) > 1;
        const hashChanged = gate.file_sha256 !== sha256;
        if (mtimeChanged || hashChanged) {
            if (strictMtimeOnly) {
                throw new Error('第 ' + chapNum + ' 章 mtime/SHA256 与门禁凭据不匹配，请重跑 verify_chapter.js --strict！');
            }
            needReverify = true;
        } else if (!gate.passed || (strictMtimeOnly && !gate.strict_passed)) {
            throw new Error('第 ' + chapNum + ' 章未通过严格质检门禁，阻断更新！');
        }
    }

    if (needReverify) {
        const report = analyzeChapter(fullPath, { emitGate: true });
        if (!report.passed || (strictMtimeOnly && !report.strict_passed)) {
            throw new Error('第 ' + chapNum + ' 章现场终审未全绿通过，阻断更新！');
        }
    }
}

function loadBackendInventory() {
    const invPath = path.resolve(__dirname, '..', 'assets', 'fanqie_backend_inventory.json');
    if (!fs.existsSync(invPath)) {
        throw new Error('缺少线上章节清单 assets/fanqie_backend_inventory.json，请先运行 verify_final_online.js！');
    }
    const rows = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    const map = {};
    rows.forEach(function (row) {
        const titleCol = (row.cols && row.cols[0]) || row.text || '';
        const mNum = titleCol.match(/^第(\d+)章\s/);
        if (!mNum) return;
        const chapNum = parseInt(mNum[1], 10);
        const editLink = (row.links || []).find(function (l) {
            return l.indexOf('/publish/') !== -1;
        }) || '';
        const mId = editLink.match(/\/publish\/(\d+)/);
        if (mId) {
            map[chapNum] = {
                num: chapNum,
                id: mId[1],
                expectedPage: row.page || 1,
                onlineTitleCol: titleCol
            };
        }
    });
    return map;
}

async function navigateToChapterManage(page, cachedManageUrl) {
    if (cachedManageUrl) {
        await page.goto(cachedManageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2500);
        const hasTable = await page.locator('tbody tr, .arco-table-tr').first().isVisible().catch(() => false);
        if (hasTable) return cachedManageUrl;
    }

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
    await page.waitForSelector('tbody tr, .arco-table-tr', { timeout: 25000 });
    return page.url();
}

async function findChapterAndClickEdit(page, chapId, expectedPage) {
    const targetHref = '/main/writer/' + BOOK_ID + '/publish/' + chapId;

    // 读取所有可见分页号
    const pageItems = page.locator('.arco-pagination-item, .byte-pagination-item');
    const pagesCount = await pageItems.count();
    const pageNums = [];
    for (let i = 0; i < pagesCount; i++) {
        const t = (await pageItems.nth(i).innerText()).trim();
        if (/^\d+$/.test(t)) pageNums.push(parseInt(t, 10));
    }
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;

    // 优先去 expectedPage 查找，找不到则顺扫其它页
    const tryOrder = [];
    if (expectedPage >= 1 && expectedPage <= maxPage) tryOrder.push(expectedPage);
    for (let p = 1; p <= maxPage; p++) {
        if (tryOrder.indexOf(p) === -1) tryOrder.push(p);
    }

    for (let idx = 0; idx < tryOrder.length; idx++) {
        const p = tryOrder[idx];
        const curActive = (await page.locator('.arco-pagination-item-active, .byte-pagination-item-active').first().innerText().catch(() => '1')).trim();
        if (String(p) !== curActive) {
            const btn = page.locator('.arco-pagination-item, .byte-pagination-item').filter({ hasText: new RegExp('^' + p + '$') }).first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click();
                await page.waitForTimeout(2200);
            }
        }
        const editBtn = page.locator('a[href^="' + targetHref + '"]').first();
        if (await editBtn.isVisible().catch(() => false)) {
            console.log('在第 ' + p + ' 页命中目标编辑链接: ' + targetHref);
            await editBtn.click();
            await page.waitForTimeout(3000);
            return true;
        }
    }
    return false;
}

async function ensureNumAndTitle(page, chapNum, chapTitle) {
    const inputs = page.locator('input');
    const numInput = inputs.nth(0);
    const titleInput = inputs.nth(1);

    for (let attempt = 1; attempt <= 3; attempt++) {
        const curNum = (await numInput.inputValue().catch(() => '')).trim();
        if (curNum === chapNum.toString()) break;
        await numInput.click({ force: true });
        await page.waitForTimeout(150);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(150);
        await page.keyboard.type(chapNum.toString(), { delay: 60 });
        await numInput.blur();
        await page.waitForTimeout(250);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        const curTitle = (await titleInput.inputValue().catch(() => '')).trim();
        if (curTitle === chapTitle) break;
        await titleInput.click({ force: true });
        await page.waitForTimeout(150);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(150);
        await titleInput.fill(chapTitle);
        await titleInput.blur();
        await page.waitForTimeout(250);
    }

    const finalNum = (await numInput.inputValue().catch(() => '')).trim();
    const finalTitle = (await titleInput.inputValue().catch(() => '')).trim();
    if (finalNum !== chapNum.toString() || finalTitle !== chapTitle) {
        throw new Error('序号或标题核验失败！actual=[' + finalNum + '/' + finalTitle + '] expected=[' + chapNum + '/' + chapTitle + ']');
    }
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
    if (rawContent.indexOf(String.fromCharCode(42)) !== -1) {
        throw new Error('第 ' + chapNum + ' 章违禁包含星号，阻断提交！');
    }

    const lines = rawContent.split(/\r?\n/);
    const chapTitle = lines[0].replace(/^#\s{0,}第[一二三四五六七八九十百千0-9\s]+章\s{0,}/, '').trim();
    const paragraphs = lines.map(p => p.trim()).filter(p => !p.startsWith('#') && !/^---+$/.test(p) && p !== '');
    const html = paragraphs.map(p => '<p>' + p + '</p>').join('');

    console.log('填充第 ' + chapNum + ' 章 《' + chapTitle + '》 (共 ' + paragraphs.length + ' 段, 约 ' + paragraphs.join('').length + ' 字)...');

    // 先注入正文
    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click({ force: true });
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1000);

    // 校验序号和标题
    await ensureNumAndTitle(page, chapNum, chapTitle);
    await page.waitForTimeout(600);

    // 存草稿
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click({ force: true });
        await page.waitForTimeout(2000);
        for (let s = 0; s < 5; s++) {
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
                break;
            }
            await page.waitForTimeout(700);
        }
    }

    // 存草稿后二次复检
    await ensureNumAndTitle(page, chapNum, chapTitle);

    // 点击右上角下一步
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
    await page.waitForTimeout(1800);

    let isConfirmed = false;
    let lastErrorToast = '';
    let clickConfirmCount = 0;

    for (let step = 1; step <= 28; step++) {
        await page.waitForTimeout(1300);

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }

        const msgs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.arco-message, .byte-message, .arco-alert, .byte-alert')).map(el => (el.innerText || '').trim()).filter(Boolean);
        });
        if (msgs.some(m => m.includes('重复标题') || m.includes('失败') || m.includes('错误') || m.includes('上限') || m.includes('请修改') || m.includes('超出'))) {
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
            await page.waitForTimeout(1500);
            continue;
        }

        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click({ force: true });
                console.log('已确认错别字提示');
                await page.waitForTimeout(1300);
                continue;
            }
        }

        if (clickConfirmCount === 0 || (clickConfirmCount === 1 && step % 5 === 0)) {
            await page.evaluate(() => {
                const radios = Array.from(document.querySelectorAll('.arco-radio, label, span')).filter(r => r.offsetParent !== null);
                const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
                if (noAi) noAi.click();
            });
            await page.waitForTimeout(300);

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
                await page.waitForTimeout(1800);
            }
        }

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', 'fail_update_ch' + chapNum + '.png') }).catch(() => {});
    }

    return { num: chapNum, title: chapTitle, isConfirmed, error: lastErrorToast || null };
}

(async () => {
    const numArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const strictMtimeOnly = process.argv.includes('--strict-pregate');
    const checkOnly = process.argv.includes('--check-only');

    const rawList = numArgs[0] || '';
    if (!rawList) {
        console.error('用法: node scripts/update_changed_chapters.js 2,3,4,... [--strict-pregate] [--check-only]');
        process.exit(1);
    }

    const chapNums = rawList.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
    const invMap = loadBackendInventory();

    const targets = [];
    for (let i = 0; i < chapNums.length; i++) {
        const n = chapNums[i];
        const pad = String(n).padStart(3, '0');
        const chapFile = '03_chapters/chapter_' + pad + '.md';
        enforceChapterGate(n, chapFile, strictMtimeOnly);

        const inv = invMap[n];
        if (!inv) {
            throw new Error('第 ' + n + ' 章未在 assets/fanqie_backend_inventory.json 中找到线上ID！');
        }
        targets.push({
            num: n,
            id: inv.id,
            expectedPage: inv.expectedPage,
            file: chapFile,
            onlineTitleCol: inv.onlineTitleCol
        });
    }

    console.log('✅ 前置双重门禁与线上ID映射全部通过（共 ' + targets.length + ' 章）: [' + chapNums.join(', ') + ']');
    if (checkOnly) {
        console.log('--check-only 模式结束，未启动浏览器。');
        return;
    }

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    let cachedManageUrl = '';
    const results = [];

    try {
        for (let i = 0; i < targets.length; i++) {
            const chap = targets[i];
            console.log('\n======================================');
            console.log('[' + (i + 1) + '/' + targets.length + '] 开始覆写第 ' + chap.num + ' 章 (ID: ' + chap.id + ', 预期页码: ' + chap.expectedPage + ')...');

            const alreadyOnManage = page.url().includes('/chapter-manage') && await page.locator('tbody tr, .arco-table-tr').first().isVisible().catch(() => false);
            if (!alreadyOnManage) {
                cachedManageUrl = await navigateToChapterManage(page, cachedManageUrl);
            }

            const found = await findChapterAndClickEdit(page, chap.id, chap.expectedPage);
            if (!found) {
                console.error('未找到第 ' + chap.num + ' 章编辑链接，重试从主页重新导航一次...');
                cachedManageUrl = await navigateToChapterManage(page, '');
                const retryFound = await findChapterAndClickEdit(page, chap.id, chap.expectedPage);
                if (!retryFound) {
                    console.error('二次查找仍失败！chapId=' + chap.id);
                    results.push({ num: chap.num, isConfirmed: false, error: 'edit link not found' });
                    continue;
                }
            }

            const res = await updateEditorContent(page, chap.num, chap.file);
            results.push(res);
            console.log('第 ' + chap.num + ' 章真实核验结果: ' + JSON.stringify(res));
            if (!res.isConfirmed) {
                console.error('⚠️ 第 ' + chap.num + ' 章未确认回跳！将继续后续或请核查截图。');
            }
            await page.waitForTimeout(1200);
        }

        const outPath = path.resolve(__dirname, '..', 'assets', 'update_changed_result.json');
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
        const failed = results.filter(r => !r.isConfirmed);
        console.log('\n全部覆写队列执行完毕：成功 ' + (results.length - failed.length) + '/' + results.length + '，失败 ' + failed.length + ' 章。');
        console.log('详情存入:', outPath);
        if (failed.length > 0) process.exitCode = 1;
    } finally {
        await context.close();
    }
})();
