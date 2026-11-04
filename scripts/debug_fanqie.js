const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    console.log("🔍 启动诊断脚本，排查番茄后台 DOM 结构...");

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true, // 无头运行，截屏查看
        channel: 'chrome',
        viewport: { width: 1280, height: 800 }
    });

    let page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 访问作品管理页面...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);

        // 截取第 1 张图：作品管理主页
        const shot1 = path.resolve(__dirname, '../assets/debug_step1_book_manage.png');
        await page.screenshot({ path: shot1, fullPage: true });
        console.log(`📸 截图 1 已保存: ${shot1}`);

        // 查找小说元素
        console.log(`🔎 查找小说: ${novelName}`);
        const novelLocator = page.locator(`text="${novelName}"`).first();
        const isNovelFound = await novelLocator.isVisible().catch(() => false);
        console.log(`   -> 小说元素是否可见: ${isNovelFound}`);

        if (isNovelFound) {
            console.log("👉 点击小说卡片...");
            await novelLocator.click();
            await page.waitForTimeout(4000);

            // 检查是否有新标签页弹出
            console.log(`📑 当前打开的页面数量: ${context.pages().length}`);
            for (let i = 0; i < context.pages().length; i++) {
                const p = context.pages()[i];
                console.log(`   [Page ${i}] URL: ${p.url()} | Title: ${await p.title()}`);
            }

            const activePage = context.pages()[context.pages().length - 1];
            await activePage.bringToFront();
            await activePage.waitForTimeout(2000);

            // 截取第 2 张图：点击小说后的界面
            const shot2 = path.resolve(__dirname, '../assets/debug_step2_after_click_novel.png');
            await activePage.screenshot({ path: shot2, fullPage: true });
            console.log(`📸 截图 2 已保存: ${shot2}`);

            // 打印页面上所有包含“章”或者“写”或者“建”的按钮/文字
            const buttons = await activePage.evaluate(() => {
                const els = Array.from(document.querySelectorAll('button, a, .arco-btn, span'));
                return els
                    .map(el => (el.innerText || '').trim())
                    .filter(t => t.length > 0 && t.length < 20 && (/章|写|建|发|卷/i.test(t)))
                    .slice(0, 30);
            });
            console.log("📋 页面相关操作按钮列表:\n", Array.from(new Set(buttons)));
        }
    } catch (err) {
        console.error("❌ 诊断过程中发生错误:", err);
    } finally {
        await context.close();
        console.log("🏁 诊断结束，浏览器已关闭。");
    }
})();
