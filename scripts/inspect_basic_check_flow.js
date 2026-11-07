// 探查点击【仅基础检测】后的弹窗与最终发布按钮
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    const url = 'https://fanqienovel.com/main/writer/7704518175408278552/publish/7705241949187342872?enter_from=newchapter';
    console.log('打开草稿编辑页面:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // 查看页面上所有的按钮
    const btns = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.innerText.trim(),
            cls: b.className
        }));
    });
    console.log('页面上所有按钮:');
    btns.forEach(b => console.log('  button: ' + b.text + ' (' + b.cls + ')'));

    // 点击右上角【下一步】
    const nextBtn = page.locator('button:has-text("下一步")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
        console.log('点击【下一步】...');
        await nextBtn.click();
        await page.waitForTimeout(2000);

        // 如果有错别字提示弹窗，点击【提交】
        const submitBtn = page.locator('.arco-modal button:has-text("提交"), button:has-text("提交")').first();
        if (await submitBtn.isVisible().catch(() => false)) {
            console.log('点击弹窗【提交】...');
            await submitBtn.click();
            await page.waitForTimeout(2000);
        }

        // 此时查看弹窗内容
        const modalContent = await page.evaluate(() => {
            const m = document.querySelector('.arco-modal, .byte-modal');
            return m ? m.innerText.replace(/\n+/g, ' | ') : '无弹窗';
        });
        console.log('检测选择弹窗内容:', modalContent);

        // 点击【仅基础检测】
        const basicBtn = page.locator('button:has-text("仅基础检测")').first();
        if (await basicBtn.isVisible().catch(() => false)) {
            console.log('点击【仅基础检测】...');
            await basicBtn.click();
            await page.waitForTimeout(3000);
        }

        // 重点：点击【仅基础检测】后，等待几秒，看弹出了什么！
        const finalModal = await page.evaluate(() => {
            const m = Array.from(document.querySelectorAll('.arco-modal, .byte-modal'));
            return m.map(el => el.innerText.replace(/\n+/g, ' | '));
        });
        console.log('点击仅基础检测后的弹窗:', finalModal);

        const afterShot = path.join(__dirname, '..', 'assets', 'after_basic_check_modal.png');
        await page.screenshot({ path: afterShot, fullPage: false });
        console.log('后弹窗截图存入:', afterShot);
    }

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
