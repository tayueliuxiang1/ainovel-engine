const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, '../assets/scheduled_publish_10_11_12.log');
const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

log("==================================================");
log("🚀 [计划任务启动] 开始自动发布第 10、11、12 章至番茄作家后台");
log("==================================================");

const publishScript = path.resolve(__dirname, 'publish.js');

for (const chap of ['10', '11', '12']) {
    log(`\n👉 正在执行第 ${chap} 章自动排版与发布流程...`);
    const res = spawnSync('node', [publishScript, '--chapter', chap], {
        stdio: 'inherit',
        env: { ...process.env, FANQIE_MIN_HAN: '1800' }
    });
    if (res.status === 0) {
        log(`✅ 第 ${chap} 章已成功提交番茄小说后台！`);
    } else {
        log(`⚠️ 第 ${chap} 章发布进程退出码: ${res.status}`);
    }
    
    // 章节间休息 5 秒
    const start = Date.now();
    while (Date.now() - start < 5000) {}
}

log("\n🎉 [全部完成] 第 10、11、12 章已全部自动录入番茄小说后台！");
