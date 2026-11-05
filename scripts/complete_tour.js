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
        console.log("进入页面查看新手引导...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        // 查找所有带 1/3 或 下一步 的引导元素
        for (let i = 0; i < 5; i++) {
            const tourInfo = await page.evaluate(() => {
                // 查找包含 1/3, 2/3, 3/3 或 下一步 的小弹窗
                const allDivs = Array.from(document.querySelectorAll('div, button'));
                const tourBtn = allDivs.find(d => {
                    const text = d.innerText ? d.innerText.trim() : '';
                    return (text === '下一步' || text === '完成' || text === '我知道了' || text === '跳过') && d.offsetHeight < 50 && d.offsetWidth < 120;
                });
                if (tourBtn) {
                    const t = tourBtn.innerText.trim();
                    tourBtn.click();
                    return '已点击引导按钮: ' + t;
                }
                return '未发现引导按钮';
            });
            console.log(`第 ${i+1} 次检查引导:`, tourInfo);
            await page.waitForTimeout(1500);
        }

        // 截图查看是否消除引导
        await page.screenshot({ path: path.resolve(__dirname, '../assets/tour_cleared.png') });
        console.log("已保存截屏 tour_cleared.png");

    } catch (e) {
        console.error("执行异常:", e.message);
    } finally {
        await context.close();
    }
})();
