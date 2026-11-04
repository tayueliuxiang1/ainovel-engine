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
    await page.waitForTimeout(4000);

    const editorInternals = await page.evaluate(() => {
        const pmEl = document.querySelector('.serial-editor-content .ProseMirror');
        const sylEl = document.querySelector('.serial-editor-content .syl-editor');
        const container = document.querySelector('.serial-editor-content');

        const inspectEl = (el) => {
            if (!el) return null;
            const keys = Object.keys(el);
            const reactKey = keys.find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            const vueKey = keys.find(k => k.startsWith('__vue'));
            return {
                keys: keys.slice(0, 30),
                hasReact: !!reactKey,
                hasVue: !!vueKey,
                pmViewDesc: !!el.pmViewDesc,
                sylView: !!el.sylView
            };
        };

        return {
            pm: inspectEl(pmEl),
            syl: inspectEl(sylEl),
            container: inspectEl(container)
        };
    });

    console.log("Internals:", JSON.stringify(editorInternals, null, 2));
    await context.close();
})();
