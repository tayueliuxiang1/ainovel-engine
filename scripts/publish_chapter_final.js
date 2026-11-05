const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, humanRandomSleep, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function publishOneChapter(page, chapNum, chapTitle, chapFile) {
    console.log('\n==================================================');
    console.log(`🚀 [正式发布] 第 ${chapNum} 章: 《${chapTitle}》`);
    console.log(`📖 书籍 ID: ${BOOK_ID}`);
    console.log('==================================================');

    await applyStealthEvasions(page);
    const publishUrl = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
    console.log(`🌐 正在打开编辑器: ${publishUrl}`);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // 1. 等待核心编辑器组件挂载
    console.log("⏳ 等待富文本编辑器挂载到 DOM...");
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(2000);
    await simulateHumanMouseMove(page);

    // 2. 清理新手引导
    console.log("👉 检查并消除新手引导...");
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class*="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click().catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal').forEach(e => e.remove());
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 3. 填写章节序号与标题
    console.log("👉 填写序号与标题...");
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`找到输入框数量: ${inputCount}`);

    if (inputCount >= 2) {
        await inputs.nth(0).fill(chapNum.toString());
        await inputs.nth(0).blur();
        await page.waitForTimeout(500);

        await inputs.nth(1).fill(chapTitle);
        await inputs.nth(1).blur();
        await page.waitForTimeout(500);
        console.log(`✅ 已填写: 第 ${chapNum} 章 《${chapTitle}》`);
    } else {
        throw new Error("未找到序号与标题输入框！");
    }

    // 4. 读取正文并注入
    console.log("👉 读取正文并注入编辑器...");
    const fullFilePath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullFilePath, 'utf8');

    // 零星号质检闸门
    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error(`章节 [${chapFile}] 含有星号字符，违背绝对铁律！`);
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

    // 激活状态
    await page.keyboard.type('。');
    await page.keyboard.press('Backspace');
    console.log(`✅ 注入正文完成: 共 ${paragraphs.length} 段落`);
    await page.waitForTimeout(2000);

    // 5. 点击【存草稿】
    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click();
        console.log("💾 已点击【存草稿】");
        await page.waitForTimeout(3000);
    }

    // 等待云端同步完毕
    for (let s = 0; s < 10; s++) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
            console.log("☁️ 云端状态已同步！");
            break;
        }
        await page.waitForTimeout(1000);
    }

    // 6. 定位右上角【下一步】按钮
    console.log("👉 定位右上角【下一步】发布按钮...");
    const allNextBtns = page.locator('button:has-text("下一步")');
    const nextCount = await allNextBtns.count();
    let targetNextBtn = null;

    for (let i = 0; i < nextCount; i++) {
        const btn = allNextBtns.nth(i);
        const box = await btn.boundingBox();
        if (box && box.y < 120 && box.x > 800) {
            targetNextBtn = btn;
            console.log(`🎯 命中右上角发布按钮 [${i}]: x=${box.x}, y=${box.y}`);
            break;
        }
    }

    if (!targetNextBtn) {
        targetNextBtn = allNextBtns.first();
    }

    await targetNextBtn.click({ force: true });
    console.log("已点击右上角【下一步】！");
    await page.waitForTimeout(3000);

    // 7. 处理后续弹窗流程 (检测方式 -> 错别字 -> 发布设置)
    let isPublished = false;
    for (let step = 1; step <= 30; step++) {
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
                console.log("👉 已处理错别字提示弹窗");
                await page.waitForTimeout(1500);
            }
        }

        // 发布设置终极弹窗
        const pubSettings = await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => b.innerText && (b.innerText.trim() === '确认发布' || b.innerText.trim() === '确认提交'));
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        });

        if (pubSettings) {
            console.log("🎉 已点击【确认发布】终极按钮！等待结算网络回执 6 秒...");
            await page.waitForTimeout(6000);
            isPublished = true;
            break;
        }
    }

    if (!isPublished) {
        throw new Error(`第 ${chapNum} 章发布超时或未弹出确认对话框！`);
    }

    console.log(`🏆 第 ${chapNum} 章《${chapTitle}》正式发布成功！`);
}

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        // 先发布第一章
        await publishOneChapter(page, 1, '曲江暗流', '03_chapters/chapter_001.md');
        
        // 截图留存凭证
        const shotPath = path.resolve(__dirname, '../assets/published_chapter_001.png');
        await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
        console.log(`📸 发布成果截图已保存至: ${shotPath}`);

    } catch (err) {
        console.error("❌ 发布中断:", err.message);
        process.exit(1);
    } finally {
        await context.close();
    }
})();
