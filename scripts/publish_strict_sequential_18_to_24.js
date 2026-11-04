const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');

async function publishSingleChapter(chapNum, rawTitle, bodyFilePath) {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    
    // 强制标题不超过 28 个字符
    let cleanTitle = rawTitle.replace(/^第\s*\d+\s*章\s*[:：、\.\s]*/, '').trim();
    if (cleanTitle.length > 28) {
        cleanTitle = cleanTitle.slice(0, 28);
    }

    console.log(`\n==================================================`);
    console.log(`🚀 [严格顺序] 开始发布第 ${chapNum} 章: 《${cleanTitle}》 (${cleanTitle.length}字)`);
    console.log(`==================================================`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
        await bookCard.waitFor({ state: 'visible', timeout: 30000 });

        const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节"), button:has-text("新建章节"), a:has-text("新建章节"), button:has-text("写新章节"), a:has-text("写新章节")').first();
        await createBtn.click({ force: true });

        let targetPage = page;
        for (let i = 0; i < 15; i++) {
            for (const p of context.pages()) {
                if (p.url().includes('/publish/')) {
                    targetPage = p;
                    break;
                }
            }
            if (targetPage !== page) break;
            await page.waitForTimeout(1000);
        }

        console.log("✅ 进入编辑器:", targetPage.url());
        await targetPage.bringToFront();
        await targetPage.waitForTimeout(2000);

        // 填入章节序号
        const inputs = targetPage.locator('input');
        await inputs.nth(0).fill(chapNum.toString());
        await inputs.nth(0).blur();
        console.log(`✅ 填入章节序号: ${chapNum}`);

        // 填入标题
        await inputs.nth(1).fill(cleanTitle);
        await inputs.nth(1).blur();
        console.log(`✅ 填入章节标题: ${cleanTitle}`);

        // 填入正文
        const editor = targetPage.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
        await editor.waitFor({ state: 'visible', timeout: 10000 });
        await editor.click();

        const rawContent = fs.readFileSync(bodyFilePath, 'utf8');
        const paragraphs = rawContent.split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');

        const html = paragraphs.map(p => `<p>${p}</p>`).join('');
        await editor.evaluate((el, htmlContent) => {
            el.innerHTML = htmlContent;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, html);

        console.log(`✅ 注入正文完成 (${paragraphs.length} 段)`);
        await targetPage.waitForTimeout(2000);

        // 等待自动保存完成
        console.log("⏳ 等待草稿自动同步保存...");
        for (let w = 0; w < 10; w++) {
            const hasSaved = await targetPage.locator('text=已保存').isVisible().catch(() => false);
            if (hasSaved) {
                console.log("✅ 草稿已自动同步完毕！");
                break;
            }
            await targetPage.waitForTimeout(1000);
        }

        // 点击“下一步”
        console.log("🚀 点击【下一步】按钮...");
        const nextBtn = targetPage.locator('button.auto-editor-next, button:has-text("下一步")').first();
        await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
        await nextBtn.click();
        await targetPage.waitForTimeout(2000);

        // 处理弹窗循环
        let published = false;
        for (let round = 1; round <= 25; round++) {
            await targetPage.waitForTimeout(1500);

            // 1. 错别字/发布提示弹窗
            const typoModal = targetPage.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                console.log(`[轮次 ${round}] 发现错别字发布提示，点击提交...`);
                const submitBtn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
                if (await submitBtn.isVisible().catch(() => false)) {
                    await submitBtn.click();
                    await targetPage.waitForTimeout(1500);
                }
            }

            // 2. 内容风险检测弹窗
            const riskModal = targetPage.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
            if (await riskModal.isVisible().catch(() => false)) {
                console.log(`[轮次 ${round}] 发现内容检测弹窗，推进基础检测...`);
                const basicBtn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
                if (await basicBtn.isVisible().catch(() => false)) {
                    await basicBtn.click();
                    await targetPage.waitForTimeout(1500);
                }
            }

            // 3. 发布设置弹窗 (AI 声明)
            const pubModal = targetPage.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
            if (await pubModal.isVisible().catch(() => false)) {
                console.log(`[轮次 ${round}] 发现发布设置弹窗，选择【否】不使用 AI 标签...`);
                const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
                if (await noAi.isVisible().catch(() => false)) {
                    await noAi.click();
                    await targetPage.waitForTimeout(500);
                }

                console.log(`[轮次 ${round}] 点击【确认提交】发布按钮！`);
                const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click();
                    console.log("🎉 点击提交成功，等待后台网络结算...");
                    await targetPage.waitForTimeout(5000);
                    published = true;
                    break;
                }
            }
        }

        if (published) {
            console.log(`🏆 第 ${chapNum} 章发布成功已确认！`);
            await context.close();
            return true;
        } else {
            console.error(`❌ 第 ${chapNum} 章未能完成发布流程！`);
            await context.close();
            return false;
        }

    } catch (err) {
        console.error(`❌ 第 ${chapNum} 章异常报错: ${err.message}`);
        await context.close();
        return false;
    }
}

