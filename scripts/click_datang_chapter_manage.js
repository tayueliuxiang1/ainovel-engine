const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    let chapterApiData = null;
    page.on('response', async resp => {
        const url = resp.url();
        if (url.includes('/chapter') || url.includes('draft') || url.includes('item_list') || url.includes('chapter_list')) {
            console.log('章节相关 API 响应:', resp.status(), url);
            try {
                const json = await resp.json();
                console.log('响应数据摘要:', JSON.stringify(json).slice(0, 300));
                chapterApiData = json;
            } catch (e) {}
        }
    });

    console.log('1. 打开作品管理页...');
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);

    // 确保点击“小说”
    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        console.log('点击【小说】导航...');
        await novelMenu.click().catch(() => {});
        await page.waitForTimeout(3000);
    }

    // 找到包含大唐的卡片
    console.log('2. 定位大唐卡片中的【章节管理】链接/按钮...');
    const datangCard = page.locator('div, li, section').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
    await datangCard.waitFor({ timeout: 15000 });

    const chapterBtn = datangCard.locator('a:has-text("章节管理"), button:has-text("章节管理")').first();
    console.log('点击【章节管理】...');
    await chapterBtn.click();
    await page.waitForTimeout(6000);

    console.log('进入章节管理后的 URL:', page.url());
    await page.screenshot({ path: 'assets/real_chapter_list_page.png', fullPage: true });

    // 提取页面中的所有章节与操作按钮
    const pageReport = await page.evaluate(() => {
        const full = document.body.innerText;
        const buttons = Array.from(document.querySelectorAll('button, a')).map(b => ({
            text: b.innerText.trim(),
            href: b.getAttribute('href') || ''
        })).filter(b => b.text.length > 0 && b.text.length < 30);
        return {
            textSnippet: full.slice(0, 3000),
            buttons: buttons
        };
    });

    console.log('章节管理页面文本截取:\n', pageReport.textSnippet);
    console.log('\n按钮列表:', JSON.stringify(pageReport.buttons.filter(b => b.text.includes('章') || b.text.includes('修改') || b.text.includes('编辑') || b.text.includes('撤回') || b.text.includes('发布')), null, 2));

    await context.close();
})();
