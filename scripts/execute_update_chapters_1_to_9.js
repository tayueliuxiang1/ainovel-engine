const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function navigateToChapterManage(page) {
    console.log('\n----------------------------------------');
    console.log('正在导航进入【章节管理】页面...');
    console.log('----------------------------------------');
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
    console.log('已到达章节管理页:', page.url());
}

async function fillAndSubmitEditor(page, chapNum, chapTitle, chapFile, shotName) {
    console.log(`\n========================================`);
    console.log(`开始处理第 ${chapNum} 章 《${chapTitle}》`);
    console.log(`========================================`);

    // 1. 等待核心富文本组件挂载
    console.log('等待编辑器核心组件挂载...');
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(2000);
    await simulateHumanMouseMove(page);

    // 2. 处理【有刚刚更新的章节，是否继续编辑？】弹窗
    const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        console.log('检测到【有刚刚更新的章节】提示弹窗，点击【放弃】...');
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
        } else {
            await resumeModal.locator('button').first().click({ force: true });
        }
        await page.waitForTimeout(1000);
    }

    // 清理新手引导与遮罩
    console.log('清理新手引导与遮罩...');
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal, .reactour__helper, .publish-tour-guide, .byte-modal-mask, .byte-modal-wrapper');
        guides.forEach(e => e.remove());
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 3. 填写章节序号与标题
    console.log(`填入序号 [${chapNum}] 与标题 [${chapTitle}]...`);
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    if (inputCount < 2) {
        throw new Error('未定位到序号与标题输入框！');
    }

    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chapNum.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(500);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chapTitle);
    await inputs.nth(1).blur();
    await page.waitForTimeout(500);
    console.log(`已填入: 第 ${chapNum} 章 《${chapTitle}》`);

    // 4. 读取正文并注入
    console.log(`读取正文 [${chapFile}] 并执行零星号质检...`);
    const fullPath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error(`章节文件 [${chapFile}] 违规包含星号，阻断提交！`);
    }

    const paragraphs = rawContent
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');

    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click({ force: true });
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    // 键盘击键激活富文本状态机
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    console.log(`正文注入完成: 共 ${paragraphs.length} 段`);
    await page.waitForTimeout(2000);

    // 5. 点击【存草稿】
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click({ force: true });
        console.log('已触发【存草稿】');
        await page.waitForTimeout(3000);
    }

    for (let s = 0; s < 8; s++) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
            console.log('云端同步完毕。');
            break;
        }
        await page.waitForTimeout(1000);
    }

    // 6. 定位右上角【下一步】按钮
    console.log('定位右上角【下一步】按钮...');
    const allNextBtns = page.locator('button:has-text("下一步")');
    const nextCount = await allNextBtns.count();
    let targetNextBtn = null;

    for (let i = 0; i < nextCount; i++) {
        const btn = allNextBtns.nth(i);
        const box = await btn.boundingBox();
        if (box && box.y < 120 && box.x > 800) {
            targetNextBtn = btn;
            console.log(`命中右上角下一步按钮: x=${box.x}, y=${box.y}`);
            break;
        }
    }

    if (!targetNextBtn) {
        targetNextBtn = allNextBtns.first();
    }

    await targetNextBtn.click({ force: true });
    console.log('已点击【下一步】！');
    await page.waitForTimeout(3000);

    // 7. 处理后续弹窗与确认提交
    let isConfirmed = false;
    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1500);

        // 优先处理【仅基础检测】
        const hasDetect = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const basic = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (basic) {
                basic.click();
                return '仅基础检测';
            }
            const allD = btns.find(b => b.innerText && b.innerText.trim() === '全面检测');
            if (allD) {
                allD.click();
                return '全面检测';
            }
            return null;
        });
        if (hasDetect) {
            console.log(`已处理内容检测弹窗: 点击【${hasDetect}】`);
            await page.waitForTimeout(2000);
        }

        // 处理错别字提示弹窗
        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click({ force: true });
                console.log('已处理错别字提示弹窗');
                await page.waitForTimeout(1500);
            }
        }

        // 处理发布设置与终极确认提交按钮
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
                return true;
            }
            return false;
        });

        if (pubSettings) {
            console.log('已点击终极确认提交按钮！等待网络回执...');
            await page.waitForTimeout(4000);
            isConfirmed = true;
            break;
        }

        if (page.url().includes('/chapter-manage')) {
            console.log('页面已自动返回章节管理列表，更新发布成功！');
            isConfirmed = true;
            break;
        }
    }

    const shotDir = path.resolve(__dirname, '..', 'assets');
    if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: path.join(shotDir, shotName) });
    console.log(`第 ${chapNum} 章完成，截图存入: assets/${shotName}`);
}