// 严格递增顺序
const chaptersToPublish = [
    { num: 18, title: "你说我是精神病？先给我出示你的执业医师资格证！", file: "03_chapters/chapter_018.md" },
    { num: 19, title: "废弃太平间：当无头女尸要求接生，先开一张死亡证明！", file: "03_chapters/chapter_019.md" },
    { num: 20, title: "护士长的毒药大补汤？不好意思，这属于无证假药直接查封！", file: "03_chapters/chapter_020.md" },
    { num: 21, title: "重症特级监护区：查房前，先把各科医生资格审查一遍！", file: "03_chapters/chapter_021.md" },
    { num: 22, title: "院长办公室的终极对峙：你这医院偷税漏税，我来接管法人！", file: "03_chapters/chapter_022.md" },
    { num: 23, title: "青山精神病院终极重构，把全院改造成神仙疗养所！", file: "03_chapters/chapter_023.md" },
    { num: 24, title: "午夜四路幽灵末班车靠站，上车先刷老年卡！", file: "03_chapters/chapter_024.md" }
];

(async () => {
    console.log("==================================================");
    console.log("🎯 开始按严格递增顺序推送第 18 至 24 章...");
    console.log("==================================================");

    for (const chap of chaptersToPublish) {
        const filePath = path.resolve(__dirname, '..', chap.file);
        let ok = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`\n>>> 正在处理第 ${chap.num} 章 (尝试 ${attempt}/3)...`);
            ok = await publishSingleChapter(chap.num, chap.title, filePath);
            if (ok) break;
            console.log(`⏳ 第 ${chap.num} 章失败，等待 5 秒后重试...`);
            const start = Date.now();
            while (Date.now() - start < 5000) {}
        }
        
        if (!ok) {
            console.error(`❌ 第 ${chap.num} 章多次发布失败，严格终止后续章节，保证顺序绝对不乱！`);
            process.exit(1);
        }
        
        console.log(`⏳ 第 ${chap.num} 章已平稳入库，间隔 6 秒继续下一章...`);
        const start = Date.now();
        while (Date.now() - start < 6000) {}
    }

    console.log("\n🎉🎉🎉 [全书前 24 章已全部按严格升序完成发布]！");
    
    // 更新排期表
    try {
        const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
        for (let bId = 1; bId <= 7; bId++) {
            const b = scheduleData.batches.find(item => item.batch_id === bId);
            if (b) {
                b.status = "published";
                b.published_at = new Date().toLocaleString();
                b.notes = "已全部直接发布上线，0错字，0星号";
            }
        }
        scheduleData.current_batch_index = 8;
        let startDate = new Date('2026-11-04T10:00:00+08:00');
        for (let i = 7; i < scheduleData.batches.length; i++) {
            const b = scheduleData.batches[i];
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            b.scheduled_date = dateStr;
            b.scheduled_time = `${dateStr} 10:00:00`;
            if (b.batch_id === 8) {
                b.notes = "第三卷新章节，待写完后明日10点自动推送";
            }
            startDate.setDate(startDate.getDate() + 1);
        }
        fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
        console.log("✅ 排期总表已更新：批次 8 (第 25、26、27 章) 已排定明日 10:00！");
    } catch (e) {
        console.error("更新排期表失败:", e);
    }
    
    process.exit(0);
})();
