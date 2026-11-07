// 精准闭环验证第21章真实发布
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

    // 放弃继续编辑
    const abandonBtn = page.locator('button:has-text("放弃")').first();
    if (await abandonBtn.isVisible().catch(() => false)) {
        console.log('点击放弃继续编辑...');
        await abandonBtn.click({ force: true });
        await page.waitForTimeout(1000);
    }

    // 填入序号与标题
    console.log('2. 填入序号 21 与标题 娘，留一点给我...');
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
    await page.waitForTimeout(2000);

    // 轮询处理弹窗，直到页面成功跳转回 chapter-manage
    console.log('5. 开始状态机轮询驱动发布流程...');
    let success = false;

    for (let sec = 1; sec <= 40; sec++) {
        await page.waitForTimeout(1500);

        // 检查错别字弹窗
        const submitBtn = page.locator('.arco-modal button:has-text("提交"), .byte-modal button:has-text("提交")').first();
        if (await submitBtn.isVisible().catch(() => false)) {
            console.log('检测到错别字提示弹窗，点击【提交】');
            await submitBtn.click({ force: true });
            await page.waitForTimeout(1500);
            continue;
        }

        // 检查内容检测方式弹窗
        const basicBtn = page.locator('button:has-text("仅基础检测")').first();
        if (await basicBtn.isVisible().catch(() => false)) {
            console.log('检测到内容检测弹窗，点击【仅基础检测】');
            await basicBtn.click({ force: true });
            await page.waitForTimeout(2500);
            continue;
        }

        // 处理单选框和最终确认发布按钮
        const clickedFinal = await page.evaluate(() => {
            // 单选框否
            const labels = Array.from(document.querySelectorAll('label, .arco-radio, span'));
            const noRadio = labels.find(l => l.innerText && l.innerText.trim() === '否');
            if (noRadio) noRadio.click();

            // 确认发布按钮
            const btns = Array.from(document.querySelectorAll('button'));
            const confirmBtn = btns.find(b => {
                const txt = (b.innerText || '').trim();
                return txt === '确认发布' || txt === '发布' || txt === '确认提交';
            });
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        });

        if (clickedFinal) {
            console.log('已点击【确认发布/确认提交】！等待系统入库...');
            await page.waitForTimeout(4000);
        }

        // 判断是否已跳出 publish 页面，回到章节管理
        const currentUrl = page.url();
        if (currentUrl.includes('/chapter-manage')) {
            console.log('SUCCESS: 页面已成功跳转回章节管理: ' + currentUrl);
            success = true;
            break;
        }

        console.log('轮询等待中 (第 ' + sec + ' 轮)... URL: ' + currentUrl);
    }

    const shot = path.join(__dirname, '..', 'assets', 'verify_ch21_real_result.png');
    await page.screenshot({ path: shot, fullPage: false });
    console.log('最终现场截图存入:', shot);
    console.log('发布结论: ' + (success ? '第21章正式发布成功！' : '第21章未完成跳转！'));

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
