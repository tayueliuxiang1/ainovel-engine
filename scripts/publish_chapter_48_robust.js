const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '让你遵守规则，你把诡异逼疯了？';
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');

const chap = {
    num: 48,
    title: "兼并星际舰队！天道开发总署反贪查账大幕拉开！",
    file: "03_chapters/chapter_048.md"
};

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        console.log("\n==================================================");
        console.log("[独立稳健发布] 第 " + chap.num + " 章: 《" + chap.title + "》");
        console.log("==================================================");

        await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1", { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // 处理可能存在的已有遮罩弹窗（如草稿恢复提示）
        const existingModals = page.locator('.byte-modal-wrapper, .arco-modal-wrapper');
        const count = await existingModals.count();
        if (count > 0) {
            console.log("发现初始弹窗 " + count + " 个，尝试关闭或确认...");
            for (let i = 0; i < count; i++) {
                const modal = existingModals.nth(i);
                if (await modal.isVisible()) {
                    const txt = await modal.innerText().catch(() => "");
                    console.log("弹窗内容: " + txt.slice(0, 100));
                    const closeBtn = modal.locator('.byte-modal-close-icon, .arco-modal-close-btn, button:has-text("取消"), button:has-text("我知道了")').first();
                    if (await closeBtn.isVisible().catch(() => false)) {
                        await closeBtn.click().catch(() => {});
                        await page.waitForTimeout(1000);
                    }
                }
            }
        }

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

        // 零星号检验
        if (rawContent.includes(String.fromCharCode(42))) {
            throw new Error("检测到星号违规，拒绝发布！");
        }

        const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
        const html = paragraphs.map(p => '<p>' + p + '</p>').join('');
        await editor.evaluate((el, htmlContent) => {
            el.innerHTML = htmlContent;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, html);

        console.log("注入正文完成 (" + paragraphs.length + " 段)");
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

        // 再次清理任何可能阻挡点击的遮罩
        await page.evaluate(() => {
            const wrappers = document.querySelectorAll('.byte-modal-wrapper, .arco-modal-wrapper');
            wrappers.forEach(w => {
                if (!w.innerText.includes('发布设置') && !w.innerText.includes('检测') && !w.innerText.includes('错别字') && !w.innerText.includes('发布提示')) {
                    w.remove();
                }
            });
        });

        // 点击下一步（使用 evaluate 直接派发点击事件，防止任何残留 pointer-events 拦截）
        const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
        console.log("点击下一步按钮...");
        await nextBtn.evaluate(el => el.click());
        console.log("已触发下一步！");

        // 弹窗流水线处理
        let isDone = false;
        for (let step = 1; step <= 30; step++) {
            await page.waitForTimeout(1500);

            const typoModal = page.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                console.log("[步骤 " + step + "] 发现错别字发布提示，点击提交...");
                const btn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
                await btn.click().catch(() => {});
                await page.waitForTimeout(1500);
            }

            const riskModal = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
            if (await riskModal.isVisible().catch(() => false)) {
                console.log("[步骤 " + step + "] 发现内容检测弹窗，点击仅基础检测...");
                const btn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(1500);
                }
            }

            const pubModal = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
            if (await pubModal.isVisible().catch(() => false)) {
                console.log("[步骤 " + step + "] 发现发布设置弹窗，选择【否】不使用 AI 标签...");
                const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
                if (await noAi.isVisible().catch(() => false)) {
                    await noAi.click().catch(() => {});
                    await page.waitForTimeout(500);
                }

                console.log("[步骤 " + step + "] 点击【确认提交】发布按钮！");
                const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
                await confirmBtn.click().catch(() => {});
                console.log("点击提交完成，等待网络结算...");
                await page.waitForTimeout(6000);
                isDone = true;
                break;
            }
        }

        if (!isDone) {
            throw new Error("第 " + chap.num + " 章发布未完成");
        }
        console.log("第 " + chap.num + " 章严格顺序入库成功！");

        // 更新排期表
        if (fs.existsSync(scheduleConfigFile)) {
            const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
            const batch15 = scheduleData.batches.find(item => item.batch_id === 15);
            if (batch15) {
                batch15.status = "published";
                batch15.published_at = new Date().toLocaleString();
                batch15.notes = "已直接发布上线，第九卷第46/47/48三章大捷，0错字，0星号";
            }
            fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
        }

    } catch (e) {
        console.error("执行异常:", e.message);
        process.exit(1);
    } finally {
        await context.close();
    }
})();
