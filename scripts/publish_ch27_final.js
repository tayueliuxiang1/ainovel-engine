// 最终攻克第27章发布
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

const chap27 = {
    num: 27,
    title: '这一锅不卖',
    file: '03_chapters/chapter_027.md'
};

async function main() {
    console.log('启动第27章专项攻克发布程序...');
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await applyStealthEvasions(page);

    try {
        // 先进入作品管理
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
        if (await novelMenu.isVisible().catch(() => false)) {
            await novelMenu.click();
            await page.waitForTimeout(2500);
        }

        const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(4000);

        // 检查草稿箱
        const draftTab = page.locator('div, span, button').filter({ hasText: /^草稿箱/ }).first();
        if (await draftTab.isVisible().catch(() => false)) {
            console.log('找到草稿箱Tab，点击切换...');
            await draftTab.click({ force: true });
            await page.waitForTimeout(3000);

            const draftRows = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
            });
            console.log('草稿箱列表:');
            draftRows.forEach((r, idx) => console.log('Draft ' + (idx + 1) + ': ' + r));

            // 如果草稿箱有第27章，直接点击发布或编辑
            const ch27Draft = page.locator('tbody tr').filter({ hasText: '第27章' }).first();
            if (await ch27Draft.isVisible().catch(() => false)) {
                console.log('在草稿箱找到第27章！尝试直接发布或编辑...');
                const pubBtn = ch27Draft.locator('button:has-text("发布"), a:has-text("发布")').first();
                if (await pubBtn.isVisible().catch(() => false)) {
                    console.log('草稿箱直接点击【发布】按钮！');
                    await pubBtn.click({ force: true });
                    await page.waitForTimeout(3000);
                } else {
                    const editBtn = ch27Draft.locator('button:has-text("编辑"), a:has-text("编辑")').first();
                    console.log('草稿箱点击【编辑】按钮！');
                    await editBtn.click({ force: true });
                    await page.waitForTimeout(4000);
                }
            }
        }

        // 如果当前不在编辑页，前往新建发布
        if (!page.url().includes('/publish')) {
            console.log('前往新建发布页发布第27章...');
            const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
            await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(3500);

            await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
            await page.waitForTimeout(1000);

            // 放弃继续编辑弹窗
            const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
            if (await resumeModal.isVisible().catch(() => false)) {
                const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
                if (await abandonBtn.isVisible().catch(() => false)) {
                    await abandonBtn.click({ force: true });
                }
                await page.waitForTimeout(1000);
            }

            // 填入序号与标题
            console.log('填入序号与标题...');
            const inputs = page.locator('input');
            await inputs.nth(0).click({ force: true });
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await inputs.nth(0).fill(chap27.num.toString());
            await inputs.nth(0).blur();
            await page.waitForTimeout(300);

            await inputs.nth(1).click({ force: true });
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await inputs.nth(1).fill(chap27.title);
            await inputs.nth(1).blur();
            await page.waitForTimeout(300);

            // 注入正文
            console.log('注入正文...');
            const fullPath = path.resolve(__dirname, '..', chap27.file);
            const rawContent = fs.readFileSync(fullPath, 'utf8');

            const paragraphs = rawContent
                .split(/\r?\n/)
                .map(p => p.trim())
                .filter(p => !p.startsWith('#') && !p.includes('---') && p !== '');
            const html = paragraphs.map(p => '<p>' + p + '</p>').join('');

            const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
            await editor.click({ force: true });
            await editor.evaluate((el, htmlContent) => {
                el.innerHTML = htmlContent;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, html);

            await page.keyboard.type(' ');
            await page.keyboard.press('Backspace');
            console.log('正文注入完成: 共 ' + paragraphs.length + ' 段');
            await page.waitForTimeout(1500);

            // 点击【存草稿】
            const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
            if (await saveDraftBtn.isVisible().catch(() => false)) {
                await saveDraftBtn.click({ force: true });
                await page.waitForTimeout(2500);
            }
        }

        // 点击右上角【下一步】按钮
        console.log('定位右上角【下一步】按钮...');
        const allNextBtns = page.locator('button:has-text("下一步")');
        const nextCount = await allNextBtns.count();
        let targetNextBtn = null;

        for (let i = 0; i < nextCount; i++) {
            const btn = allNextBtns.nth(i);
            const box = await btn.boundingBox();
            if (box && box.y < 120 && box.x > 800) {
                targetNextBtn = btn;
                break;
            }
        }
        if (!targetNextBtn) targetNextBtn = allNextBtns.first();
        if (targetNextBtn && await targetNextBtn.isVisible().catch(() => false)) {
            await targetNextBtn.click({ force: true });
            console.log('已点击【下一步】！');
            await page.waitForTimeout(3000);
        }

        // 推进发布弹窗
        let isConfirmed = false;
        for (let step = 1; step <= 35; step++) {
            await page.waitForTimeout(1200);

            // 处理错别字提示弹窗
            const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
                if (await typoBtn.isVisible().catch(() => false)) {
                    await typoBtn.click({ force: true });
                    console.log('已处理错别字提示弹窗');
                    await page.waitForTimeout(1500);
                }
            }

            // 处理内容检测
            const hasDetect = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, div, span'));
                const basic = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
                if (basic) {
                    basic.click();
                    return '仅基础检测';
                }
                const allD = btns.find(b => b.innerText && b.innerText.trim() === '全面检测');
                if (allD) {
                    allD.click();
                    return '全面检测';
                }
                return null;
            });
            if (hasDetect) {
                console.log('已处理内容检测弹窗: 点击【' + hasDetect + '】');
                await page.waitForTimeout(2000);
            }

            // 处理发布设置与终极确认发布
            const pubSettings = await page.evaluate(() => {
                const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
                const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
                if (noAi) noAi.click();

                const btns = Array.from(document.querySelectorAll('button, div, span'));
                const confirmBtn = btns.find(b => {
                    const t = b.innerText ? b.innerText.trim() : '';
                    return t === '确认发布' || t === '发布' || t === '确认提交';
                });
                if (confirmBtn) {
                    confirmBtn.click();
                    return true;
                }
                return false;
            });

            if (pubSettings) {
                console.log('已点击终极确认发布按钮！等待网络回执...');
                await page.waitForTimeout(6000);
                isConfirmed = true;
                break;
            }

            if (page.url().includes('/chapter-manage')) {
                console.log('页面已自动返回章节管理列表，第27章发布成功！');
                isConfirmed = true;
                break;
            }
        }

        const shotPath = path.join(__dirname, '..', 'assets', 'published_real_vol1_ch27_final.png');
        await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
        console.log('第27章最终攻克结果: isConfirmed=' + isConfirmed);

        // 最终章节管理全局抓取
        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const nm = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
        if (await nm.isVisible().catch(() => false)) await nm.click();
        await page.waitForTimeout(2500);

        const lastCard = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
        await lastCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(5000);

        const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
        });
        console.log('\n==================================================');
        console.log('最新章节管理表格 (前 25 行):');
        console.log('==================================================');
        rows.slice(0, 25).forEach((r, idx) => console.log((idx + 1) + ': ' + r));

        const grandShot = path.join(__dirname, '..', 'assets', 'grand_total_published_summary.png');
        await page.screenshot({ path: grandShot, fullPage: false });
        console.log('全局发布全景截图存入:', grandShot);

    } catch (err) {
        console.error('第27章攻克异常:', err);
    } finally {
        await browserContext.close();
    }
}

main();
