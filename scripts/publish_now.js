const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, humanRandomSleep } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

const CHAPTERS = [
    { num: 1, title: '曲江暗流', file: '03_chapters/chapter_001.md' },
    { num: 2, title: '县衙火签', file: '03_chapters/chapter_002.md' },
    { num: 3, title: '谁给你的狗胆', file: '03_chapters/chapter_003.md' },
    { num: 4, title: '开炉', file: '03_chapters/chapter_004.md' },
    { num: 5, title: '试机', file: '03_chapters/chapter_005.md' },
    { num: 6, title: '问车', file: '03_chapters/chapter_006.md' },
    { num: 7, title: '备战', file: '03_chapters/chapter_007.md' }
];

async function publishChapterDirect(page, chapNum, chapTitle, chapFile) {
    console.log('\n==================================================');
    console.log(`🚀 [直通发布] 第 ${chapNum} 章: 《${chapTitle}》`);
    console.log('==================================================');

    await applyStealthEvasions(page);
    const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // 等待编辑器加载
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(3000);

    // 填序号与标题
    const chapInput = page.locator('input').nth(0);
    await chapInput.fill(chapNum.toString());
    await chapInput.blur();

    const titleInput = page.locator('input').nth(1);
    await titleInput.fill(chapTitle);
    await titleInput.blur();
    console.log(`已填入: 第 ${chapNum} 章 《${chapTitle}》`);

    // 注入正文
    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();

    const raw = fs.readFileSync(path.resolve(__dirname, '..', chapFile), 'utf8');
    if (raw.includes(String.fromCharCode(42))) {
        throw new Error('检测到星号，拒绝发布！');
    }

    const paragraphs = raw.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');

    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    await page.keyboard.type('。');
    await page.keyboard.press('Backspace');
    console.log(`正文注入成功 (${paragraphs.length} 段)`);
    await page.waitForTimeout(2000);

    // 点击存草稿
    const saveBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        console.log("已点击【存草稿】");
        await page.waitForTimeout(3500);
    }

    // 点击下一步
    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click({ force: true });
    console.log("已点击【下一步】");
    await page.waitForTimeout(2000);

    // 循环处理各种弹窗
    let isPublished = false;
    for (let loop = 0; loop < 25; loop++) {
        await page.waitForTimeout(1500);

        // 1. 检测弹窗
        const detectBtn = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').locator('button:has-text("仅基础检测"), button:has-text("全面检测"), span:has-text("仅基础检测"), span:has-text("全面检测")').first();
        if (await detectBtn.isVisible().catch(() => false)) {
            console.log("处理检测弹窗...");
            await detectBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(1500);
            continue;
        }

        // 2. 错别字/提示弹窗
        const typoModal = page.locator('.arco-modal:has-text("提示"), .arco-modal:has-text("错别字"), .arco-modal:has-text("疑似"), [role="dialog"]:has-text("提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            console.log("处理错别字/提示弹窗...");
            const confirmTypo = typoModal.locator('button:has-text("确定"), button:has-text("提交"), button:has-text("继续发布")').first();
            if (await confirmTypo.isVisible().catch(() => false)) {
                await confirmTypo.click({ force: true }).catch(() => {});
                await page.waitForTimeout(1500);
                continue;
            }
        }

        // 3. 发布设置终极弹窗
        const pubSettings = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
        if (await pubSettings.isVisible().catch(() => false)) {
            console.log("处理发布设置弹窗...");
            const noAi = pubSettings.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAi.isVisible().catch(() => false)) {
                await noAi.click({ force: true }).catch(() => {});
                await page.waitForTimeout(500);
            }
            const confirmPublish = pubSettings.locator('button:has-text("确认发布"), button:has-text("确认提交"), button:has-text("提交")').first();
            if (await confirmPublish.isVisible().catch(() => false)) {
                await confirmPublish.click({ force: true });
                console.log("🚀 点击【确认发布】成功，等待后台结算 7 秒...");
                await page.waitForTimeout(7000);
                isPublished = true;
                break;
            }
        }
    }

    if (!isPublished) {
        throw new Error("未能成功完成发布弹窗交互！");
    }
    console.log(`🎉 第 ${chapNum} 章《${chapTitle}》发布大功告成！`);
}

(async () => {
    const args = process.argv.slice(2);
    let start = 6;
    let end = 6;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--start' && args[i + 1]) {
            start = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--end' && args[i + 1]) {
            end = parseInt(args[i + 1], 10);
            i++;
        }
    }

    const targets = CHAPTERS.filter(c => c.num >= start && c.num <= end);
    console.log(`📋 计划发布章节范围: 第 ${start} 章 至 第 ${end} 章 (共 ${targets.length} 章)`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        for (const chap of targets) {
            await publishChapterDirect(page, chap.num, chap.title, chap.file);
            await humanRandomSleep(page, 8, 14);
        }
        console.log("\n==================================================");
        console.log("🏆 选定章节全部顺序发布成功，番茄后台已完成同步！");
        console.log("==================================================");

    } catch (e) {
        console.error("❌ 发布中断:", e.message);
        process.exit(1);
    } finally {
        await context.close();
    }
})();
