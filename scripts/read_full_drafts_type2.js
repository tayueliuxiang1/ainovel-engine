// 查看草稿箱后半部分内容
// 严格遵守零星号铁律，不含 ASCII 0x2A

const { chromium } = require('../tools/auto-fanqie/node_modules/playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.playwright', 'fanqie-profile');

async function main() {
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        headless: true,
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
    });

    const page = browserContext.pages()[0] || await browserContext.newPage();
    const draftUrl = 'https://fanqienovel.com/main/writer/chapter-manage/7704518175408278552&%E5%A4%A7%E5%94%90%EF%BC%9A%E7%9B%97%E6%88%91%E6%8A%97%E6%97%B1%E5%9B%BE%EF%BC%9F?type=2';
    console.log('直接访问草稿箱URL:', draftUrl);
    await page.goto(draftUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map((tr, idx) => {
            const txt = (tr.innerText || '').trim().replace(/\n+/g, ' | ');
            const links = Array.from(tr.querySelectorAll('a, button')).map(a => ({
                text: a.innerText.trim(),
                href: a.getAttribute('href') || ''
            }));
            return { idx: idx + 1, txt, links };
        });
    });

    console.log('草稿箱全量行数: ' + rows.length);
    rows.forEach(r => {
        console.log(r.idx + ': ' + r.txt + ' --> 链接数: ' + r.links.length);
        r.links.forEach(l => console.log('    ' + l.text + ' (' + l.href + ')'));
    });

    await browserContext.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
