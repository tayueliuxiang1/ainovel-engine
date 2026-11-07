// 测试点击【提交】按钮完成发布
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

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
    console.log('1. 进入新建章节:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 检查是否有继续编辑弹窗，直接放弃
    const abandonBtn = page.locator('button:has-text("放弃")').first();
    if (await abandonBtn.isVisible().catch(() => false)) {
        console.log('点击放弃继续编辑...');
        await abandonBtn.click({ force: true });
        await page.waitForTimeout(1000);
    }

    // 填入序号与标题
    console.log('2. 填入 21 章...');
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

    // 注入正文
    console.log('3. 注入正文...');
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
    console.log('4. 点击【下一步】...');
    const nextBtn = page.locator('button:has-text("下一步")').first();
    await nextBtn.click();
    await page.waitForTimeout(2500);

    // 处理错别字弹窗的【提交】按钮
    console.log('5. 检查并点击弹窗中的【提交】按钮...');
    const submitBtn = page.locator('.arco-modal button:has-text("提交"), .byte-modal button:has-text("提交"), button:has-text("提交")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
        console.log('发现弹窗【提交】按钮，执行点击！');
        await submitBtn.click({ force: true });
        await page.waitForTimeout(3000);
    }

    // 检查是否有后续的内容检测弹窗或确认发布
    const dialogsAfter = await page.evaluate(() => {
        const list = Array.from(document.querySelectorAll('.arco-modal, .byte-modal, div[role="dialog"]'));
        return list.map(d => ({
            text: (d.innerText || '').trim().replace(/\n+/g, ' | '),
            buttons: Array.from(d.querySelectorAll('button')).map(b => b.innerText.trim())
        }));
    });
    console.log('提交后弹窗列表:', JSON.stringify(dialogsAfter, null, 2));

    // 如果出现【仅基础检测】
    const basicBtn = page.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("直接发布")').first();
    if (await basicBtn.isVisible().catch(() => false)) {
        console.log('发现内容检测，点击【仅基础检测】...');
        await basicBtn.click({ force: true });
        await page.waitForTimeout(3000);
    }

    // 如果出现【确认发布】
    const finalConfirm = page.locator('button:has-text("确认发布")').last();
    if (await finalConfirm.isVisible().catch(() => false)) {
        console.log('发现终极确认，点击【确认发布】...');
        await finalConfirm.click({ force: true });
        await page.waitForTimeout(5000);
    }

    console.log('发布流程结束，当前URL:', page.url());
    const resultShot = path.join(__dirname, '..', 'assets', 'test_ch21_published_result.png');
    await page.screenshot({ path: resultShot, fullPage: false });
    console.log('结果截图存入:', resultShot);

    // 导航到章节管理页面验证是否出现在【已发布】
    console.log('6. 导航到章节管理页面验证第 21 章是否在已发布中...');
    await page.goto('https://fanqienovel.com/main/writer/chapter-manage/' + BOOK_ID + '&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const publishedRows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tbody tr')).map(tr => (tr.innerText || '').trim().replace(/\n+/g, ' | '));
    });
    console.log('当前已发布列表前 5 行:');
    publishedRows.slice(0, 5).forEach((r, i) => console.log((i + 1) + ': ' + r));

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
