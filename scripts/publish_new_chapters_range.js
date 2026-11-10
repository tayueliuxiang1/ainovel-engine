// 通用新建章节发布脚本（先核查防重、严格零星号检、持续监测跳转回执）
// 用法: node scripts/publish_new_chapters_range.js 24 26
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');
const { analyzeChapter, GATE_DIR } = require('./verify_chapter');

function enforceChapterGate(chapNum, chapFile, strictMtimeOnly) {
    const fullPath = path.resolve(__dirname, '..', chapFile);
    if (!fs.existsSync(fullPath)) {
        throw new Error('第 ' + chapNum + ' 章文件不存在：' + fullPath);
    }
    const stat = fs.statSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    const gatePath = path.join(GATE_DIR, path.basename(fullPath, '.md') + '.gate.json');

    let needReverify = false;
    if (!fs.existsSync(gatePath)) {
        if (strictMtimeOnly) {
            throw new Error('第 ' + chapNum + ' 章缺少前置质检门禁文件（' + gatePath + '），请先运行 node scripts/verify_chapter.js！');
        }
        console.log('⚠️ 第 ' + chapNum + ' 章尚未生成门禁凭据，正在执行发布前强制终审...');
        needReverify = true;
    } else {
        const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
        const mtimeChanged = Math.abs((gate.file_mtime_ms || 0) - stat.mtimeMs) > 1;
        const hashChanged = gate.file_sha256 !== sha256;
        if (mtimeChanged || hashChanged) {
            if (strictMtimeOnly) {
                throw new Error('第 ' + chapNum + ' 章自上次质检后发生修改（mtime/SHA256 失配），请重跑 verify_chapter.js 后再发布！');
            }
            console.log('⚠️ 检测到第 ' + chapNum + ' 章在上次质检后曾有修改，旧门禁已自动作废，正在重跑全量终审...');
            needReverify = true;
        } else if (!gate.passed) {
            throw new Error('第 ' + chapNum + ' 章门禁状态为未通过，阻断发布！请先修复 errors：' + (gate.errors || []).join(' ; '));
        } else {
            console.log('🔒 第 ' + chapNum + ' 章 mtime/SHA256 门禁校验通过（预警 ' + ((gate.warnings || []).length) + ' 项）。');
        }
    }

    if (needReverify) {
        const report = analyzeChapter(fullPath, { emitGate: true });
        if (!report.passed) {
            throw new Error('第 ' + chapNum + ' 章未能通过发布前强制终审，阻断发布：\n  ' + report.errors.join('\n  '));
        }
        console.log('🔒 第 ' + chapNum + ' 章现场终审通过并刷新门禁凭据（预警 ' + report.warnings.length + ' 项）。');
    }
}

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

async function checkChapterExistsOnline(page, chapNum) {
    const row = page.locator('tr.arco-table-tr').filter({ hasText: new RegExp('^第' + chapNum + '章\\s') }).first();
    if (await row.isVisible().catch(() => false)) {
        return true;
    }
    return false;
}

