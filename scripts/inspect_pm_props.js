const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');

(async () => {
    const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');
    const targetUrl = "https://fanqienovel.com/main/writer/7703749876651150360/publish/?enter_from=newchapter_1";
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const pmAnalysis = await page.evaluate(() => {
        const pmEl = document.querySelector('.serial-editor-content .ProseMirror');
        if (!pmEl) return { error: "No pmEl" };

        // 递归查找带有 view 或 dispatch 的属性
        const findView = (obj, depth = 0) => {
            if (!obj || depth > 3) return null;
            if (obj.view && obj.view.dispatch) return "found view in obj.view";
            if (obj.dispatch && obj.state) return "found view directly";
            return null;
        };

        const sylParent = pmEl.closest('.syl-editor');
        const container = pmEl.closest('.serial-editor-content');

        return {
            pmKeys: Object.keys(pmEl).slice(0, 20),
            sylKeys: sylParent ? Object.keys(sylParent).slice(0, 20) : [],
            containerKeys: container ? Object.keys(container).slice(0, 20) : [],
            hasPmViewDesc: !!pmEl.pmViewDesc,
            pmViewDescKeys: pmEl.pmViewDesc ? Object.keys(pmEl.pmViewDesc) : []
        };
    });

    console.log("PM Analysis:", JSON.stringify(pmAnalysis, null, 2));
    await context.close();
})();
