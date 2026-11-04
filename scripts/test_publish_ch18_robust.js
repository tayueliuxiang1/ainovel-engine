const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function publishChapter(chapNum, title, bodyFilePath) {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    
    console.log(`\n==================================================`);
    console.log(`🚀 开始发布第 ${chapNum} 章: 《${title}》`);
    console.log(`==================================================`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 导航到作家后台作品管理...");
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
        const cleanTitle = title.replace(/^第\s*\d+\s*章\s*[:：、\.\s]*/, '').trim();
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

        // 等待自动保存完成 (查找包含 "已保存" 的提示)
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
        for (let round = 1; round <= 20; round++) {
            await targetPage.waitForTimeout(1500);

            // 1. 错别字/发布提示弹窗
            const typoModal = targetPage.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                console.log(`[轮次 ${round}] 发现错别字发布提示，点击提交...`);
                const submitBtn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
                await submitBtn.click();
                await targetPage.waitForTimeout(1500);
            }

            // 2. 内容风险检测弹窗
            const riskModal = targetPage.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
            if (await riskModal.isVisible().catch(() => false)) {
                console.log(`[轮次 ${round}] 发现内容检测弹窗，推进基础检测...`);
                const basicBtn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
                if (await basicBtn.isVisible()) {
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
                await confirmBtn.click();
                console.log("🎉 点击提交成功，等待后台网络结算...");
                await targetPage.waitForTimeout(5000);
                published = true;
                break;
            }
        }

        if (published) {
            console.log(`🏆 第 ${chapNum} 章发布成功已确认！`);
            await context.close();
            return true;
        } else {
            console.error(`❌ 第 ${chapNum} 章未能完成发布流程！`);
            await targetPage.screenshot({ path: path.resolve(__dirname, `../assets/fail_ch_${chapNum}.png`) });
            await context.close();
            return false;
        }

    } catch (err) {
        console.error(`❌ 异常报错: ${err.message}`);
        await context.close();
        return false;
    }
}

// Run for 18
(async () => {
    const chapFile = path.resolve(__dirname, '../03_chapters/chapter_018.md');
    const ok = await publishChapter(18, '你说我是精神病？先给我出示你的执业医师资格证！', chapFile);
    process.exit(ok ? 0 : 1);
})();
