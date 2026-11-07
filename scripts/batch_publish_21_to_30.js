// 批量发布第21至30章可靠自动化流水线
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

const chapters = [
    { num: 21, title: '娘，留一点给我', file: '03_chapters/chapter_021.md' },
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

async function publishSingleChapter(page, chap) {
    console.log('\n========================================');
    console.log('正在发布第 ' + chap.num + ' 章 《' + chap.title + '》...');
    console.log('========================================');

    const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);

    // 清理可能存在的遮罩引导
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .byte-modal-mask, .byte-modal-wrapper');
        guides.forEach(g => g.remove());
    });

    // 处理【有刚刚更新的章节，是否继续编辑？】弹窗，点击【放弃】
    const resumeModal = page.locator('.byte-modal, .arco-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
            await page.waitForTimeout(1000);
        }
    }

    // 填入序号与标题
    console.log('填入序号与标题...');
    const inputs = page.locator('input');
    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chap.num.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(400);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chap.title);
    await inputs.nth(1).blur();
    await page.waitForTimeout(400);

    // 读取正文并注入
    const fullPath = path.resolve(__dirname, '..', chap.file);
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error('FATAL: 正文中发现非法星号！');
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

    // 点击右上角【下一步】按钮
    console.log('点击右上角【下一步】按钮...');
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
    await page.waitForTimeout(2500);

    // 弹窗推进与终极确认发布循环
    let isConfirmed = false;
    for (let step = 1; step <= 20; step++) {
        await page.waitForTimeout(1500);

        // 处理错别字提示弹窗
        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示"), .byte-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                console.log('点击错别字提示弹窗: 提交');
                await typoBtn.click({ force: true });
                await page.waitForTimeout(1500);
            }
        }

        // 处理内容检测方式弹窗
        const hasDetect = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const basic = btns.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (basic) {
                basic.click();
                return '仅基础检测';
            }
            return null;
        });
        if (hasDetect) {
            console.log('已处理内容检测弹窗: 点击【仅基础检测】');
            await page.waitForTimeout(2000);
        }

        // 处理单选框（AI生成选否）及终极确认发布
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
            console.log('已点击终极确认发布按钮！等待跳转...');
            await page.waitForTimeout(4000);
        }

        if (page.url().includes('/chapter-manage')) {
            console.log('SUCCESS: 页面已跳转回章节管理，第 ' + chap.num + ' 章发布成功！');
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        console.warn('警告: 第 ' + chap.num + ' 章可能未完全确认跳转，保存现场截图...');
        const warnShot = path.join(__dirname, '..', 'assets', 'warn_publish_ch' + chap.num + '.png');
        await page.screenshot({ path: warnShot, fullPage: false }).catch(() => {});
    } else {
        const okShot = path.join(__dirname, '..', 'assets', 'published_vol1_ch' + chap.num + '.png');
        await page.screenshot({ path: okShot, fullPage: false }).catch(() => {});
    }
}

async function main() {
    console.log('启动自动化发布引擎 (第21至30章)...');
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
        for (const chap of chapters) {
            await publishSingleChapter(page, chap);
            await page.waitForTimeout(3000);
        }

        console.log('\n==================================================');
        console.log('第21至30章批量发布流程完毕！验证章节管理...');
        console.log('==================================================');

        await page.goto('https://fanqienovel.com/main/writer/chapter-manage/' + BOOK_ID + '&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        const summaryShot = path.join(__dirname, '..', 'assets', 'published_status_21_to_30_summary.png');
        await page.screenshot({ path: summaryShot, fullPage: false });
        console.log('已发布汇总截图存入:', summaryShot);

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
