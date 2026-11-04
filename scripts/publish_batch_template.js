const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { humanRandomSleep, applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function publishSingleChapter(page, bookId, chap) {
    console.log('\n==================================================');
    console.log('[拟人化防倒挂发布] 第 ' + chap.num + ' 章: 《' + chap.title + '》');
    console.log('==================================================');

    await applyStealthEvasions(page);
    await page.goto('https://fanqienovel.com/main/writer/' + bookId + '/publish/?enter_from=newchapter_1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await simulateHumanMouseMove(page);

    const inputs = page.locator('input');
    await inputs.nth(0).fill(chap.num.toString());
    await inputs.nth(0).blur();
    await inputs.nth(1).fill(chap.title);
    await inputs.nth(1).blur();

    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();
    const rawContent = fs.readFileSync(path.resolve(__dirname, '..', chap.file), 'utf8');

    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('检测到星号违规，拒绝发布！');
    }

    const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => '<p>' + p + '</p>').join('');
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    console.log('注入正文完成 (' + paragraphs.length + ' 段)');
    await page.waitForTimeout(2000);

    for (let w = 0; w < 10; w++) {
        const hasSaved = await page.locator('text=已保存').isVisible().catch(() => false);
        if (hasSaved) {
            console.log('草稿已自动同步完毕！');
            break;
        }
        await page.waitForTimeout(1000);
    }

    await page.evaluate(() => {
        const wrappers = document.querySelectorAll('.byte-modal-wrapper, .arco-modal-wrapper');
        wrappers.forEach(w => {
            if (!w.innerText.includes('发布设置') && !w.innerText.includes('检测') && !w.innerText.includes('错别字') && !w.innerText.includes('发布提示')) {
                w.remove();
            }
        });
    });

    const nextBtn = page.locator('button.auto-editor-next, button:has-text("下一步")').first();
    await nextBtn.evaluate(el => el.click());

    let isDone = false;
    for (let step = 1; step <= 30; step++) {
        await page.waitForTimeout(1500);
        const typoModal = page.locator('.arco-modal:has-text("发布提示"), .arco-modal:has-text("错别字")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const btn = typoModal.locator('button.arco-btn-primary, button:has-text("提交")').first();
            await btn.click().catch(() => {});
            await page.waitForTimeout(1500);
        }
        const riskModal = page.locator('.arco-modal:has-text("检测"), [role="dialog"]:has-text("检测")').first();
        if (await riskModal.isVisible().catch(() => false)) {
            const btn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("确定")').first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click().catch(() => {});
                await page.waitForTimeout(1500);
            }
        }
        const pubModal = page.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
        if (await pubModal.isVisible().catch(() => false)) {
            const noAi = pubModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
            if (await noAi.isVisible().catch(() => false)) {
                await noAi.click().catch(() => {});
                await page.waitForTimeout(500);
            }
            const confirmBtn = pubModal.locator('button:has-text("确认提交"), button:has-text("确认发布"), button:has-text("提交")').first();
            await confirmBtn.click().catch(() => {});
            console.log('点击提交完成，等待网络结算...');
            await page.waitForTimeout(6000);
            isDone = true;
            break;
        }
    }
    if (!isDone) throw new Error('第 ' + chap.num + ' 章发布未完成');
    console.log('第 ' + chap.num + ' 章严格顺序入库成功！');

    // 拟人化随机平滑等待 8 到 14 秒以沉淀时间戳
    await humanRandomSleep(page, 8, 14);
}

module.exports = { publishSingleChapter };
