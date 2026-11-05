const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { applyStealthEvasions } = require('./stealth_utils');

const BOOK_ID = '7704518175408278552';
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await applyStealthEvasions(page);

    try {
        console.log("1. 正在进入编辑器...");
        const url = `https://fanqienovel.com/main/writer/${BOOK_ID}/publish/?enter_from=newchapter_1`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        // 2. 彻底清理新手引导浮层
        console.log("2. 清理新手引导浮层...");
        await page.evaluate(() => {
            const guides = document.querySelectorAll('.arco-popover, .arco-tour, .driver-popover, .guide-modal, .byte-popover, [class*="guide"], [class*="tour"], [class*="novice"]');
            guides.forEach(g => g.remove());
            // 也可以按几次 Escape
        });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // 3. 填写章节序号
        console.log("3. 填写章节序号与标题...");
        const chapInputs = page.locator('input');
        const count = await chapInputs.count();
        console.log(`页面 input 数量: ${count}`);
        
        // 找到属于主编辑区的 input
        await chapInputs.nth(0).fill('1');
        await chapInputs.nth(0).blur();
        await page.waitForTimeout(500);

        await chapInputs.nth(1).fill('曲江暗流');
        await chapInputs.nth(1).blur();
        await page.waitForTimeout(500);

        // 4. 注入正文
        console.log("4. 注入正文...");
        const rawContent = fs.readFileSync(path.resolve(__dirname, '../03_chapters/chapter_001.md'), 'utf8');
        const paragraphs = rawContent.split(/\r?\n/).map(p => p.trim()).filter(p => !p.startsWith('# ') && !p.includes('---') && p !== '');
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
        console.log("正文注入完毕并激活！");
        await page.waitForTimeout(2000);

        // 5. 点击【存草稿】
        const saveDraftBtn = page.locator('button:has-text("存草稿")').first();
        if (await saveDraftBtn.isVisible()) {
            await saveDraftBtn.click();
            console.log("已点击【存草稿】");
            await page.waitForTimeout(3000);
        }

        // 6. 精确定位右上角的【下一步】按钮 (Y 坐标必须在顶部 < 100，X 坐标在右侧 > 800)
        console.log("6. 寻找右上角发布【下一步】按钮...");
        const allNextBtns = page.locator('button:has-text("下一步")');
        const nextCount = await allNextBtns.count();
        console.log(`检测到【下一步】按钮数量: ${nextCount}`);

        let headerNextBtn = null;
        for (let i = 0; i < nextCount; i++) {
            const btn = allNextBtns.nth(i);
            const box = await btn.boundingBox();
            if (box) {
                console.log(`按钮 [${i}]: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
                if (box.y < 120 && box.x > 800) {
                    headerNextBtn = btn;
                    console.log(`🎯 命中右上角发布按钮 [${i}]!`);
                    break;
                }
            }
        }

        if (!headerNextBtn) {
            headerNextBtn = allNextBtns.first();
        }

        await headerNextBtn.click({ force: true });
        console.log("已点击右上角【下一步】按钮！");
        await page.waitForTimeout(3000);

        // 7. 处理【请选择内容检测方式】弹窗
        console.log("7. 处理内容检测弹窗...");
        await page.screenshot({ path: path.resolve(__dirname, '../assets/step_detect_modal.png') });

        // 优先点击【仅基础检测】
        const clickedDetect = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div, span'));
            const basic = buttons.find(b => b.innerText && b.innerText.trim() === '仅基础检测');
            if (basic) {
                basic.click();
                return '已点击【仅基础检测】';
            }
            const allDet = buttons.find(b => b.innerText && b.innerText.trim() === '全面检测');
            if (allDet) {
                allDet.click();
                return '已点击【全面检测】';
            }
            return '未找到检测按钮';
        });
        console.log(clickedDetect);
        await page.waitForTimeout(3500);

        // 8. 处理【发布设置】终极弹窗
        console.log("8. 处理发布设置弹窗...");
        await page.screenshot({ path: path.resolve(__dirname, '../assets/step_publish_modal.png') });

        const publishSuccess = await page.evaluate(() => {
            // 选择不使用AI
            const radios = Array.from(document.querySelectorAll('.arco-radio, label, span'));
            const noAi = radios.find(r => r.innerText && r.innerText.trim() === '否');
            if (noAi) noAi.click();

            // 点击确认发布
            const btns = Array.from(document.querySelectorAll('button, div, span'));
            const confirmBtn = btns.find(b => b.innerText && (b.innerText.trim() === '确认发布' || b.innerText.trim() === '确认提交'));
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        });

        if (publishSuccess) {
            console.log("🎉 已点击【确认发布】终极提交！等待网络结算 6 秒...");
            await page.waitForTimeout(6000);
            await page.screenshot({ path: path.resolve(__dirname, '../assets/chapter1_published_success.png') });
            console.log("📸 终极发布成功截图已保存: assets/chapter1_published_success.png");
        } else {
            console.log("未直接找到发布设置弹窗，查看当前弹窗状态...");
            const modalText = await page.evaluate(() => document.body.innerText.slice(0, 500));
            console.log("页面文本:\n", modalText);
        }

    } catch (e) {
        console.error("执行异常:", e);
    } finally {
        await context.close();
    }
})();
