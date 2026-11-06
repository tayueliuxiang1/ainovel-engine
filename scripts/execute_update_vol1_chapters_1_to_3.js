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

    // 尝试切换每页显示最大条数（如 50条/页），以便所有章节一网打尽
    try {
        const sizeSelect = page.locator('.arco-pagination-size-selector, .arco-select-view').first();
        if (await sizeSelect.isVisible().catch(() => false)) {
            await sizeSelect.click();
            await page.waitForTimeout(1000);
            const opt50 = page.locator('.arco-select-option, li').filter({ hasText: /50/ }).first();
            if (await opt50.isVisible().catch(() => false)) {
                await opt50.click();
                await page.waitForTimeout(3000);
                console.log('已切换分页器为 50 条/页');
            }
        }
    } catch (e) {
        console.log('切换分页条数尝试跳过:', e.message);
    }
}

async function findRowAndEditButton(page, chapNum) {
    const targetPattern = new RegExp(`第\\s{0,10}${chapNum}\\s{0,10}章`);

    // 检查当前页与所有分页（最多遍历5页）
    for (let pageIdx = 1; pageIdx <= 5; pageIdx++) {
        const rows = page.locator('tr, .arco-table-row');
        const rowCount = await rows.count();
        console.log(`第 ${pageIdx} 页：检测到 ${rowCount} 行`);

        for (let r = 0; r < rowCount; r++) {
            const rowText = await rows.nth(r).innerText().catch(() => '');
            if (targetPattern.test(rowText)) {
                console.log(`命中目标第 ${chapNum} 章行 [${r}]: ${rowText.replace(/\n+/g, ' ')}`);
                const btn = rows.nth(r).locator('a:has-text("修改"), button:has-text("修改"), a:has-text("编辑"), button:has-text("编辑")').first();
                if (await btn.isVisible().catch(() => false)) {
                    return btn;
                }
            }
        }

        // 如果未找到，尝试点击下一页
        const nextBtn = page.locator('.arco-pagination-next, button[aria-label="Next Page"], button:has-text("下一页")').first();
        const isDisabled = await nextBtn.getAttribute('aria-disabled').catch(() => null);
        if (await nextBtn.isVisible().catch(() => false) && isDisabled !== 'true') {
            console.log(`当前页未找到第 ${chapNum} 章，点击翻往下一页...`);
            await nextBtn.click();
            await page.waitForTimeout(3000);
        } else {
            break;
        }
    }

    return null;
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

    // 2. 清理新手引导
    console.log('清理新手引导与遮罩...');
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click().catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal');
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

    await inputs.nth(0).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chapNum.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(500);

    await inputs.nth(1).click();
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
    await editor.click();
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
        await saveDraftBtn.click();
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

        // 检测弹窗
        const hasDetect = await page.evaluate(() => {
            const body = document.body.innerText;
            return body.includes('错别字') || body.includes('发布设置') || body.includes('确认发布');
        });

        if (hasDetect) {
            console.log(`[步骤 ${step}] 检测到发布设置或校验弹窗...`);

            // 处理单选框【否】
            const radioNo = page.locator('label, span, div').filter({ hasText: /^否$/ }).first();
            if (await radioNo.isVisible().catch(() => false)) {
                console.log('选中单选框【否】...');
                await radioNo.click({ force: true }).catch(() => {});
                await page.waitForTimeout(500);
            }

            // 点击【确认发布】
            const confirmBtn = page.locator('button:has-text("确认发布"), button:has-text("发布"), button:has-text("确定")').last();
            if (await confirmBtn.isVisible().catch(() => false)) {
                console.log('触发【确认发布】按钮！');
                await confirmBtn.click({ force: true });
                await page.waitForTimeout(3000);
                isConfirmed = true;
                break;
            }
        }

        if (page.url().includes('/chapter-manage')) {
            console.log('页面已自动返回章节管理列表，发布成功！');
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
            { num: 1, title: '图没了人还在', file: '03_chapters/chapter_001.md', shot: 'vol1_updated_ch1.png' },
            { num: 2, title: '爹您去一趟', file: '03_chapters/chapter_002.md', shot: 'vol1_updated_ch2.png' },
            { num: 3, title: '封哪件您念', file: '03_chapters/chapter_003.md', shot: 'vol1_updated_ch3.png' }
        ];

        for (const chap of chaptersToUpdate) {
            await navigateToChapterManage(page);
            console.log(`寻找第 ${chap.num} 章编辑链接...`);

            let editLink = await findRowAndEditButton(page, chap.num);

            if (!editLink) {
                // 如果在已发布中没找到，检查草稿箱
                console.log(`在已发布列表未定位到第 ${chap.num} 章，进入草稿箱检查...`);
                await navigateToChapterManage(page);
                const draftTab = page.locator('.arco-tabs-header-cell, .arco-tabs-tab, div[role="tab"]').filter({ hasText: '草稿箱' }).first();
                if (await draftTab.isVisible().catch(() => false)) {
                    await draftTab.click();
                    await page.waitForTimeout(3000);
                    editLink = await findRowAndEditButton(page, chap.num);
                }
            }

            if (!editLink) {
                throw new Error(`未能定位第 ${chap.num} 章的修改/编辑入口！`);
            }

            await editLink.click();
            await page.waitForTimeout(4000);
            await fillAndSubmitEditor(page, chap.num, chap.title, chap.file, chap.shot);
        }

        // 汇总验证
        console.log('\n==================================================');
        console.log('最新章节更新全景截图与校验...');
        console.log('==================================================');
        await navigateToChapterManage(page);
        await page.waitForTimeout(4000);

        const finalShot = path.resolve(__dirname, '..', 'assets', 'final_vol1_chapters_1_to_3.png');
        await page.screenshot({ path: finalShot, fullPage: true });
        console.log('全景截图存入: assets/final_vol1_chapters_1_to_3.png');

        const summary = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
            return trs.map(tr => tr.innerText.replace(/\n+/g, ' \t ').trim()).filter(t => t.includes('第') && t.includes('章'));
        });
        console.log('\n最新章节发布状态一览:');
        summary.forEach((line, idx) => console.log(`[${idx}] ${line}`));

    } catch (err) {
        console.error('更新执行异常:', err);
    } finally {
        await context.close();
    }
})();
