const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    console.log("Navigating to https://fanqienovel.com/main/writer/book-manage ...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const shotPath = path.resolve(__dirname, '../assets/book_manage_detailed.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    // 检查页面上与书本相关的卡片或操作按钮
    const elements = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('*')).filter(el => {
            return el.innerText && el.innerText.includes('让你遵守规则');
        });
        
        // 获取所有可点击元素
        const clickables = Array.from(document.querySelectorAll('a, button, span, div')).filter(el => {
            const text = (el.innerText || '').trim();
            return (
                text.includes('章节') ||
                text.includes('写') ||
                text.includes('管理') ||
                text.includes('发布') ||
                text.includes('编辑') ||
                text.includes('草稿')
            ) && text.length < 20;
        }).map(el => ({
            tag: el.tagName,
            text: el.innerText.trim(),
            href: el.getAttribute('href') || '',
            className: el.className
        }));

        return {
            totalMatchingCards: cards.length,
            clickables: clickables.slice(0, 30)
        };
    });

    console.log("=== CLICKABLE ELEMENTS ON BOOK-MANAGE ===");
    console.log(JSON.stringify(elements, null, 2));

    await context.close();
})();
