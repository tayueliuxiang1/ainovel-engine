const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
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
        console.log("正在打开新书编辑器...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        // 填序号与标题
        const chapInput = page.locator('input[placeholder*="序号"], input').first();
        await chapInput.fill('1');
        await chapInput.blur();

        const titleInput = page.locator('input[placeholder*="标题"], input').nth(1);
        await titleInput.fill('曲江暗流');
        await titleInput.blur();
        console.log("已填序号与标题");

        // 注入正文
        const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
        await editor.click();
        
        const rawContent = fs.readFileSync(path.resolve(__dirname, '../03_chapters/chapter_001.md'), 'utf8');
        const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
        const html = paragraphs.map(p => `<p>${p}</p>`).join('');

        await editor.evaluate((el, htmlContent) => {
            el.innerHTML = htmlContent;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, html);

        // 触发键盘输入激活状态
        await page.keyboard.type('。');
        await page.keyboard.press('Backspace');
        console.log("正文注入完成并激活编辑状态");
        await page.waitForTimeout(2000);

        // 点击存草稿
        const saveBtn = page.locator('button:has-text("存草稿")').first();
        if (await saveBtn.isVisible().catch(() => false)) {
            await saveBtn.click();
            console.log("已点击【存草稿】");
            await page.waitForTimeout(3000);
        }

        // 截图记录点击下一步之前的状态
        await page.screenshot({ path: path.resolve(__dirname, '../assets/step1_before_next.png') });

        // 点击下一步
        const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
        console.log("准备点击【下一步】...");
        await nextBtn.click({ force: true });
        await page.waitForTimeout(3000);

        // 截图记录点击下一步之后的状态
        await page.screenshot({ path: path.resolve(__dirname, '../assets/step2_after_next.png') });
        console.log("已保存下一步后的截图 step2_after_next.png");

        // 打印此时页面所有的弹窗与文字
        const dialogText = await page.evaluate(() => {
            const modals = document.querySelectorAll('.arco-modal, [role="dialog"], .byte-modal');
            const res = [];
            modals.forEach(m => res.push(m.innerText));
            return res;
        });
        console.log("检测到所有弹窗内容:\n", JSON.stringify(dialogText, null, 2));

        // 检查是否有分卷未选择或弹窗
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log("页面当前可见核心文本:\n", bodyText.slice(0, 500));

    } catch (err) {
        console.error("调试捕获异常:", err);
    } finally {
        await context.close();
    }
})();
