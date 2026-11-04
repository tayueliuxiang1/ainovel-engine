const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const novelName = "让你遵守规则，你把诡异逼疯了？";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();

    await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
    const bookCard = page.locator('.completion-book-item-main').filter({ hasText: novelName }).first();
    await bookCard.waitFor({ state: 'visible', timeout: 25000 });

    const createBtn = bookCard.locator('button:has-text("创建章节"), a:has-text("创建章节")').first();
    await createBtn.click();
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

    // 关闭引导弹窗 (按 ESC 或点击空白处)
    await editorPage.keyboard.press('Escape');
    await editorPage.waitForTimeout(500);

    // 测试通过 ProseMirror View 或 paste 事件输入正文
    const sampleText = "第一段测试文字：蓝星历2026年，天道怪谈降临整整三年。\n\n第二段测试文字：苏白推了推眼镜，眼神冰冷。";

    const result = await editorPage.evaluate((text) => {
        const pmEl = document.querySelector('.ProseMirror');
        if (!pmEl) return { error: "No ProseMirror element" };

        pmEl.focus();

        // 方法 1: 检查 pmViewDesc
        let method = "unknown";
        if (pmEl.pmViewDesc && pmEl.pmViewDesc.view) {
            method = "pmViewDesc";
            const view = pmEl.pmViewDesc.view;
            const schema = view.state.schema;
            // 简单的文本切段
            const lines = text.split('\n\n').filter(Boolean);
            const nodes = lines.map(line => schema.nodes.paragraph.create(null, schema.text(line)));
            const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, nodes);
            view.dispatch(tr);
        } else {
            // 方法 2: execCommand insertText
            method = "execCommand";
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, text);
        }

        // 检查顶部的字数显示
        const wordCountEl = document.querySelector('.serial-editor-header, .auto-editor-word-count, body');
        return {
            method,
            bodyText: pmEl.innerText.slice(0, 100),
            pageSnippet: wordCountEl ? wordCountEl.innerText.slice(0, 200) : ''
        };
    }, sampleText);

    console.log("Evaluation Result:", JSON.stringify(result, null, 2));

    await editorPage.waitForTimeout(2000);

    const shotPath = path.resolve(__dirname, '../assets/test_pm_view_result.png');
    await editorPage.screenshot({ path: shotPath, fullPage: true });
    console.log("Screenshot saved to:", shotPath);

    await context.close();
})();
