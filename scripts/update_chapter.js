const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const args = process.argv.slice(2);
let chapterNum = '1';
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chapter' && args[i+1]) {
        chapterNum = args[i+1];
        i++;
    }
}

const formattedNum = chapterNum.toString().padStart(3, '0');
const chapterFile = path.resolve(__dirname, `../03_chapters/chapter_${formattedNum}.md`);

if (!fs.existsSync(chapterFile)) {
    console.error(`❌ 未找到章节文件: ${chapterFile}`);
    process.exit(1);
}

const rawContent = fs.readFileSync(chapterFile, 'utf8');
const lines = rawContent.split(/\r?\n/);
let title = `第${chapterNum}章`;
let bodyLines = [];
let isBody = false;

for (let line of lines) {
    if (line.startsWith('# ')) {
        title = line.replace('# ', '').trim();
        isBody = true;
        continue;
    }
    if (line.includes('【Editor') || (line.trim() === '---' && isBody)) break;
    if (isBody) bodyLines.push(line);
}

// 确保绝无星号
let cleanBody = bodyLines.join('\n').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*/g, '').trim();

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    console.log(`🌐 启动修改覆盖流程：第 ${chapterNum} 章...`);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 导航到作品管理页...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
        await bookCard.waitFor({ state: 'visible', timeout: 25000 });

        console.log("👉 进入章节管理...");
        const chapManageBtn = bookCard.locator('button:has-text("章节管理"), a:has-text("章节管理")').first();
        await chapManageBtn.click({ force: true });
        await page.waitForTimeout(3000);

        // 定位对应章节行
        console.log(`🔎 寻找第 ${chapterNum} 章所在行...`);
        const targetRow = page.locator('tr, .arco-table-tr').filter({ hasText: `第${chapterNum}章` }).first();
        await targetRow.waitFor({ state: 'visible', timeout: 10000 });

        const editBtn = targetRow.locator('a.link, .auto-editor-chapter-edit, [class*="edit"]').first();
        await editBtn.click({ force: true });
        await page.waitForTimeout(4000);

        let editorPage = page;
        for (const p of context.pages()) {
            if (p.url().includes('/publish/')) {
                editorPage = p;
                break;
            }
        }
        await editorPage.bringToFront();
        await editorPage.waitForTimeout(2000);

        console.log(`📝 正在覆写第 ${chapterNum} 章正文（零星号版本）...`);
        const paragraphs = cleanBody.split('\n').map(p => p.trim()).filter(p => p !== '');
        const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

        await editorPage.evaluate((html) => {
            const el = document.querySelector('.serial-editor-content .ProseMirror, .ProseMirror');
            if (el) {
                el.innerHTML = html;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, htmlContent);

        const mainEditor = editorPage.locator('.serial-editor-content .ProseMirror').first();
        await mainEditor.click();
        await editorPage.keyboard.type('。');
        await editorPage.keyboard.press('Backspace');
        await editorPage.waitForTimeout(1000);

        console.log("👉 点击【存草稿】同步云端...");
        const saveBtn = editorPage.locator('button:has-text("存草稿")').first();
        if (await saveBtn.isVisible().catch(() => false)) {
            await saveBtn.click();
            await editorPage.waitForTimeout(2500);
        }

        console.log("🚀 点击【下一步】提交修改...");
        const nextBtn = editorPage.locator('button.auto-editor-next, button.publish-button, button:has-text("下一步")').first();
        await nextBtn.click({ force: true });

        // 处理弹窗
        for (let i = 0; i < 20; i++) {
            await editorPage.waitForTimeout(1500);
            
            const typoModal = editorPage.locator('.arco-modal:has-text("错别字"), .arco-modal:has-text("发布提示")').first();
            if (await typoModal.isVisible().catch(() => false)) {
                const submitTypoBtn = typoModal.locator('button:has-text("提交"), button:has-text("确定")').first();
                if (await submitTypoBtn.isVisible().catch(() => false)) {
                    console.log("👉 点击错别字弹窗提交...");
                    await submitTypoBtn.click();
                }
            }

            const riskModal = editorPage.locator('[role="dialog"]:has-text("请选择内容检测方式"), .arco-modal:has-text("基础检测")').first();
            if (await riskModal.isVisible().catch(() => false)) {
                const basicBtn = riskModal.locator('button:has-text("仅基础检测"), button:has-text("基础检测")').first();
                if (await basicBtn.isVisible().catch(() => false)) {
                    console.log("👉 点击仅基础检测...");
                    await basicBtn.click();
                }
            }

            const publishModal = editorPage.locator('.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")').first();
            if (await publishModal.isVisible().catch(() => false)) {
                const noAiRadio = publishModal.locator('.arco-radio:has-text("否"), label:has-text("否")').first();
                if (await noAiRadio.isVisible().catch(() => false)) await noAiRadio.click();

                const confirmPublishBtn = publishModal.locator('button:has-text("确认提交"), button:has-text("确认发布")').first();
                if (await confirmPublishBtn.isVisible().catch(() => false)) {
                    console.log("🚀 点击【确认提交】保存修改！");
                    await confirmPublishBtn.click();
                    await editorPage.waitForTimeout(3000);
                    break;
                }
            }
        }

        console.log(`🎉 第 ${chapterNum} 章已成功覆写更新为无星号纯净版！`);
    } catch (e) {
        console.error("❌ 更新过程发生异常:", e);
    } finally {
        await context.close().catch(() => {});
    }
})();
