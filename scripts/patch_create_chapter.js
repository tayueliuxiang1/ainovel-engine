const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../tools/auto-fanqie/fanqie-test/create_chapter.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. 替换 headless 配置
code = code.replace(
    /const context = await chromium\.launchPersistentContext\(userDataDir, \{[\s\S]*?headless: false, channel: 'chrome', viewport: null[\s\S]*?\}\);/,
    `const isHeadless = process.env.FANQIE_HEADLESS === '0' ? false : true;
    console.log(\`🌐 启动自动化引擎 (Headless: \${isHeadless})...\`);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: isHeadless, channel: 'chrome', viewport: { width: 1440, height: 900 }
    });`
);

// 2. 增强小说点击后的多标签切换
code = code.replace(
    /if \(novelName\) \{[\s\S]*?await page\.locator\(`text="\$\{novelName\}"`\)\.first\(\)\.click\(\);[\s\S]*?await page\.waitForTimeout\(3000\);[\s\S]*?\}/,
    `if (novelName) {
            console.log(\`📖 点击小说: \${novelName}\`);
            const novelLoc = page.locator(\`text="\${novelName}"\`).first();
            await novelLoc.waitFor({ state: 'visible', timeout: 15000 });
            await novelLoc.click();
            await page.waitForTimeout(4000);

            if (context.pages().length > 1) {
                page = context.pages()[context.pages().length - 1];
                await page.bringToFront();
                console.log(\`📑 检测到新窗口弹出，已切换到小说管理页: \${page.url()}\`);
                await page.waitForTimeout(2000);
            }
        }`
);

// 3. 增强新建章节选择器与报错截图
code = code.replace(
    /await page\.locator\('text=新建章节'\)\.first\(\)\.click\(\{ force: true \}\);/,
    `const newChapterBtn = page.locator('button:has-text("新建章节"), .arco-btn:has-text("新建章节"), a:has-text("新建章节"), text="新建章节", button:has-text("写新章节"), text="写新章节", button:has-text("立即创作")').first();
        try {
            await newChapterBtn.waitFor({ state: 'visible', timeout: 8000 });
            await newChapterBtn.click({ force: true });
        } catch(e) {
            console.log("⚠️ 标准新建章节按钮未出现，尝试在全页面查找包含‘新建’或‘写’的按钮...");
            const shotPath = require('path').resolve(__dirname, '../../assets/debug_new_chapter_timeout.png');
            await page.screenshot({ path: shotPath, fullPage: true });
            console.log("📸 已保存当前页面排查截图: " + shotPath);
            await page.locator('button:has-text("新建"), a:has-text("新建"), button:has-text("写"), a:has-text("写")').first().click({ force: true });
        }`
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log("✅ create_chapter.js 已成功打上多标签与弹性选择器补丁！");
