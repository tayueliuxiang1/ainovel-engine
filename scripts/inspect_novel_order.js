const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '让你遵守规则，你把诡异逼疯了？';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    // 1. Check reader-facing page
    console.log("=== 1. CHECKING READER FACING CATALOG ===");
    try {
        await page.goto("https://fanqienovel.com/page/7703749876651150360", { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        
        // Take screenshot of reader page
        await page.screenshot({ path: path.resolve(__dirname, '../assets/reader_novel_page.png'), fullPage: true });

        const catalogLinks = await page.locator('a[href*="/reader/"], .chapter-item, .catalog-item, [class*="chapter-item"]').all();
        console.log(`Found ${catalogLinks.length} catalog elements on reader page:`);
        for (let i = 0; i < catalogLinks.length; i++) {
            const txt = await catalogLinks[i].innerText().catch(() => '');
            if (txt.includes('第') || txt.includes('章')) {
                console.log(`Reader Catalog [${i+1}]: ${txt.replace(/\s+/g, ' ')}`);
            }
        }
    } catch (e) {
        console.error("Reader page check error:", e.message);
    }

    // 2. Check writer manage page
    console.log("\n=== 2. CHECKING WRITER MANAGE CHAPTER LIST ===");
    try {
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const card = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
        await card.waitFor({ timeout: 25000 });
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(4000);

        // Screenshot
        await page.screenshot({ path: path.resolve(__dirname, '../assets/writer_manage_page1.png'), fullPage: true });

        const bodyText = await page.evaluate(() => document.body.innerText);
        const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
        console.log("Writer Page 1 Chapters:");
        lines.filter(l => l.includes('第') && l.includes('章')).forEach(l => console.log('  ' + l));

        // Check if there is "编辑分卷" or "设置" or "调整顺序"
        const toolBtns = await page.locator('button, a, .arco-btn').filter({ hasText: /分卷|排序|调整|设置/ }).allInnerTexts().catch(() => []);
        console.log("\nAvailable management buttons:", toolBtns);

        // Check page 2
        const page2 = page.locator('.arco-pagination-item:has-text("2"), button:has-text("2")').first();
        if (await page2.isVisible().catch(() => false)) {
            await page2.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.resolve(__dirname, '../assets/writer_manage_page2.png'), fullPage: true });
            const bodyText2 = await page.evaluate(() => document.body.innerText);
            const lines2 = bodyText2.split('\n').map(l => l.trim()).filter(Boolean);
            console.log("\nWriter Page 2 Chapters:");
            lines2.filter(l => l.includes('第') && l.includes('章')).forEach(l => console.log('  ' + l));
        }

    } catch (e) {
        console.error("Writer page check error:", e.message);
    }

    await context.close();
})();
