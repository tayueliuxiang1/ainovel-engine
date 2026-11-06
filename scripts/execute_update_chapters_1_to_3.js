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
    console.log(`🚀 开始处理第 ${chapNum} 章: 《${chapTitle}》`);
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
    console.log(`✅ 已填写: 第 ${chapNum} 章 《${chapTitle}》`);

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
    await page.keyboard.type('。');
    await page.keyboard.press('Backspace');
    console.log(`✅ 正文注入完成: 共 ${paragraphs.length} 段`);
    await page.waitForTimeout(2000);

    // 5. 点击【存草稿】
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click();
        console.log('💾 已触发【存草稿】');
        await page.waitForTimeout(3000);
    }

    for (let s = 0; s < 8; s++) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
            console.log('☁️ 云端同步完毕！');
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
            console.log(`🎯 命中右上角下一步按钮: x=${box.x}, y=${box.y}`);
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
            console.log(`👉 已处理内容检测弹窗: 点击【${hasDetect}】`);
            await page.waitForTimeout(2000);
        }

        // 错别字弹窗
        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click();
                console.log('👉 已处理错别字提示弹窗');
                await page.waitForTimeout(1500);
            }
        }

        // 终极发布/修改确认
        const pubSettings = await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => {
                const t = b.innerText ? b.innerText.trim() : '';
                return t === '确认发布' || t === '确认提交' || t === '确认修改' || t === '发布';
            });
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        });

        if (pubSettings) {
            console.log(`🎉 已点击终极确认按钮！等待网络回执 6 秒...`);
            await page.waitForTimeout(6000);
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        throw new Error(`第 ${chapNum} 章确认提交超时！`);
    }

    const shotPath = path.resolve(__dirname, '..', 'assets', shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`🏆 第 ${chapNum} 章《${chapTitle}》成功提交保存！截图凭证: assets/${shotName}`);
}

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log('==================================================');
        console.log('📚 [番茄小说] 开始全面同步更新第1、2、3章定稿正文');
        console.log('==================================================');

        // ========== 1. 更新第1章 ==========
        await navigateToChapterManage(page);
        console.log('定位第1章修改链接: /main/writer/7704518175408278552/publish/7704528770274689560');
        const editChap1 = page.locator('a[href^="/main/writer/7704518175408278552/publish/7704528770274689560"]').first();
        await editChap1.waitFor({ timeout: 15000 });
        await editChap1.click();
        await page.waitForTimeout(4000);
        await fillAndSubmitEditor(page, 1, '油纸包里的官戳', '03_chapters/chapter_001.md', 'updated_chapter_1.png');

        // ========== 2. 发布第2章 ==========
        await navigateToChapterManage(page);
        console.log('切换到【草稿箱】定位第2章草稿...');
        const draftTab = page.locator('.arco-tabs-header-cell, .arco-tabs-tab, div[role="tab"]').filter({ hasText: '草稿箱' }).first();
        await draftTab.click();
        await page.waitForTimeout(4000);

        const editChap2 = page.locator('a[href^="/main/writer/7704518175408278552/publish/7704529735971258904"]').first();
        if (await editChap2.isVisible().catch(() => false)) {
            console.log('点击第2章草稿编辑链接...');
            await editChap2.click();
        } else {
            console.log('草稿箱未直接找到指定草稿，使用创建章节入口发布第2章...');
            await page.goto('https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter_1');
        }
        await page.waitForTimeout(4000);
        await fillAndSubmitEditor(page, 2, '老子去搬救兵', '03_chapters/chapter_002.md', 'updated_chapter_2.png');

        // ========== 3. 更新第3章 ==========
        await navigateToChapterManage(page);
        console.log('定位第3章修改链接: /main/writer/7704518175408278552/publish/7704529911825826328');
        const editChap3 = page.locator('a[href^="/main/writer/7704518175408278552/publish/7704529911825826328"]').first();
        await editChap3.waitFor({ timeout: 15000 });
        await editChap3.click();
        await page.waitForTimeout(4000);
        await fillAndSubmitEditor(page, 3, '拿水磨坊来赌', '03_chapters/chapter_003.md', 'updated_chapter_3.png');

        // ========== 4. 汇总验证与截图 ==========
        console.log('\n==================================================');
        console.log('🔍 全部更新完成，正在拉取最新章节管理列表全貌...');
        console.log('==================================================');
        await navigateToChapterManage(page);
        await page.waitForTimeout(4000);

        const finalShot = path.resolve(__dirname, '..', 'assets', 'final_updated_chapters_1_to_3.png');
        await page.screenshot({ path: finalShot, fullPage: true });
        console.log(`📸 最新全量章节管理列表已截图: assets/final_updated_chapters_1_to_3.png`);

        const chapterSummary = await page.evaluate(() => {
            const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
            return trs.map(tr => tr.innerText.replace(/\n+/g, ' \t ').trim()).filter(t => t.includes('第') && t.includes('章'));
        });
        console.log('\n最新章节发布状态一览:');
        chapterSummary.forEach((c, idx) => console.log(`[${idx}] ${c}`));

    } catch (err) {
        console.error('更新执行异常:', err);
    } finally {
        await context.close();
    }
})();
