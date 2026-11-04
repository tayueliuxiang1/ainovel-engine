const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const chap = {
    num: 45,
    title: "沙盒内测大圆满！高维生产集群跨界降临！",
    file: "03_chapters/chapter_045.md"
};

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        await page.goto("https://fanqienovel.com/main/writer/7703749876651150360/publish/", { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // 寻找包含 第45章 的行
        const targetRow = page.locator('.arco-table-tr:has-text("45"), tr:has-text("45")').first();
        if (!await targetRow.isVisible().catch(() => false)) {
            console.log("未在首页表格直接找到第45章行");
            return;
        }

        console.log("找到第45章表格行，寻找修改/编辑按钮...");
        const editBtn = targetRow.locator('button:has-text("修改"), a:has-text("修改"), button:has-text("编辑"), a:has-text("编辑")').first();
        if (await editBtn.isVisible().catch(() => false)) {
            console.log("点击【修改】按钮...");
            await editBtn.click();
            await page.waitForTimeout(3000);

            // 更新标题
            const inputs = page.locator('input');
            await inputs.nth(1).fill(chap.title);
            await inputs.nth(1).blur();

            // 更新正文
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

            console.log("正文与标题已更新，等待云端保存...");
            await page.waitForTimeout(3000);

            // 点击下一步
            const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
            await nextBtn.click();
            console.log("点击下一步...");

            // 处理发布弹窗
            for (let step = 1; step <= 20; step++) {
                await page.waitForTimeout(1500);

                const typoModal = page.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
                if (await typoModal.isVisible().catch(() => false)) {
                    const btn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
                    await btn.click();
                    await page.waitForTimeout(1500);
                }

                const riskModal = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
                if (await riskModal.isVisible().catch(() => false)) {
                    const btn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
                    if (await btn.isVisible()) {
                        await btn.click();
                        await page.waitForTimeout(1500);
                    }
                }

                const pubModal = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
                if (await pubModal.isVisible().catch(() => false)) {
                    const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
                    if (await noAi.isVisible().catch(() => false)) {
                        await noAi.click();
                        await page.waitForTimeout(500);
                    }
                    const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
                    await confirmBtn.click();
                    console.log("点击确认提交完成！");
                    await page.waitForTimeout(5000);
                    break;
                }
            }
            console.log("第45章更新成功！");
        } else {
            console.log("未找到修改按钮，打印该行按钮信息...");
            const btns = await targetRow.locator('button, a').all();
            for (const b of btns) {
                console.log("按钮文本:", await b.innerText().catch(() => ''));
            }
        }
    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
