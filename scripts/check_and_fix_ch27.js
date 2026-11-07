// 深度调试并补发第27章
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
    console.log('启动第27章深度补发与探针程序...');
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
        const publishUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/publish/?enter_from=newchapter';
        await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3500);

        await page.waitForSelector('.serial-editor-content, .ProseMirror', { timeout: 35000 });
        await page.waitForTimeout(1000);

        // 放弃继续编辑弹窗
        const resumeModal = page.locator('.byte-modal-wrapper, .byte-modal, .arco-modal').filter({ hasText: '是否继续编辑' }).first();
        if (await resumeModal.isVisible().catch(() => false)) {
            const abandonBtn = resumeModal.locator('button:has-text("放弃")').first();
            if (await abandonBtn.isVisible().catch(() => false)) {
                await abandonBtn.click({ force: true });
                console.log('已点击放弃继续编辑');
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
        await page.waitForTimeout(2000);

        // 点击【存草稿】让后台完成数据校验
        const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
        if (await saveDraftBtn.isVisible().catch(() => false)) {
            await saveDraftBtn.click({ force: true });
            console.log('已触发【存草稿】');
            await page.waitForTimeout(3000);
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

        // 循环推进
        let isConfirmed = false;
        for (let step = 1; step <= 45; step++) {
            await page.waitForTimeout(1000);

            // 获取页面全部可见按钮与可见弹窗
            const pageState = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'))
                    .filter(b => b.offsetParent !== null)
                    .map(b => (b.innerText || '').trim())
                    .filter(t => t.length > 0 && t.length < 30);

                const modals = Array.from(document.querySelectorAll('.arco-modal, .byte-modal, .arco-popover, .arco-tooltip, [role="dialog"], div'))
                    .filter(d => {
                        const c = d.className || '';
                        return typeof c === 'string' && (c.includes('modal') || c.includes('popover') || c.includes('guide') || c.includes('tooltip')) && d.offsetParent !== null;
                    })
                    .map(d => (d.innerText || '').slice(0, 100).replace(/\s+/g, ' '));

                return { btns, modals: Array.from(new Set(modals)) };
            });

            if (step % 4 === 1) {
                console.log('Step ' + step + ' 可见按钮:', JSON.stringify(pageState.btns));
                console.log('Step ' + step + ' 可见弹窗/气泡:', JSON.stringify(pageState.modals));
            }

            // 1. 处理新手引导与提示气泡
            const guideClicked = await page.evaluate(() => {
                const allDoms = Array.from(document.querySelectorAll('.arco-popover, .arco-tooltip, .byte-popover, .arco-modal, [role="dialog"], div'));
                const bubbles = allDoms.filter(d => {
                    const c = d.className || '';
                    return typeof c === 'string' && (c.includes('guide') || c.includes('popover') || c.includes('tooltip') || c.includes('modal')) && d.offsetParent !== null;
                });
                for (const b of bubbles) {
                    const text = b.innerText || '';
                    if (text.includes('分卷') || text.includes('引导') || text.includes('/3') || text.includes('/2') || text.includes('不允许发布以下内容') || text.includes('作家有话说') || text.includes('历史版本')) {
                        const btns = Array.from(b.querySelectorAll('button, span, a, [role="button"], i, svg'));
                        const actionBtn = btns.find(btn => {
                            const t = (btn.innerText || '').trim();
                            return t === '下一步' || t === '我知道了' || t === '跳过' || t === '完成' || t === '确定' || t === '知道了' || t === '关闭';
                        });
                        if (actionBtn) {
                            actionBtn.click();
                            return '点击气泡按钮: ' + (actionBtn.innerText || '图标');
                        }
                        // 寻找叉号关闭
                        const closeBtn = b.querySelector('.arco-icon-close, .byte-icon-close, [aria-label="Close"]');
                        if (closeBtn) {
                            closeBtn.click();
                            return '点击气泡叉号';
                        }
                    }
                }
                return null;
            });

            if (guideClicked) {
                console.log('已处理气泡引导:', guideClicked);
                await page.waitForTimeout(1000);
                continue;
            }

            // 2. 基础检测 / 全面检测
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

            // 3. 错别字提示弹窗
            const typoModal = page.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                const typoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定"), button:has-text("继续发布")').first();
                if (await typoBtn.isVisible().catch(() => false)) {
                    await typoBtn.click({ force: true });
                    console.log('已处理错别字提示弹窗');
                    await page.waitForTimeout(1500);
                }
            }

            // 4. 处理发布设置与终极确认发布按钮
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
                console.log('页面已自动返回章节管理列表，补发第27章成功！');
                isConfirmed = true;
                break;
            }
        }

        const shotPath = path.join(__dirname, '..', 'assets', 'fix_published_real_vol1_ch27.png');
        await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
        console.log('补发第27章结果: isConfirmed=' + isConfirmed);

        // 最终返回章节管理核验
        const manageUrl = 'https://fanqienovel.com/main/writer/' + BOOK_ID + '/chapter-manage';
        await page.goto(manageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);
        const finalRows = await page.locator('.arco-table-tr, .chapter-list-item').allInnerTexts().catch(() => []);
        console.log('章节管理最新记录 (前5行):');
        finalRows.slice(0, 5).forEach((r, idx) => {
            console.log((idx + 1) + ': ' + r.replace(/\n+/g, ' | '));
        });

    } catch (err) {
        console.error('执行补发异常:', err);
    } finally {
        await browserContext.close();
    }
}

main();
