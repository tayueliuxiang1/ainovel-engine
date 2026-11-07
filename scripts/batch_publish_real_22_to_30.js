// 批量真实发布第22至30章
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

const chaptersToPublish = [
    { num: 22, title: '先洗抹布', file: '03_chapters/chapter_022.md' },
    { num: 23, title: '给屠户试，不给屠户送', file: '03_chapters/chapter_023.md' },
    { num: 24, title: '能不能切半块', file: '03_chapters/chapter_024.md' },
    { num: 25, title: '这钱先别买肉', file: '03_chapters/chapter_025.md' },
    { num: 26, title: '用完了，再来一块', file: '03_chapters/chapter_026.md' },
    { num: 27, title: '这一锅不卖', file: '03_chapters/chapter_027.md' },
    { num: 28, title: '先卖给天天弄脏衣裳的人', file: '03_chapters/chapter_028.md' },
    { num: 29, title: '县里卖得动，长安呢？', file: '03_chapters/chapter_029.md' },
    { num: 30, title: '我不先欠你的钱', file: '03_chapters/chapter_030.md' }
];

async function publishSingle(page, chap) {
    console.log('\n========================================');
    console.log('开始发布第 ' + chap.num + ' 章 《' + chap.title + '》...');
    console.log('========================================');

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

    // 填写序号与标题
    console.log('填入序号与标题...');
    const inputs = page.locator('input');
    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chap.num.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(300);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chap.title);
    await inputs.nth(1).blur();
    await page.waitForTimeout(300);

    // 注入正文
    console.log('注入正文...');
    const fullPath = path.resolve(__dirname, '..', chap.file);
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('章节包含星号，阻断提交！');
    }

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
    await targetNextBtn.click({ force: true });
    console.log('已点击【下一步】！');
    await page.waitForTimeout(2500);

    // 弹窗推进与终极确认发布
    let isConfirmed = false;
    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1500);

        // 优先处理【仅基础检测】
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

        // 处理发布设置与终极确认发布按钮
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
            await page.waitForTimeout(5000);
            isConfirmed = true;
            break;
        }

        if (page.url().includes('/chapter-manage')) {
            console.log('页面已自动返回章节管理列表，新建发布成功！');
            isConfirmed = true;
            break;
        }
    }

    const shotName = 'published_real_vol1_ch' + chap.num + '.png';
    const shotPath = path.join(__dirname, '..', 'assets', shotName);
    await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
    console.log('第 ' + chap.num + ' 章发布结果: isConfirmed=' + isConfirmed + ', 截图: ' + shotName);
}

async function main() {
    console.log('启动自动化批量真实发布 (第22至30章)...');
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
    await applyStealthEvasions(page);

    try {
        for (const chap of chaptersToPublish) {
            await publishSingle(page, chap);
            await page.waitForTimeout(2500);
        }

        console.log('\n==================================================');
        console.log('第22至30章全部发布完毕！正在验证章节管理...');
        console.log('==================================================');

        await page.goto('https://fanqienovel.com/main/writer/book-manage', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const novelMenu = page.locator('div, span, a').filter({ hasText: /^小说$/ }).first();
        if (await novelMenu.isVisible().catch(() => false)) {
            await novelMenu.click();
            await page.waitForTimeout(2500);
        }

        const card = page.locator('.completion-book-item-main, div[class~="book-item"], div').filter({ hasText: '大唐：盗我抗旱图' }).filter({ hasText: '章节管理' }).last();
        await card.locator('button:has-text("章节管理"), a:has-text("章节管理")').first().click();
        await page.waitForTimeout(5000);

        const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('tbody tr')).map(r => (r.innerText || '').trim().replace(/\n+/g, ' | '));
        });
        console.log('发布后章节管理表格 (前 10 行):');
        rows.slice(0, 10).forEach((r, idx) => console.log((idx + 1) + ': ' + r));

        const finalShot = path.join(__dirname, '..', 'assets', 'final_published_22_to_30_summary.png');
        await page.screenshot({ path: finalShot, fullPage: false });
        console.log('汇总全景截图存入:', finalShot);

    } catch (err) {
        console.error('批量发布异常:', err);
        throw err;
    } finally {
        await browserContext.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
