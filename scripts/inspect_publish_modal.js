// 探测草稿箱发布流程中的实际弹窗与确认按钮
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const card = page.locator('.completion-book-item-main, div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
    await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
    await page.waitForTimeout(5000);

    // 点击草稿箱
    const draftTab = page.locator('div, span, a').filter({ hasText: /^草稿箱/ }).first();
    await draftTab.click();
    await page.waitForTimeout(3000);

    // 查看草稿箱第一行的操作按钮
    const firstRow = page.locator('tbody tr').first();
    const actionBtns = await firstRow.evaluate(tr => {
        const btns = Array.from(tr.querySelectorAll('button, a'));
        return btns.map(b => b.innerText.trim());
    });
    console.log('草稿第一行操作按钮:', actionBtns);

    // 点击【发布】或【编辑】
    const publishBtn = firstRow.locator('button:has-text("发布"), a:has-text("发布")').first();
    if (await publishBtn.isVisible().catch(() => false)) {
        console.log('点击草稿行的【发布】按钮...');
        await publishBtn.click();
        await page.waitForTimeout(3000);

        // 截取点击发布后的弹窗
        const modalShot = path.join(__dirname, '..', 'assets', 'inspect_publish_modal.png');
        await page.screenshot({ path: modalShot, fullPage: false });
        console.log('发布弹窗截图存入:', modalShot);

        // 分析所有弹出的模态框和按钮文本
        const modalInfo = await page.evaluate(() => {
            const modals = Array.from(document.querySelectorAll('.arco-modal, .byte-modal, div[role="dialog"]'));
            return modals.map(m => {
                const text = m.innerText.replace(/\n+/g, ' | ');
                const btns = Array.from(m.querySelectorAll('button')).map(b => b.innerText.trim());
                return { text, btns };
            });
        });
        console.log('弹窗结构信息:', JSON.stringify(modalInfo, null, 2));
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
