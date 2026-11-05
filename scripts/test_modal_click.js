const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log("进入编辑器...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        console.log("点击【下一步】...");
        const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
        await nextBtn.click({ force: true });
        await page.waitForTimeout(2500);

        // 尝试定位【仅基础检测】或【全面检测】
        console.log("定位检测弹窗按钮...");
        const basicBtn = page.locator('button:has-text("仅基础检测"), span:has-text("仅基础检测"), div:has-text("仅基础检测")').last();
        if (await basicBtn.isVisible()) {
            console.log("点击【仅基础检测】...");
            await basicBtn.click({ force: true });
        } else {
            const allBtn = page.locator('button:has-text("全面检测"), span:has-text("全面检测")').last();
            console.log("点击【全面检测】...");
            await allBtn.click({ force: true });
        }
        await page.waitForTimeout(3000);

        await page.screenshot({ path: path.resolve(__dirname, '../assets/step3_after_detection.png') });
        console.log("已保存检测后的截图 step3_after_detection.png");

        const modals = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.arco-modal, [role="dialog"]').forEach(m => list.push(m.innerText));
            return list;
        });
        console.log("检测后弹窗内容:\n", JSON.stringify(modals, null, 2));

        // 查找是否已经出现【发布设置】或【确认发布】
        const pubSettings = page.locator('text=发布设置');
        if (await pubSettings.isVisible().catch(() => false)) {
            console.log("✅ 成功到达【发布设置】弹窗！");
            
            // 是否使用AI创作辅助
            const noAiRadio = page.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAiRadio.isVisible().catch(() => false)) {
                await noAiRadio.click();
                console.log("已选否");
            }
            
            const confirmBtn = page.locator('button:has-text("确认发布"), button:has-text("确认提交"), button:has-text("提交")').first();
            if (await confirmBtn.isVisible().catch(() => false)) {
                console.log("点击【确认发布】！");
                await confirmBtn.click();
                await page.waitForTimeout(5000);
                await page.screenshot({ path: path.resolve(__dirname, '../assets/step4_published.png') });
                console.log("🎉 已保存发布成功后截图 step4_published.png！");
            }
        }

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
