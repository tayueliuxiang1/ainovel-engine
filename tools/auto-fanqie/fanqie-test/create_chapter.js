const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
let novelName = '';
let volumeName = '';
let chapterTitle = '';
let contentFile = '';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--novel' && args[i+1]) {
        novelName = args[i+1];
        i++;
    } else if (args[i] === '--volume' && args[i+1]) {
        volumeName = args[i+1];
        i++;
    } else if (args[i] === '--title' && args[i+1]) {
        chapterTitle = args[i+1];
        i++;
    } else if (args[i] === '--file' && args[i+1]) {
        contentFile = args[i+1];
        i++;
    }
}

if (!chapterTitle || !contentFile) {
    console.error("❌ 请提供章节标题和正文文件路径！");
    process.exit(1);
}

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const isHeadless = process.env.FANQIE_HEADLESS === '0' ? false : true;
    console.log(`🌐 启动自动化引擎 (Headless: ${isHeadless})...`);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: isHeadless,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    let page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 导航到作品管理页面...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        if (novelName) {
            console.log(`📖 查找作品卡片: ${novelName}...`);
            const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
            await bookCard.waitFor({ state: 'visible', timeout: 30000 });
            console.log(`✅ 找到作品卡片: ${novelName}`);

            console.log("👉 从作品卡片点击【创建章节】/【新建章节】/【章节管理】...");
            const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节"), button:has-text("新建章节"), a:has-text("新建章节"), button:has-text("写新章节"), a:has-text("写新章节")').first();
            if (await createBtn.isVisible().catch(() => false)) {
                await createBtn.click({ force: true });
            } else {
                const chapManageBtn = bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
                await chapManageBtn.click({ force: true });
                await page.waitForTimeout(3000);
                const newChapBtn = page.locator('button:has-text("新建章节"), a:has-text("新建章节"), button:has-text("写新章节")').first();
                await newChapBtn.click({ force: true });
            }
            await page.waitForTimeout(3000);
        }

        console.log("⏳ 等待页面跳转并查找编辑器...");
        let targetPage = page;
        for (let attempt = 0; attempt < 15; attempt++) {
            for (const p of context.pages()) {
                if (p.url().includes('/publish/')) {
                    targetPage = p;
                    console.log("✅ 找到编辑器页面！ URL: " + p.url());
                    break;
                }
            }
            if (targetPage !== page) break;
            await page.waitForTimeout(1000);
        }

        await targetPage.bringToFront();
        await targetPage.waitForTimeout(2000);

        // 关闭可能出现的新手引导弹窗
        try {
            await targetPage.mouse.click(258, 320).catch(() => {});
            await targetPage.keyboard.press('Escape').catch(() => {});
        } catch (_) {}

        console.log(`📝 填写标题: ${chapterTitle}`);
        const parseChapterTitle = (raw) => {
            const m = raw.match(/^\s*第\s*([\d一二三四五六七八九十百千零两]+)\s*章\s*[:：、\.\s]*(.*?)\s*$/);
            if (!m) return { chapNum: "", actualTitle: raw };
            const numStr = m[1];
            if (/^\d+$/.test(numStr)) return { chapNum: numStr, actualTitle: m[2] };
            const digitMap = { '零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
            const unitMap = { '十':10,'百':100,'千':1000 };
            let total = 0, section = 0, current = 0;
            for (const ch of numStr) {
                if (digitMap[ch] !== undefined) { current = digitMap[ch]; }
                else if (unitMap[ch]) {
                    if (current === 0) current = 1;
                    section += current * unitMap[ch];
                    current = 0;
                }
            }
            total = section + current;
            return { chapNum: String(total), actualTitle: m[2] };
        };

        const { chapNum, actualTitle } = parseChapterTitle(chapterTitle);
        console.log(`   -> 解析结果: 第${chapNum || '?'}章 | 标题="${actualTitle}"`);

        // 填入章节序号（第一输入框）
        if (chapNum) {
            const chapInput = targetPage.locator('input.serial-input:not([placeholder])').first();
            if (await chapInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await chapInput.click();
                await chapInput.fill(chapNum);
                await chapInput.blur();
                console.log(`✅ 已填入章节序号: ${chapNum}`);
            }
        }

        // 填入标题
        const titleLocator = targetPage.locator('input[placeholder*="请输入标题"]').first();
        await titleLocator.waitFor({ state: 'visible', timeout: 5000 });
        await titleLocator.click();
        await titleLocator.fill(actualTitle);
        await titleLocator.blur();
        console.log(`✅ 已填入章节标题: ${actualTitle}`);
        await targetPage.waitForTimeout(1000);

        console.log("📝 填写正文...");
        const rawText = fs.readFileSync(contentFile, 'utf8');
        const paragraphs = rawText.split('\n')
            .map(p => p.trim())
            .filter(p => p !== '');
        const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

        try {
            console.log("👉 注入正文到主编辑器 (.serial-editor-content .ProseMirror)...");
            await targetPage.evaluate((html) => {
                const el = document.querySelector('.serial-editor-content .ProseMirror, .ProseMirror');
                if (el) {
                    el.innerHTML = html;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    throw new Error("Main editor not found");
                }
            }, htmlContent);

            const mainEditor = targetPage.locator('.serial-editor-content .ProseMirror').first();
            await mainEditor.click();
            await targetPage.keyboard.type('。');
            await targetPage.keyboard.press('Backspace');
            await targetPage.waitForTimeout(1000);

            // 点击“存草稿”以同步云端状态并解锁下一步按钮
            console.log("👉 点击【存草稿】同步云端状态...");
            const saveBtn = targetPage.locator('button:has-text("存草稿")').first();
            if (await saveBtn.isVisible().catch(() => false)) {
                await saveBtn.click();
                await targetPage.waitForTimeout(2500);
            }
        } catch(e) {
            console.error("❌ 注入正文失败:", e);
        }

        console.log("🚀 寻找保存/发布按钮 (下一步)...");
        const nextBtn = targetPage.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
        await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
        await nextBtn.click({ force: true });
        console.log("👉 已点击【下一步】按钮，等待发布弹窗流程...");

        // 循环处理错别字弹窗、风险检测弹窗与发布设置弹窗
        for (let i = 0; i < 25; i++) {
            await targetPage.waitForTimeout(1500);
            
            // 1. 处理错别字提示弹窗
            const typoModal = targetPage.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                const submitTypoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定")').first();
                if (await submitTypoBtn.isVisible().catch(() => false)) {
                    console.log("👉 发现错别字发布提示，点击提交继续...");
                    await submitTypoBtn.click();
                    await targetPage.waitForTimeout(1000);
                }
            }
            
            // 2. 处理内容/风险检测弹窗
            const riskModal = targetPage.locator(
                [
                    '.arco-modal:has-text("风险检测")',
                    '.arco-modal:has-text("内容检测")',
                    '.arco-modal:has-text("基础检测")',
                    '.arco-modal:has-text("全面检测")',
                    '[role="dialog"]:has-text("请选择内容检测方式")',
                    '[role="dialog"]:has-text("基础检测")',
                    '[role="dialog"]:has-text("全面检测")',
                ].join(', ')
            ).first();

            if (await riskModal.isVisible().catch(() => false)) {
                console.log("⚠️ 发现内容风险检测弹窗...");
                const basicOnlyBtn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测")').first();
                const confirmBtn = riskModal.locator('button:has-text("确定"), button:has-text("开始检测"), button:has-text("下一步")').first();

                if (await basicOnlyBtn.isVisible().catch(() => false)) {
                    console.log("👉 点击【仅基础检测】...");
                    await basicOnlyBtn.click();
                } else if (await confirmBtn.isVisible().catch(() => false)) {
                    console.log("👉 点击确认按钮推进检测...");
                    await confirmBtn.click();
                }
                await targetPage.waitForTimeout(1000);
            }

            // 3. 处理发布设置（AI 声明弹窗）
            const publishModal = targetPage.locator(
                '.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")'
            ).first();

            if (await publishModal.isVisible().catch(() => false)) {
                console.log("👉 发现发布设置弹窗，选择【否】不使用AI创作辅助标签...");
                const noAiRadio = publishModal.locator(
                    '.arco-radio:has-text("否"), label:has-text("否"), [role="radio"]:has-text("否")'
                ).first();
                if (await noAiRadio.isVisible().catch(() => false)) {
                    await noAiRadio.click();
                    await targetPage.waitForTimeout(500);
                }

                console.log("🚀 点击【确认提交/发布】最终按钮！");
                const confirmPublishBtn = publishModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
                if (await confirmPublishBtn.isVisible().catch(() => false)) {
                    await confirmPublishBtn.click();
                    console.log("🎉 发布提交完成，等待网络结算...");
                    await targetPage.waitForTimeout(4000);

                    // 截取最终发布成功截图
                    const finalShot = path.resolve(__dirname, '../../../assets/final_published_success.png');
                    await targetPage.screenshot({ path: finalShot, fullPage: true }).catch(() => {});
                    console.log("📸 已保存发布成果截图: " + finalShot);
                    break;
                }
            }
        }

        console.log("✅ 自动化推书流程全部执行完毕！");
        await targetPage.waitForTimeout(2000);

    } catch (e) { 
        console.error("❌ 发生错误:", e); 
    } finally { 
        console.log("关闭自动化会话");
        await context.close().catch(() => {});
        process.exit(0);
    }
})();
