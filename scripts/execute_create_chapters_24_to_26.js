// 自动化新建发布第24至26章脚本
// 严格遵守零星号铁律，不含 ASCII 0x2A

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

async function createAndPublishChapter(page, chapNum, chapTitle, chapFile, shotName) {
    console.log('\n========================================');
    console.log('开始新建发布第 ' + chapNum + ' 章 《' + chapTitle + '》');
    console.log('========================================');

    // 1. 导航进入新建章节页面
    const newChapUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
    console.log('直接导航到新建章节URL:', newChapUrl);
    await page.goto(newChapUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 2. 等待核心富文本组件挂载
    console.log('等待编辑器核心组件挂载...');
    await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
    await page.waitForTimeout(2000);
    await simulateHumanMouseMove(page);

    // 处理【有刚刚更新的章节，是否继续编辑？】弹窗
    const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal').filter({ hasText: '是否继续编辑' }).first();
    if (await resumeModal.isVisible().catch(() => false)) {
        console.log('检测到【有刚刚更新的章节】提示弹窗，点击【放弃】...');
        const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
        if (await abandonBtn.isVisible().catch(() => false)) {
            await abandonBtn.click({ force: true });
        } else {
            await resumeModal.locator('button').first().click({ force: true });
        }
        await page.waitForTimeout(1000);
    }

    // 清理新手引导与遮罩
    console.log('清理新手引导与遮罩...');
    for (let t = 0; t < 4; t++) {
        const guideNext = page.locator('div[class~="popover"] button:has-text("下一步"), button:has-text("我知道了"), button:has-text("完成")').first();
        if (await guideNext.isVisible().catch(() => false)) {
            await guideNext.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
        }
    }
    await page.evaluate(() => {
        const guides = document.querySelectorAll('.arco-popover, .driver-popover, .guide-modal, .reactour__helper, .publish-tour-guide, .byte-modal-mask, .byte-modal-wrapper');
        guides.forEach(e => e.remove());
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 3. 填写章节序号与标题
    console.log('填入序号 [' + chapNum + '] 与标题 [' + chapTitle + ']...');
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    if (inputCount < 2) {
        throw new Error('未定位到序号与标题输入框！');
    }

    await inputs.nth(0).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(0).fill(chapNum.toString());
    await inputs.nth(0).blur();
    await page.waitForTimeout(500);

    await inputs.nth(1).click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await inputs.nth(1).fill(chapTitle);
    await inputs.nth(1).blur();
    await page.waitForTimeout(500);
    console.log('已填入: 第 ' + chapNum + ' 章 《' + chapTitle + '》');

    // 4. 读取正文并注入
    console.log('读取正文 [' + chapFile + '] 并执行零星号质检...');
    const fullPath = path.join(__dirname, '..', chapFile);
    const content = fs.readFileSync(fullPath, 'utf8');

    // 零星号最高铁律断言
    const hasAsterisk = content.indexOf(String.fromCharCode(42)) !== -1;
    if (hasAsterisk) {
        throw new Error('FATAL: 正文中发现非法星号！立即终止发布！');
    }

    // 剔除标题行，只保留纯正文段落
    const rawParagraphs = content.split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.startsWith('#'));

    console.log('准备注入正文: 共 ' + rawParagraphs.length + ' 个段落');

    // 点击编辑器聚焦
    const editor = page.locator('.ProseMirror, .serial-editor-content').first();
    await editor.click();
    await page.waitForTimeout(500);

    // 清空编辑器已有内容
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // 通过浏览器原生 DOM 替换注入正文段落
    await page.evaluate((paras) => {
        const prose = document.querySelector('.ProseMirror');
        if (!prose) throw new Error('未找到 .ProseMirror');
        prose.innerHTML = '';
        paras.forEach(p => {
            const pElem = document.createElement('p');
            pElem.textContent = p;
            prose.appendChild(pElem);
        });
        prose.dispatchEvent(new Event('input', { bubbles: true }));
        prose.dispatchEvent(new Event('change', { bubbles: true }));
    }, rawParagraphs);

    await page.waitForTimeout(1000);
    // 聚焦编辑器并按一下空格再删除，彻底触发 ProseMirror 内部数据流更新
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1000);
    console.log('正文注入完成: 共 ' + rawParagraphs.length + ' 段');

    // 5. 点击【存草稿】以触发后端持久化
    console.log('触发【存草稿】...');
    const saveDraftBtn = page.locator('button:has-text("存草稿"), span:has-text("存草稿")').first();
    if (await saveDraftBtn.isVisible().catch(() => false)) {
        await saveDraftBtn.click();
        await page.waitForTimeout(2500);
    }
    console.log('云端同步完毕。');

    // 6. 点击右上角【下一步】发布流程
    console.log('定位右上角【下一步】按钮...');
    let nextBtn = page.locator('.header-right button:has-text("下一步"), .header-tools button:has-text("下一步"), button:has-text("下一步")').first();
    let nextVisible = await nextBtn.isVisible().catch(() => false);

    if (!nextVisible) {
        const rightButtons = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.map(b => {
                const rect = b.getBoundingClientRect();
                return {
                    text: (b.innerText || '').trim(),
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height),
                    visible: rect.width > 0 && rect.height > 0
                };
            }).filter(b => b.visible && b.text.includes('下一步'));
        });

        if (rightButtons.length > 0) {
            const b = rightButtons[0];
            console.log('命中右上角下一步按钮: x=' + b.x + ', y=' + b.y);
            await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
        } else {
            throw new Error('未能定位到右上角【下一步】发布按钮！');
        }
    } else {
        await nextBtn.click();
    }
    console.log('已点击【下一步】！');
    await page.waitForTimeout(3000);

    // 7. 处理各种提示弹窗
    const typoModal = page.locator('.byte-modal, .arco-modal').filter({ hasText: '错别字' }).first();
    if (await typoModal.isVisible().catch(() => false)) {
        console.log('已处理错别字提示弹窗');
        const ignoreBtn = typoModal.locator('button:has-text("确认发布"), button:has-text("忽略"), button:has-text("继续发布")').first();
        if (await ignoreBtn.isVisible().catch(() => false)) {
            await ignoreBtn.click({ force: true });
            await page.waitForTimeout(2000);
        }
    }

    const checkModal = page.locator('.byte-modal, .arco-modal').filter({ hasText: '内容检测' }).first();
    if (await checkModal.isVisible().catch(() => false)) {
        console.log('已处理内容检测弹窗: 点击【仅基础检测】');
        const basicCheckBtn = checkModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测"), button:has-text("直接发布")').first();
        if (await basicCheckBtn.isVisible().catch(() => false)) {
            await basicCheckBtn.click({ force: true });
            await page.waitForTimeout(2000);
        }
    }

    // 8. 确认发布弹窗
    const finalModal = page.locator('.byte-modal, .arco-modal, .publish-confirm-dialog').filter({ hasText: '确认发布' }).last();
    if (await finalModal.isVisible().catch(() => false)) {
        const finalConfirmBtn = finalModal.locator('button:has-text("确认发布")').last();
        if (await finalConfirmBtn.isVisible().catch(() => false)) {
            await finalConfirmBtn.click({ force: true });
        }
    } else {
        const fallbackPublish = page.locator('button:has-text("确认发布")').last();
        if (await fallbackPublish.isVisible().catch(() => false)) {
            await fallbackPublish.click({ force: true });
        }
    }
    console.log('已点击终极确认发布按钮！等待网络回执...');
    await page.waitForTimeout(6000);

    // 截图保存
    const shotPath = path.join(__dirname, '..', 'assets', shotName);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('第 ' + chapNum + ' 章完成，截图存入: ' + shotPath);
}

