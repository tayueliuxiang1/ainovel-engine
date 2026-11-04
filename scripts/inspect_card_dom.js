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

    console.log("Navigating to https://fanqienovel.com/main/writer/book-manage ...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // 找到包含特定小说名字的父容器
    const cardInfo = await page.evaluate((targetNovel) => {
        // 查找所有包含小说标题的元素
        const allElements = Array.from(document.querySelectorAll('*'));
        const titleEl = allElements.find(el => el.children.length === 0 && (el.innerText || '').trim() === targetNovel);
        if (!titleEl) return { error: "Title element not found" };

        // 向上寻找包含该书卡片的容器
        let container = titleEl;
        while (container && container !== document.body) {
            // 如果容器内包含"创建章节"或"章节管理"，且不包含另一本书的名字
            if (container.innerText.includes('创建章节') && !container.innerText.includes('五灵根')) {
                break;
            }
            container = container.parentElement;
        }

        const buttons = Array.from(container.querySelectorAll('button, a, .arco-btn')).map(b => ({
            tag: b.tagName,
            text: b.innerText.trim(),
            href: b.getAttribute('href') || '',
            className: b.className,
            outerHTML: b.outerHTML
        }));

        return {
            containerClass: container.className,
            containerHTML: container.outerHTML.slice(0, 1000),
            buttons
        };
    }, novelName);

    console.log("Card Info:", JSON.stringify(cardInfo, null, 2));

    await context.close();
})();
