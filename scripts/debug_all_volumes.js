// 深入排查分卷与各章节分布
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();

    console.log('导航进入作品管理列表...');
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

    // 1. 检查所有的分卷选项
    console.log('检查分卷下拉菜单...');
    const volumeSelect = page.locator('.arco-select, div[class~="select"]').filter({ hasText: '分卷' }).or(page.locator('div:has-text("第一卷")').first());
    const volumes = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('.arco-select-view-value, .volume-select, .arco-select'));
        return selects.map(s => s.innerText.trim());
    });
    console.log('页面上找到的下拉/分卷信息:', volumes);

    // 点击分卷下拉框查看所有选项
    const volDropdown = page.locator('.arco-select').first();
    if (await volDropdown.isVisible().catch(() => false)) {
        await volDropdown.click();
        await page.waitForTimeout(1500);
        const options = await page.evaluate(() => {
            const list = Array.from(document.querySelectorAll('.arco-select-option, li[role="option"]'));
            return list.map(o => o.innerText.trim());
        });
        console.log('所有可用分卷选项:', options);
        await page.keyboard.press('Escape');
    }

    // 2. 检查草稿箱
    console.log('检查草稿箱...');
    const draftTab = page.locator('div, span, a').filter({ hasText: /^草稿箱/ }).first();
    if (await draftTab.isVisible().catch(() => false)) {
        await draftTab.click();
        await page.waitForTimeout(3000);
        const draftShot = path.join(__dirname, '..', 'assets', 'drafts_tab.png');
        await page.screenshot({ path: draftShot, fullPage: false });
        const draftItems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tbody tr, .chapter-item')).map(r => r.innerText.trim().replace(/\n+/g, ' | '));
        });
        console.log('草稿箱内条目数:', draftItems.length);
        draftItems.forEach(d => console.log('草稿:', d));
    }

    // 3. 回到已发布章节列表，检查第二页
    const publishedTab = page.locator('div, span, a').filter({ hasText: /^章节管理/ }).first();
    if (await publishedTab.isVisible().catch(() => false)) {
        await publishedTab.click();
        await page.waitForTimeout(3000);
    }

    console.log('检查已发布章节的分页...');
    const pages = await page.evaluate(() => {
        const lis = Array.from(document.querySelectorAll('.arco-pagination-item, .arco-pagination li'));
        return lis.map(l => l.innerText.trim());
    });
    console.log('分页按钮列表:', pages);

    // 点击第 2 页
    const page2Btn = page.locator('.arco-pagination-item').filter({ hasText: /^2$/ }).first();
    if (await page2Btn.isVisible().catch(() => false)) {
        console.log('点击第 2 页...');
        await page2Btn.click();
        await page.waitForTimeout(3000);
        const p2Items = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tbody tr')).map(r => r.innerText.trim().replace(/\n+/g, ' | '));
        });
        console.log('第 2 页条目:');
        p2Items.forEach(p => console.log(p));
        const p2Shot = path.join(__dirname, '..', 'assets', 'published_page2.png');
        await page.screenshot({ path: p2Shot, fullPage: false });
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
