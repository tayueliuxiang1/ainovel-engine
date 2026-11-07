// 检查当前页面 URL 与登录态
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    console.log('访问 book-manage...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('当前页面URL:', page.url());
    console.log('当前页面标题:', await page.title());

    const isLogin = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return {
            hasLoginText: text.includes('登录') || text.includes('手机号'),
            hasUserName: text.includes('踏月难留香'),
            hasBookName: text.includes('大唐：盗我抗旱图'),
            bodySnippet: text.slice(0, 300)
        };
    });
    console.log('登录与内容判定:', JSON.stringify(isLogin, null, 2));

    const shot = path.join(__dirname, '..', 'assets', 'check_auth_status.png');
    await page.screenshot({ path: shot, fullPage: false });
    console.log('截图存入:', shot);

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
