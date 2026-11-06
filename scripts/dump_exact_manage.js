const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

(async () => {
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto('https://fanqienovel.com/main/writer/chapter-manage/7704518175408278552&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tr, .arco-table-row'));
        return trs.map(tr => {
            const links = Array.from(tr.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
            const btns = Array.from(tr.querySelectorAll('button')).map(b => b.innerText);
            return { text: tr.innerText.replace(/\n+/g, ' | '), links, btns };
        });
    });

    console.log('Total rows detected:', data.length);
    data.forEach((r, idx) => {
        console.log('[' + idx + '] ' + r.text);
        if (r.links.length > 0) console.log('   links:', JSON.stringify(r.links));
        if (r.btns.length > 0) console.log('   btns:', JSON.stringify(r.btns));
    });

    await context.close();
})();
