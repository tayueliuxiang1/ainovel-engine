const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    console.log("Navigating to https://fanqienovel.com/main/writer/book-manage ...");
    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting for novel element to be visible...");
    const novelLocator = page.locator(`text="${novelName}"`).first();
    await novelLocator.waitFor({ state: 'visible', timeout: 30000 });
    console.log("Found novel element!");

    // Take screenshot of book manage page with the novel visible
    const shotPath = path.resolve(__dirname, '../assets/book_manage_with_novel.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    // Find the enclosing card or row
    const cardInfo = await page.evaluate((name) => {
        const textNodes = Array.from(document.querySelectorAll('*')).filter(el => 
            el.innerText && el.innerText.includes(name) && el.children.length === 0
        );
        if (textNodes.length === 0) return null;

        // Traverse up to find a container card
        let curr = textNodes[0];
        let card = curr;
        for (let i = 0; i < 8; i++) {
            if (curr.parentElement) {
                curr = curr.parentElement;
                if (curr.querySelectorAll('button, a').length > 1) {
                    card = curr;
                    break;
                }
            }
        }

        const buttonsAndLinks = Array.from(card.querySelectorAll('button, a, .arco-btn, [role="button"]')).map(b => ({
            tag: b.tagName,
            text: (b.innerText || '').trim(),
            href: b.getAttribute('href') || '',
            className: b.className
        }));

        return {
            cardOuterHTMLSnippet: card.outerHTML.slice(0, 500),
            cardText: card.innerText,
            buttonsAndLinks
        };
    }, novelName);

    console.log("=== NOVEL CARD DETAILS ===");
    console.log(JSON.stringify(cardInfo, null, 2));

    await context.close();
})();