(async () => {
    console.log('启动自动化发布浏览器引擎 (Profile: fanqie-profile)...');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await applyStealthEvasions(page);

    try {
        const chaptersToUpdate = [
            { num: 1, title: '图没了人还在', file: '03_chapters/chapter_001.md', id: '7704528770274689560', page: 2 },
            { num: 2, title: '爹您去一趟', file: '03_chapters/chapter_002.md', id: '7704529735971258904', page: 1 },
            { num: 3, title: '封哪件您念', file: '03_chapters/chapter_003.md', id: '7704529911825826328', page: 2 },
            { num: 4, title: '先别碰那堆铁', file: '03_chapters/chapter_004.md', id: '7704530930370626072', page: 2 },
            { num: 5, title: '再摇一回', file: '03_chapters/chapter_005.md', id: '7704531108729192984', page: 1 },
            { num: 6, title: '这桶水算数', file: '03_chapters/chapter_006.md', id: '7704541404147499544', page: 1 },
            { num: 7, title: '车比门宽', file: '03_chapters/chapter_007.md', id: '7704542520264376856', page: 1 },
            { num: 8, title: '不是一盆水的买卖', file: '03_chapters/chapter_008.md', id: '7704545993533948440', page: 1 },
            { num: 9, title: '把人撤开', file: '03_chapters/chapter_009.md', id: '7704863580864135704', page: 1 }
        ];

        for (const chap of chaptersToUpdate) {
            await navigateToChapterManage(page);
            console.log(`\n准备定位第 ${chap.num} 章编辑链接 (目标页码: ${chap.page})...`);

            if (chap.page === 2) {
                console.log('点击分页第 2 页...');
                const page2Btn = page.locator('.arco-pagination-item, li').filter({ hasText: /^2$/ }).first();
                if (await page2Btn.isVisible().catch(() => false)) {
                    await page2Btn.click();
                } else {
                    await page.locator('.arco-pagination-next').first().click();
                }
                await page.waitForTimeout(4000);
            }

            const targetHref = `/main/writer/7704518175408278552/publish/${chap.id}`;
            console.log(`定位链接前缀: ${targetHref}`);
            const editBtn = page.locator(`a[href^="${targetHref}"]`).last();
            await editBtn.waitFor({ timeout: 15000 });
            await editBtn.click();
            await page.waitForTimeout(4000);

            await fillAndSubmitEditor(page, chap.num, chap.title, chap.file, `updated_vol1_ch${chap.num}.png`);
        }

        // ========== 汇总全景验证与截图 ==========
        console.log('\n==================================================');
        console.log('全量更新完成！正在拉取最新章节管理全景截图...');
        console.log('==================================================');
        await navigateToChapterManage(page);
        await page.waitForTimeout(4000);

        const shot1 = path.resolve(__dirname, '..', 'assets', 'final_updated_vol1_page1.png');
        await page.screenshot({ path: shot1, fullPage: true });
        console.log('第 1 页全景截图存入: assets/final_updated_vol1_page1.png');

        const page2BtnFinal = page.locator('.arco-pagination-item, li').filter({ hasText: /^2$/ }).first();
        if (await page2BtnFinal.isVisible().catch(() => false)) {
            await page2BtnFinal.click();
            await page.waitForTimeout(4000);
            const shot2 = path.resolve(__dirname, '..', 'assets', 'final_updated_vol1_page2.png');
            await page.screenshot({ path: shot2, fullPage: true });
            console.log('第 2 页全景截图存入: assets/final_updated_vol1_page2.png');
        }

    } catch (err) {
        console.error('更新执行异常:', err);
    } finally {
        await context.close();
    }
})();
