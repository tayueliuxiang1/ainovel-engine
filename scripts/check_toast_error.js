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
        console.log("进入草稿页查看当前状态...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        // 截图当前草稿状态
        await page.screenshot({ path: path.resolve(__dirname, '../assets/current_draft.png') });
        console.log("已保存草稿截图 current_draft.png");

        // 点击右上角下一步
        const allNextBtns = page.locator('button:has-text("下一步")');
        const nextCount = await allNextBtns.count();
        let targetBtn = null;
        for (let i = 0; i < nextCount; i++) {
            const btn = allNextBtns.nth(i);
            const box = await btn.boundingBox();
            if (box && box.y < 120 && box.x > 800) {
                targetBtn = btn;
                break;
            }
        }
        if (targetBtn) {
            console.log("点击右上角【下一步】...");
            await targetBtn.click({ force: true });
            await page.waitForTimeout(2000);

            // 截图
            await page.screenshot({ path: path.resolve(__dirname, '../assets/after_click_next.png') });
            console.log("已保存点击下一步后的截图 after_click_next.png");

            // 检查 Toast 消息与所有文本
            const messages = await page.evaluate(() => {
                const list = [];
                document.querySelectorAll('.arco-message, .arco-notification, [role="alert"], .byte-message').forEach(m => list.push(m.innerText));
                return list;
            });
            console.log("检测到浮动消息 Toast:\n", JSON.stringify(messages, null, 2));

            // 查看页面全部文本
            const body = await page.evaluate(() => document.body.innerText);
            console.log("页面全部文本:\n", body);
        }

    } catch (e) {
        console.error("异常:", e);
    } finally {
        await context.close();
    }
})();
