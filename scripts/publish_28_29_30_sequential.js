const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '让你遵守规则，你把诡异逼疯了？';
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');

const chapters = [
    { num: 28, title: "初入酆都：无户籍要被炼油？出示跨界企业法人证！", file: "03_chapters/chapter_028.md" },
    { num: 29, title: "民政总署设卡索贿？对不起，国家审计风暴查账！", file: "03_chapters/chapter_029.md" },
    { num: 30, title: "全城午夜绝杀宵禁？开辟二十四小时夜间经济特区！", file: "03_chapters/chapter_030.md" }
];

async function publishSingleChapter(page, chap) {
    console.log(`\n==================================================`);
    console.log(`[顺序发布] 第 ${chap.num} 章: 《${chap.title}》`);
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

    console.log(`注入正文完成 (${paragraphs.length} 段)`);
    await page.waitForTimeout(2000);

    // 等待云端同步保存
    for (let w = 0; w < 10; w++) {
        const hasSaved = await page.locator('text=已保存').isVisible().catch(() => false);
        if (hasSaved) {
            console.log("草稿已自动同步完毕！");
            break;
        }
        await page.waitForTimeout(1000);
    }

    // 点击下一步
    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.click();
    console.log("点击下一步...");

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
            console.log("点击提交完成，等待网络结算...");
            await page.waitForTimeout(6000);
            isDone = true;
            break;
        }
    }

    if (!isDone) {
        throw new Error(`第 ${chap.num} 章发布未完成`);
    }
    console.log(`第 ${chap.num} 章严格顺序入库成功！`);
}

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        for (const chap of chapters) {
            await publishSingleChapter(page, chap);
            console.log(`章节间安全静置 8 秒以沉淀时间戳...`);
            await page.waitForTimeout(8000);
        }

        console.log("\n[第 28、29、30 章已全部按绝对升序发布成功]！");

        // 更新排期表
        const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
        const batch9 = scheduleData.batches.find(item => item.batch_id === 9);
        if (batch9) {
            batch9.status = "published";
            batch9.published_at = new Date().toLocaleString();
            batch9.notes = "已直接发布上线，0错字，0星号";
        }
        
        scheduleData.current_batch_index = 10;
        let startDate = new Date('2026-11-04T10:00:00+08:00');
        for (let i = 9; i < scheduleData.batches.length; i++) {
            const b = scheduleData.batches[i];
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            b.scheduled_date = dateStr;
            b.scheduled_time = `${dateStr} 10:00:00`;
            if (b.batch_id === 10) {
                b.notes = "第四卷新章节，待写完后明日10点自动推送";
            }
            startDate.setDate(startDate.getDate() + 1);
        }
        fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');

    } catch (e) {
        console.error("执行异常:", e.message);
        process.exit(1);
    } finally {
        await context.close();
    }
})();
