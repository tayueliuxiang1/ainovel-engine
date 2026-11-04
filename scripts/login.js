const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    console.log("==================================================");
    console.log("🔑 番茄作家后台 一键免密持久化登录");
    console.log("==================================================");
    console.log("正在调用本地 Google Chrome 打开番茄作家专区...");
    console.log("提示：请在弹出的浏览器窗口中扫码或输入密码登录。");
    console.log("登录成功进入后台后，直接关闭浏览器窗口即可（登录凭证已自动持久化保存）。\n");

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: null
    });

    const page = context.pages()[0] || await context.newPage();
    await page.goto("https://fanqienovel.com/main/writer/book-manage");
    console.log("✅ 浏览器已启动！请在窗口中扫码登录番茄作家助手。");
    console.log("⏳ 脚本正在保持运行，等待您登录完毕并关闭浏览器...");

    // 保持进程运行，直到用户扫码完成并手动关闭浏览器窗口
    await new Promise((resolve) => {
        page.on('close', resolve);
        context.on('close', resolve);
    });
    console.log("\n🎉 检测到浏览器已关闭，登录凭证已成功持久化保存到本地！");
    process.exit(0);
})();
