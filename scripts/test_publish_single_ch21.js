// 单步精准发布测试：第21章
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await applyStealthEvasions(page);

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
    console.log('1. 导航进入新建章节:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 清理弹窗与新手引导
    await page.evaluate(() => {
        const popovers = document.querySelectorAll('.arco-popover, .byte-modal-mask, .byte-modal-wrapper, .guide-modal');
        popovers.forEach(p => p.remove());
    });

    // 检查是否有继续编辑弹窗
    const resumeBtn = page.locator('button:has-text("放弃")').first();
    if (await resumeBtn.isVisible().catch(() => false)) {
        console.log('点击【放弃继续编辑】...');
        await resumeBtn.click({ force: true });
        await page.waitForTimeout(1000);
    }

    // 填入序号与标题
    console.log('2. 填入序号 [21] 与标题 [娘，留一点给我]...');
    const inputs = page.locator('input');
    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill('21');
    await inputs.nth(0).blur();

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill('娘，留一点给我');
    await inputs.nth(1).blur();

    // 读取并注入正文
    console.log('3. 读取 chapter_021.md 并注入正文...');
    const content = fs.readFileSync('03_chapters/chapter_021.md', 'utf8');
    const paras = content.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#'));

    const editor = page.locator('.ProseMirror, .serial-editor-content').first();
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    await page.evaluate((lines) => {
        const prose = document.querySelector('.ProseMirror');
        prose.innerHTML = '';
        lines.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            prose.appendChild(p);
        });
        prose.dispatchEvent(new Event('input', { bubbles: true }));
        prose.dispatchEvent(new Event('change', { bubbles: true }));
    }, paras);

    await page.waitForTimeout(1000);
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1500);

    // 点击【下一步】
    console.log('4. 定位并点击【下一步】按钮...');
    const nextBtn = page.locator('button:has-text("下一步")').first();
    await nextBtn.click();
    await page.waitForTimeout(3000);

    // 截取点击【下一步】后的屏幕
    const step1Shot = path.join(__dirname, '..', 'assets', 'publish_step1_after_next.png');
    await page.screenshot({ path: step1Shot, fullPage: false });
    console.log('点击下一步截图存入:', step1Shot);

    // 分析当前页面所有的弹窗与按钮
    const dialogs = await page.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.arco-modal, .byte-modal, div[role="dialog"], div[class~="modal"]'));
        return list.map(d => ({
            text: (d.innerText || '').trim().replace(/\n+/g, ' | '),
            buttons: Array.from(d.querySelectorAll('button')).map(b => b.innerText.trim())
        }));
    });
    console.log('当前页面弹窗分析:', JSON.stringify(dialogs, null, 2));

    // 如果出现错别字弹窗
    const ignoreBtn = page.locator('.arco-modal button:has-text("确认发布"), .byte-modal button:has-text("确认发布"), button:has-text("忽略"), button:has-text("继续发布")').first();
    if (await ignoreBtn.isVisible().catch(() => false)) {
        console.log('点击错别字/检测弹窗按钮:', await ignoreBtn.innerText());
        await ignoreBtn.click({ force: true });
        await page.waitForTimeout(3000);
    }

    // 再次检查弹窗
    const dialogs2 = await page.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.arco-modal, .byte-modal, div[role="dialog"]'));
        return list.map(d => ({
            text: (d.innerText || '').trim().replace(/\n+/g, ' | '),
            buttons: Array.from(d.querySelectorAll('button')).map(b => b.innerText.trim())
        }));
    });
    console.log('第二阶段弹窗分析:', JSON.stringify(dialogs2, null, 2));

    // 截取当前屏幕
    const step2Shot = path.join(__dirname, '..', 'assets', 'publish_step2_modal.png');
    await page.screenshot({ path: step2Shot, fullPage: false });
    console.log('第二阶段截图存入:', step2Shot);

    // 如果出现【仅基础检测】
    const basicBtn = page.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("直接发布")').first();
    if (await basicBtn.isVisible().catch(() => false)) {
        console.log('点击【仅基础检测】...');
        await basicBtn.click({ force: true });
        await page.waitForTimeout(3000);
    }

    // 检查最终发布确认
    const confirmBtn = page.locator('.arco-modal button:has-text("确认发布"), .byte-modal button:has-text("确认发布"), button:has-text("确认发布")').last();
    if (await confirmBtn.isVisible().catch(() => false)) {
        console.log('点击【确认发布】终极按钮...');
        await confirmBtn.click({ force: true });
        await page.waitForTimeout(6000);
    }

    console.log('最终页面URL:', page.url());
    const finalShot = path.join(__dirname, '..', 'assets', 'publish_step3_final.png');
    await page.screenshot({ path: finalShot, fullPage: false });
    console.log('最终页面截图存入:', finalShot);

    // 检查当前页面所有提示消息或Toast
    const messages = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('.arco-message, .byte-message, .arco-notification, div[role="alert"]'));
        return msgs.map(m => m.innerText.trim());
    });
    console.log('页面Toast消息:', messages);

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
