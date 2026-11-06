const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const { applyStealthEvasions } = require('./stealth_utils');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = '大唐：盗我抗旱图';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
    if (await novelMenu.isVisible().catch(() => false)) {
        await novelMenu.click();
        await page.waitForTimeout(3000);
    }

    const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: novelName }).filter({ hasText: '章节管理' }).last();
    await card.waitFor({ timeout: 25000 });
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    // 检查页面上的全部 Tab 标签（例如：已发布、草稿箱、待审核）
    const tabs = await page.evaluate(() => {
        const tabList = [];
        const tabElements = document.querySelectorAll('.arco-tabs-header-cell, .arco-tabs-tab, div[role="tab"]');
        tabElements.forEach(t => tabList.push({ text: t.innerText.trim(), active: t.className.includes('active') }));
        return tabList;
    });
    console.log('检测到的 Tabs:\n', JSON.stringify(tabs, null, 2));

    // 检查第一行（第8章）和最后一行（第1章）最后一列的操作按钮
    // 鼠标悬停在第1章所在行上触发 hover 效果
    const row1 = page.locator('tr:has-text("第1章")').first();
    await row1.hover();
    await page.waitForTimeout(1000);

    const row1Ops = await page.evaluate(() => {
        const tr = document.querySelector('tr:has-text("第1章")') || Array.from(document.querySelectorAll('tr')).find(r => r.innerText.includes('第1章'));
        if (!tr) return null;
        const tds = Array.from(tr.querySelectorAll('td'));
        const lastTd = tds[tds.length - 1];
        return {
            lastTdText: lastTd ? lastTd.innerText : '',
            lastTdHtml: lastTd ? lastTd.innerHTML : '',
            allButtonsInRow: Array.from(tr.querySelectorAll('button, a')).map(b => ({
                text: b.innerText.trim(),
                href: b.getAttribute('href') || '',
                tag: b.tagName
            }))
        };
    });
    console.log('第1章行的操作列详情:\n', JSON.stringify(row1Ops, null, 2));

    // 搜索整个页面 DOM 是否存在“第2章”
    const hasChap2 = await page.evaluate(() => {
        return document.body.innerText.includes('第2章');
    });
    console.log('当前页面是否包含“第2章”:', hasChap2);

    await context.close();
})();
