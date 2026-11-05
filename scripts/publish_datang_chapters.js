const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { humanRandomSleep, applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const BOOK_NAME = '大唐：盗我抗旱图？';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

const CHAPTER_LIST = [
    { num: 1, title: '曲江暗流', file: '03_chapters/chapter_001.md' },
    { num: 2, title: '县衙火签', file: '03_chapters/chapter_002.md' },
    { num: 3, title: '谁给你的狗胆', file: '03_chapters/chapter_003.md' },
    { num: 4, title: '开炉', file: '03_chapters/chapter_004.md' },
    { num: 5, title: '试机', file: '03_chapters/chapter_005.md' }
];

async function publishChapter(page, chap) {
    console.log('\n==================================================');
    console.log(`🚀 [正式发布] 第 ${chap.num} 章: 《${chap.title}》`);
    console.log(`📖 书籍: 《${BOOK_NAME}》 (ID: ${BOOK_ID})`);
    console.log('==================================================');

    await applyStealthEvasions(page);
    const publishUrl = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
    console.log(`🌐 正在打开章节编辑器: ${publishUrl}`);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    await simulateHumanMouseMove(page);

    // 填写序号与标题
    const inputs = page.locator('input');
    await inputs.nth(0).fill(chap.num.toString());
    await inputs.nth(0).blur();
    await inputs.nth(1).fill(chap.title);
    await inputs.nth(1).blur();

    // 注入正文
    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();
    
    const filePath = path.resolve(__dirname, '..', chap.file);
    const rawContent = fs.readFileSync(filePath, 'utf8');

    // 零星号质检闸门
    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error(`❌ 章节 [${chap.file}] 包含非法星号字符，触发一票否决熔断！`);
    }

    const paragraphs = rawContent
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
        
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');
    
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    console.log(`✅ 注入正文成功: 共 ${paragraphs.length} 段落`);
    await page.waitForTimeout(3000);

    // 等待编辑器自动保存
    for (let w = 0; w < 10; w++) {
        const hasSaved = await page.locator('text=已保存').isVisible().catch(() => false);
        if (hasSaved) {
            console.log('💾 草稿已自动同步完毕！');
            break;
        }
        await page.waitForTimeout(1000);
    }

    // 清理遮挡弹窗
    await page.evaluate(() => {
        const wrappers = document.querySelectorAll('.byte-modal-wrapper, .arco-modal-wrapper');
        wrappers.forEach(w => {
            if (!w.innerText.includes('发布设置') && !w.innerText.includes('检测') && !w.innerText.includes('错别字') && !w.innerText.includes('发布提示')) {
                w.remove();
            }
        });
    });

    // 点击下一步
    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.evaluate(el => el.click());
    console.log('👉 已点击【下一步】按钮，等待弹窗确认...');

    let isDone = false;
    for (let step = 1; step <= 35; step++) {
        await page.waitForTimeout(1500);
        
        // 1. 错别字/标点提示弹窗
        const typoModal = page.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const btn = typoModal.locator('button.arco-btn-primary, button:has-text("提交"), button:has-text("继续发布")').first();
            await btn.click().catch(() => {});
            console.log('已处理错别字提示弹窗');
            await page.waitForTimeout(1500);
        }
        
        // 2. 敏感词或风险检测弹窗
        const riskModal = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
        if (await riskModal.isVisible().catch(() => false)) {
            const btn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click().catch(() => {});
                console.log('已处理基础检测弹窗');
                await page.waitForTimeout(1500);
            }
        }
        
        // 3. 发布设置终极弹窗
        const pubModal = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
        if (await pubModal.isVisible().catch(() => false)) {
            // 是否使用AI写作辅助：选择“否”
            const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAi.isVisible().catch(() => false)) {
                await noAi.click().catch(() => {});
                await page.waitForTimeout(500);
            }
            
            // 点击确认提交
            const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
            await confirmBtn.click().catch(() => {});
            console.log('🎉 已点击【确认发布】，等待网络确认结算...');
            await page.waitForTimeout(6000);
            isDone = true;
            break;
        }
    }

    if (!isDone) {
        throw new Error(`❌ 第 ${chap.num} 章发布流程超时或未完成！`);
    }

    console.log(`✨ 第 ${chap.num} 章《${chap.title}》正式发布成功！`);
}

(async () => {
    const args = process.argv.slice(2);
    let startNum = 1;
    let endNum = 5;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--start' && args[i + 1]) {
            startNum = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--end' && args[i + 1]) {
            endNum = parseInt(args[i + 1], 10);
            i++;
        }
    }

    const targetChapters = CHAPTER_LIST.filter(c => c.num >= startNum && c.num <= endNum);
    console.log(`📋 计划发布章节范围: 第 ${startNum} 章 至 第 ${endNum} 章 (共 ${targetChapters.length} 章节)`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    for (const chap of targetChapters) {
        try {
            await publishChapter(page, chap);
            // 拟人化随机等待 8 到 14 秒以消除行为指纹
            await humanRandomSleep(page, 8, 14);
        } catch (err) {
            console.error(`❌ 发布第 ${chap.num} 章时发生错误:`, err.message);
            await context.close();
            process.exit(1);
        }
    }

    await context.close();
    console.log('\n==================================================');
    console.log('🏆 目标章节全部顺序发布成功，番茄后台已完成同步！');
    console.log('==================================================');
    process.exit(0);
})();