async function main() {
    console.log('启动自动化新建发布浏览器引擎 (Profile: fanqie-profile)...');
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    await applyStealthEvasions(page);

    try {
        // 发布第 24 章
        await createAndPublishChapter(page, 24, '能不能切半块', '03_chapters/chapter_024.md', 'updated_vol1_ch24.png');
        await page.waitForTimeout(3000);

        // 发布第 25 章
        await createAndPublishChapter(page, 25, '这钱先别买肉', '03_chapters/chapter_025.md', 'updated_vol1_ch25.png');
        await page.waitForTimeout(3000);

        // 发布第 26 章
        await createAndPublishChapter(page, 26, '用完了，再来一块', '03_chapters/chapter_026.md', 'updated_vol1_ch26.png');
        await page.waitForTimeout(3000);

        console.log('\n==================================================');
        console.log('第24至26章新建发布完成！正在拉取最新章节管理全景截图...');
        console.log('==================================================');

        await navigateToChapterManage(page);
        await page.waitForTimeout(4000);
        const finalShot = path.join(__dirname, '..', 'assets', 'final_updated_vol1_24_to_26_page1.png');
        await page.screenshot({ path: finalShot, fullPage: false });
        console.log('第 1 页全景截图存入: ' + finalShot);

    } catch (err) {
        console.error('发布流程发生异常:', err);
        const errShot = path.join(__dirname, '..', 'assets', 'err_publish_24_to_26.png');
        await page.screenshot({ path: errShot, fullPage: false }).catch(() => {});
        throw err;
    } finally {
        await browserContext.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
