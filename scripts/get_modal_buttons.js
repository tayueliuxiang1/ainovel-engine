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

        // 打印弹窗内所有 button 和 a 标签
        const elements = await page.evaluate(() => {
            const list = [];
            const modal = document.querySelector('.arco-modal, [role="dialog"]');
            if (modal) {
                modal.querySelectorAll('*').forEach(el => {
                    if (el.children.length === 0 && el.innerText && el.innerText.trim()) {
                        list.push({
                            tag: el.tagName,
                            text: el.innerText.trim(),
                            className: el.className
                        });
                    }
                });
            }
            return list;
        });
        console.log("弹窗内叶子节点元素列表:\n", JSON.stringify(elements, null, 2));

        // 尝试通过 evaluate 直接点击包含“仅基础检测”的元素
        const clicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const target = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (target) {
                target.click();
                return '成功通过 evaluate 点击【仅基础检测】';
            }
            const target2 = btns.find(b => b.innerText && b.innerText.trim() === '全面检测');
            if (target2) {
                target2.click();
                return '成功通过 evaluate 点击【全面检测】';
            }
            return '未找到目标按钮';
        });
        console.log("点击结果:", clicked);
        await page.waitForTimeout(3000);

        // 再次查看弹窗
        const nextModals = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('.arco-modal, [role="dialog"]').forEach(m => list.push(m.innerText));
            return list;
        });
        console.log("后续弹窗内容:\n", JSON.stringify(nextModals, null, 2));

        // 如果出现发布设置，点击确认发布！
        const finalPublished = await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => b.innerText && (b.innerText.trim() === '确认发布' || b.innerText.trim() === '确认提交'));
            if (confirmBtn) {
                confirmBtn.click();
                return '成功点击【确认发布】！';
            }
            return '未找到确认发布按钮';
        });
        console.log("终极发布状态:", finalPublished);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: path.resolve(__dirname, '../assets/step_final_status.png') });
        console.log("已保存终局截图 step_final_status.png");

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
