const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions, simulateHumanMouseMove } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
const novelName = '大唐：盗我抗旱图';

async function navigateToChapterManage(page) {
    console.log('\n----------------------------------------');
    console.log('正在导航进入【章节管理】页面...');
    console.log('----------------------------------------');
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
    console.log('已到达章节管理页:', page.url());
}

async function publishOneChapter(page, chapNum, chapTitle, chapFile, shotName) {
    console.log('\n========================================');
    console.log(`开始新建发布第 ${chapNum} 章: 《${chapTitle}》`);
    console.log('========================================');

    const publishUrl = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
    console.log('直接打开新建章节页面:', publishUrl);
    await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    console.log('等待编辑器核心组件挂载...');
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(2000);
    await simulateHumanMouseMove(page);

    console.log('清理新手引导与遮罩...');
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click().catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal');
        guides.forEach(e => e.remove());
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log(`填入序号 [${chapNum}] 与标题 [${chapTitle}]...`);
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    if (inputCount < 2) {
        throw new Error('未定位到序号与标题输入框！');
    }

    await inputs.nth(0).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chapNum.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(500);

    await inputs.nth(1).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chapTitle);
    await inputs.nth(1).blur();
    await page.waitForTimeout(500);
    console.log(`已填写: 第 ${chapNum} 章 《${chapTitle}》`);

    console.log(`读取正文 [${chapFile}] 并执行零星号质检...`);
    const fullPath = path.resolve(__dirname, '..', chapFile);
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    if (rawContent.includes(String.fromCharCode(42))) {
        throw new Error(`章节文件 [${chapFile}] 违规包含星号，阻断提交！`);
    }

    const paragraphs = rawContent
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');

    const editor = page.locator('.serial-editor-content .ProseMirror, .ProseMirror').first();
    await editor.click();
    await editor.evaluate((el, htmlContent) => {
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, html);

    await page.keyboard.type('。');
    await page.keyboard.press('Backspace');
    console.log(`正文注入完成: 共 ${paragraphs.length} 段`);
    await page.waitForTimeout(2000);

    const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click();
        console.log('已触发【存草稿】');
        await page.waitForTimeout(3000);
    }

    for (let s = 0; s < 8; s++) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('已保存') || bodyText.includes('已保存到云端')) {
            console.log('云端同步完毕！');
            break;
        }
        await page.waitForTimeout(1000);
    }

    console.log('定位右上角【下一步】按钮...');
    const allNextBtns = page.locator('button:has-text("下一步")');
    const nextCount = await allNextBtns.count();
    let targetNextBtn = null;

    for (let i = 0; i < nextCount; i++) {
        const btn = allNextBtns.nth(i);
        const box = await btn.boundingBox();
        if (box && box.y < 120 && box.x > 800) {
            targetNextBtn = btn;
            console.log(`命中右上角下一步按钮: x=${box.x}, y=${box.y}`);
            break;
        }
    }

    if (!targetNextBtn) {
        targetNextBtn = allNextBtns.first();
    }

    await targetNextBtn.click({ force: true });
    console.log('已点击【下一步】！');
    await page.waitForTimeout(3000);

    let isConfirmed = false;
    for (let step = 1; step <= 25; step++) {
        await page.waitForTimeout(1500);

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
            console.log(`已处理内容检测弹窗: 点击【${hasDetect}】`);
            await page.waitForTimeout(2000);
        }

        const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
        if (await typoModal.isVisible().catch(() => false)) {
            const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
            if (await typoBtn.isVisible().catch(() => false)) {
                await typoBtn.click();
                console.log('已处理错别字提示弹窗');
                await page.waitForTimeout(1500);
            }
        }

        const pubSettings = await page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => {
                const t = b.innerText ? b.innerText.trim() : '';
                return t === '确认发布' || t === '发布' || t === '确定发布' || t === '确认修改' || t === '确定';
            });
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        });

        if (pubSettings) {
            console.log(`第 ${step} 轮检测到并点击了终极确认发布按钮！`);
            isConfirmed = true;
            await page.waitForTimeout(3000);
            break;
        }

        const currUrl = page.url();
        if (currUrl.includes('chapter-manage') || currUrl.includes('chapter_manage')) {
            console.log('页面已自动返回章节管理列表，判定发布成功！');
            isConfirmed = true;
            break;
        }
    }

    if (!isConfirmed) {
        console.log('未检测到明确跳转，尝试再次触发确认发布...');
        const finalBtn = page.locator('button:has-text("确认发布"), button:has-text("发布")').last();
        if (await finalBtn.isVisible().catch(() => false)) {
            await finalBtn.click({ force: true });
            await page.waitForTimeout(4000);
        }
    }

    const shotDir = path.resolve(__dirname, '..', 'assets');
    if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
    const shotPath = path.join(shotDir, shotName);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`第 ${chapNum} 章发布完成，已截图: ${shotPath}`);

    await page.waitForTimeout(3000);
}

(async () => {
    let browserContext = null;
    try {
        console.log('启动 Playwright 并加载番茄已登录会话...');
        browserContext = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            channel: 'chrome',
            viewport: { width: 1440, height: 900 },
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = browserContext.pages().length > 0 ? browserContext.pages()[0] : await browserContext.newPage();
        await applyStealthEvasions(page);

        const chaptersToPublish = [
            { num: 13, title: '此法可吞突厥十万兵', file: '03_chapters/chapter_013.md', shot: 'shot_chap_013_published.png' },
            { num: 14, title: '崔家老料跌成废柴', file: '03_chapters/chapter_014.md', shot: 'shot_chap_014_published.png' },
            { num: 15, title: '五十水龙漫关中', file: '03_chapters/chapter_015.md', shot: 'shot_chap_015_published.png' }
        ];

        for (const chap of chaptersToPublish) {
            await publishOneChapter(page, chap.num, chap.title, chap.file, chap.shot);
            await page.waitForTimeout(3000);
        }

        console.log('\n========================================');
        console.log('全部三章发布动作完成，正在导航回到章节管理列表...');
        console.log('========================================');
        await navigateToChapterManage(page);
        await page.waitForTimeout(5000);

        const listShotPath = path.resolve(__dirname, '..', 'assets', 'final_chapters_13_to_15.png');
        await page.screenshot({ path: listShotPath, fullPage: true });
        console.log('全量管理后台最新列表已截图保存至:', listShotPath);

        const tableText = await page.evaluate(() => {
            const el = document.querySelector('.arco-table, .chapter-list, body');
            return el ? el.innerText : '';
        });

        console.log('\n--- 当前页面章节状态摘要 ---');
        const lines = tableText.split('\n').filter(l => l.includes('第') && (l.includes('章') || l.includes('此法可吞突厥') || l.includes('崔家老料') || l.includes('五十水龙')));
        lines.slice(0, 15).forEach(l => console.log(l));

        console.log('\n第13、14、15章发布流程圆满成功！');
    } catch (err) {
        console.error('发布流程发生异常:', err);
        process.exitCode = 1;
    } finally {
        if (browserContext) {
            await browserContext.close().catch(() => {});
        }
    }
})();
