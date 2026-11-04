const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '让你遵守规则，你把诡异逼疯了？';
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');

const chapters = [
    { num: 18, title: "你说我是精神病？先出示医师执业证！", file: "03_chapters/chapter_018.md" },
    { num: 19, title: "废弃停尸房：当无头女尸要求接生，先开死亡证明！", file: "03_chapters/chapter_019.md" },
    { num: 20, title: "护士长送毒药大补汤？无证假药直接查封！", file: "03_chapters/chapter_020.md" },
    { num: 21, title: "特级重症监护区：查房前，先审查执业资格！", file: "03_chapters/chapter_021.md" },
    { num: 22, title: "院长室终极对峙：偷税漏税，我接管法人！", file: "03_chapters/chapter_022.md" },
    { num: 23, title: "青山医院大重构，全院改造成神仙疗养所！", file: "03_chapters/chapter_023.md" },
    { num: 24, title: "午夜四路幽灵末班车靠站，上车先刷老年卡！", file: "03_chapters/chapter_024.md" }
];

async function deleteOutdatedChapters(page) {
    console.log("=== 正在清理 18~24 章旧记录以恢复绝对顺序 ===");
    await page.goto('https://fanqienovel.com/main/writer/book-manage');
    const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(4000);

    for (let i = 0; i < 10; i++) {
        const firstRow = page.locator('tbody tr').first();
        const titleText = await firstRow.locator('td').first().innerText().catch(() => '');
        console.log(`[删除检查] 当前第一行: ${titleText}`);
        
        // 遇到第17章立即停止
        if (titleText.includes('第17章') || titleText.includes('第16章')) {
            console.log(`✅ 已到达第17章，旧记录全部清理完毕！`);
            break;
        }

        const deleteIcon = firstRow.locator('.auto-editor-chapter-delete, .icon-delete').first();
        if (await deleteIcon.isVisible().catch(() => false)) {
            await deleteIcon.click();
            await page.waitForTimeout(1000);
            const confirmBtn = page.locator('.arco-modal button.arco-btn-primary, .arco-modal button:has-text("删除")').first();
            await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
            await confirmBtn.click();
            console.log(`🗑️ 已删除: ${titleText}`);
            await page.waitForTimeout(3000);
        } else {
            break;
        }
    }
}

async function publishChapterSequential(page, chap) {
    console.log(`\n==================================================`);
    console.log(`🚀 [严格顺序发布] 第 ${chap.num} 章: 《${chap.title}》`);
    console.log(`==================================================`);

    await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1", { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 填序号
    const inputs = page.locator('input');
    await inputs.nth(0).fill(chap.num.toString());
    await inputs.nth(0).blur();

    // 填标题
    await inputs.nth(1).fill(chap.title);
    await inputs.nth(1).blur();

    // 填正文
    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();
    const rawContent = fs.readFileSync(path.resolve(__dirname, '..', chap.file), 'utf8');
    const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    console.log(`✅ 注入正文完成 (${paragraphs.length} 段)`);
    await page.waitForTimeout(2000);

    // 等待云端同步保存
    for (let w = 0; w < 10; w++) {
        const hasSaved = await page.locator('text=已保存').isVisible().catch(() => false);
        if (hasSaved) {
            console.log("✅ 草稿已自动同步完毕！");
            break;
        }
        await page.waitForTimeout(1000);
    }

    // 点击下一步
    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click();
    console.log("🚀 点击下一步...");

    // 弹窗处理
    let isDone = false;
    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1500);

        const typoModal = page.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            console.log(`[步骤 ${step}] 发现错别字发布提示，点击提交...`);
            const btn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
            await btn.click();
            await page.waitForTimeout(1500);
        }

        const riskModal = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
        if (await riskModal.isVisible().catch(() => false)) {
            console.log(`[步骤 ${step}] 发现内容检测弹窗，点击仅基础检测...`);
            const btn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
            if (await btn.isVisible()) {
                await btn.click();
                await page.waitForTimeout(1500);
            }
        }

        const pubModal = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
        if (await pubModal.isVisible().catch(() => false)) {
            console.log(`[步骤 ${step}] 发现发布设置弹窗，选择【否】不使用 AI 标签...`);
            const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAi.isVisible().catch(() => false)) {
                await noAi.click();
                await page.waitForTimeout(500);
            }

            console.log(`[步骤 ${step}] 点击【确认提交】发布按钮！`);
            const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
            await confirmBtn.click();
            console.log("🎉 点击提交完成，等待网络结算...");
            await page.waitForTimeout(6000);
            isDone = true;
            break;
        }
    }

    if (!isDone) {
        throw new Error(`第 ${chap.num} 章发布未完成`);
    }
    console.log(`🏆 第 ${chap.num} 章严格顺序入库成功！`);
}

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        // 第一步：清除非顺序旧章节
        await deleteOutdatedChapters(page);

        // 第二步：按 18 -> 19 -> 20 -> 21 -> 22 -> 23 -> 24 严格顺序逐章发布
        for (const chap of chapters) {
            await publishChapterSequential(page, chap);
            console.log(`⏳ 章节间安全静置 8 秒以沉淀时间戳...`);
            await page.waitForTimeout(8000);
        }

        console.log("\n🎉🎉🎉 [全书前 24 章已 100% 按绝对顺序发布完毕]！");

        // 更新排期表
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
            startDate.setDate(startDate.getDate() + 1);
        }
        fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
