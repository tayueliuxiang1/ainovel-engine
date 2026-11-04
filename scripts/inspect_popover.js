const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节")').first();
    await createBtn.click();
    await page.waitForTimeout(4000);

    let editorPage = page;
    for (const p of context.pages()) {
        if (p.url().includes('/publish/')) {
            editorPage = p;
            break;
        }
    }
    await editorPage.bringToFront();
    await editorPage.waitForTimeout(2000);

    // 查找包含 1/3 或分卷或下一步的所有元素
    const popoverInfo = await editorPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*')).filter(el => {
            return el.innerText && el.innerText.includes('这里可以设置分卷');
        });
        
        if (els.length === 0) return "No popover found";
        // 找到最小的容器
        let smallest = els[0];
        for (let el of els) {
            if (el.innerText.length < smallest.innerText.length) {
                smallest = el;
            }
        }

        const buttons = Array.from(smallest.querySelectorAll('button, span, div')).filter(b => {
            return b.innerText && (b.innerText.includes('下一步') || b.innerText.includes('跳过') || b.innerText.includes('完成'));
        }).map(b => ({
            tag: b.tagName,
            text: b.innerText.trim(),
            className: b.className,
            outerHTML: b.outerHTML
        }));

        return {
            containerClass: smallest.className,
            containerHTML: smallest.outerHTML.slice(0, 500),
            buttons
        };
    });

    console.log("Popover Info:", JSON.stringify(popoverInfo, null, 2));

    await context.close();
})();
