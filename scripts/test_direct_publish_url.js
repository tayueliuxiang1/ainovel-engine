const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    const testUrl = 'https://fanqienovel.com/main/writer/7704518175408278552/publish/7704528770274689560';
    console.log('正在直接打开第1章编辑链接:', testUrl);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    const title = await page.title();
    console.log('页面标题:', title);

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('输入框数量:', inputCount);
    for (let i = 0; i < inputCount; i++) {
        const val = await inputs.nth(i).inputValue().catch(() => '');
        console.log(`Input [${i}]: ${val}`);
    }

    const shotPath = path.resolve(__dirname, '..', 'assets', 'test_ch1_direct_url.png');
    await page.screenshot({ path: shotPath });
    console.log('截图已保存:', shotPath);

    await context.close();
})();