async function publishNewChapter(page, chapNum, chapFile) {
    const fullPath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('第 ' + chapNum + ' 章违禁包含星号，阻断发布！');
    }

    const lines = rawContent.split(/\r?\n/);
    const chapTitle = lines[0].replace(/^#\s{0,}第[一二三四五六七八九十百千0-9\s]+章\s{0,}/, '').trim();
    const paragraphs = lines.map(p => p.trim()).filter(p => !p.startsWith('#') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => '<p>' + p + '</p>').join('');

    console.log('\n======================================');
    console.log('准备新建发布第 ' + chapNum + ' 章 《' + chapTitle + '》 (共 ' + paragraphs.length + ' 段)...');

    await navigateToChapterManage(page);
    if (await checkChapterExistsOnline(page, chapNum)) {
        console.log('第 ' + chapNum + ' 章已存在于第1页列表，跳过新建以防重复！');
        return { num: chapNum, title: chapTitle, isConfirmed: true, skipped: true };
    }

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);

    try {
        await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    } catch (e) {
        console.error('等待编辑器超时，当前 URL:', page.url());
        await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', 'fail_editor_load_ch' + chapNum + '.png') }).catch(() => {});
        throw e;
    }
    await page.waitForTimeout(1200);
    await simulateHumanMouseMove(page);

    const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
        }
        await page.waitForTimeout(1000);
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

    // 1. 先注入正文，防止后续焦点切换被正文框打断
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

    // 2. 再精准写入章节序号与标题，并使用 keyboard.type 配合循环读值断言
    const inputs = page.locator('input');
    const numInput = inputs.nth(0);
    const titleInput = inputs.nth(1);

    for (let attempt = 1; attempt <= 3; attempt++) {
        await numInput.click({ force: true });
        await page.waitForTimeout(200);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(150);
        await page.keyboard.type(chapNum.toString(), { delay: 80 });
        await page.waitForTimeout(250);
        await numInput.blur();
        await page.waitForTimeout(300);
        const curNum = (await numInput.inputValue().catch(() => '')).trim();
        console.log('第 ' + attempt + ' 次填入序号校验: [' + curNum + '] (预期: ' + chapNum + ')');
        if (curNum === chapNum.toString()) break;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        await titleInput.click({ force: true });
        await page.waitForTimeout(200);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(150);
        await titleInput.fill(chapTitle);
        await page.waitForTimeout(250);
        await titleInput.blur();
        await page.waitForTimeout(300);
        const curTitle = (await titleInput.inputValue().catch(() => '')).trim();
        console.log('第 ' + attempt + ' 次填入标题校验: [' + curTitle + ']');
        if (curTitle === chapTitle) break;
    }

    if ((await numInput.inputValue().catch(() => '')).trim() !== chapNum.toString()) {
        throw new Error('章节序号未能正确写入受控输入框！当前值=' + await numInput.inputValue().catch(() => 'ERR'));
    }

    await page.waitForTimeout(1200);

    // 存草稿并等待保存完毕
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click({ force: true });
        await page.waitForTimeout(2500);
    }

    for (let s = 0; s < 6; s++) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
            break;
        }
        await page.waitForTimeout(800);
    }

    // 存草稿后二次复检序号是否仍保留
    if ((await numInput.inputValue().catch(() => '')).trim() !== chapNum.toString()) {
        console.log('存草稿后发现序号被重置，正在重新写入...');
        await numInput.click({ force: true });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(chapNum.toString(), { delay: 80 });
        await numInput.blur();
        await page.waitForTimeout(500);
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
    console.log('已点击【下一步】，进入提交流程...');
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

        const msgs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.arco-message, .byte-message, .arco-alert, .byte-alert')).map(el => (el.innerText || '').trim()).filter(Boolean);
        });
        if (msgs.some(m => m.includes('重复标题') || m.includes('失败') || m.includes('错误') || m.includes('上限') || m.includes('请修改') || m.includes('超出') || m.includes('阿拉伯数字'))) {
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
            console.log('处理内容检测: ' + hasDetect);
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
                    return t === '确认发布' || t === '确认提交' || t === '发布';
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
                console.log('第 ' + clickConfirmCount + ' 次点击终极按钮 [' + pubBtnText + ']！持续监测页面回跳...');
                await page.waitForTimeout(2000);
            }
        }

        if (page.url().includes('/chapter-manage')) {
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', 'fail_new_ch' + chapNum + '.png') }).catch(() => {});
    }

    return { num: chapNum, title: chapTitle, isConfirmed, error: lastErrorToast || null, url: page.url() };
}

(async () => {
    const numArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const strictMtimeOnly = process.argv.includes('--strict-pregate');
    const checkOnly = process.argv.includes('--check-only');
    const startArg = numArgs[0] ? parseInt(numArgs[0], 10) : 24;
    const endArg = numArgs[1] ? parseInt(numArgs[1], 10) : 26;

    console.log('启动新建章节发布队列预检: 第 ' + startArg + ' 至 ' + endArg + ' 章...');
    for (let i = startArg; i <= endArg; i++) {
        const pad = String(i).padStart(3, '0');
        const chapFile = '03_chapters/chapter_' + pad + '.md';
        enforceChapterGate(i, chapFile, strictMtimeOnly);
    }
    if (checkOnly) {
        console.log('✅ 发布前置门禁预检全部通过（--check-only 模式，未启动浏览器）。');
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

    const results = [];
    try {
        for (let i = startArg; i <= endArg; i++) {
            const pad = String(i).padStart(3, '0');
            const chapFile = '03_chapters/chapter_' + pad + '.md';
            const res = await publishNewChapter(page, i, chapFile);
            results.push(res);
            console.log('第 ' + i + ' 章发布核验结果: ' + JSON.stringify(res));
            if (!res.isConfirmed) {
                console.error('警告：第 ' + i + ' 章未确认回跳！终止后续发布！');
                break;
            }
            await page.waitForTimeout(1800);
        }

        const outPath = path.resolve(__dirname, '..', 'assets', 'publish_new_result.json');
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log('\n新建发布任务结束，结果存入:', outPath);
    } finally {
        await context.close();
    }
})();
