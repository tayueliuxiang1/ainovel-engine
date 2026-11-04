const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// 1. 读取项目配置
const configPath = path.resolve(__dirname, '../config/project.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const args = process.argv.slice(2);
let chapterNum = '1';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chapter' && args[i + 1]) {
        chapterNum = args[i + 1];
        i++;
    }
}

// 格式化章节文件名
const formattedNum = chapterNum.toString().padStart(3, '0');
const chapterFile = path.resolve(__dirname, `../03_chapters/chapter_${formattedNum}.md`);

if (!fs.existsSync(chapterFile)) {
    console.error(`❌ 未找到章节文件: ${chapterFile}`);
    process.exit(1);
}

const rawContent = fs.readFileSync(chapterFile, 'utf8');

// 提取章节标题与正文（过滤掉评审报告）
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
    // 遇到分割线或评审报告即停止提取正文
    if (line.includes('【Editor') || line.trim() === '---' && isBody) {
        break;
    }
    if (isBody) {
        bodyLines.push(line);
    }
}

const cleanBody = bodyLines.join('\n').trim();

// 临时写入纯正文文件供 prepare
const tempFile = path.resolve(__dirname, `../.tmp_clean_chapter_${formattedNum}.txt`);
fs.writeFileSync(tempFile, cleanBody, 'utf8');

const cliPath = path.resolve(__dirname, '../tools/auto-fanqie/bin/cli.js');
const volumeName = "第一卷：幸福公寓租客守则";
const novelName = config.project_name || "让你遵守规则，你把诡异逼疯了？";

console.log("==================================================");
console.log(`🚀 开始自动推送到番茄小说后台`);
console.log(`📖 作品: 《${novelName}》`);
console.log(`📚 分卷: ${volumeName}`);
console.log(`📑 章节: ${title}`);
console.log(`📝 字数: ${cleanBody.length} 字符`);
console.log("==================================================\n");

// 第一步：Prepare 预检并暂存
console.log("👉 步骤 1: 文本过滤与格式化暂存 (prepare)...");
const prepResult = spawnSync('node', [cliPath, 'prepare', '--content-file', tempFile], {
    stdio: 'inherit',
    env: { ...process.env, FANQIE_MIN_HAN: '1800' }
});

if (prepResult.status !== 0) {
    console.error("❌ 格式化暂存失败，请检查字数是否达到要求！");
    try { fs.unlinkSync(tempFile); } catch (_) {}
    process.exit(prepResult.status || 1);
}

// 第二步：Publish 自动化发布
console.log("\n👉 步骤 2: 调用 Playwright 自动化推送到番茄作家后台...");
const pubResult = spawnSync('node', [
    cliPath,
    'publish',
    '--novel', novelName,
    '--volume', volumeName,
    '--title', title
], {
    stdio: 'inherit'
});

// 清理临时文件
try { fs.unlinkSync(tempFile); } catch (_) {}

if (pubResult.status === 0) {
    console.log("\n🎉 发布成功！章节已成功录入番茄小说后台。");
    process.exit(0);
} else {
    console.error("\n❌ 发布未完全成功，若未登录，请先运行: node scripts/login.js");
    process.exit(pubResult.status || 1);
}
