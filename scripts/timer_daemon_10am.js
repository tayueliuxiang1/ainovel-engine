const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, '../assets/scheduled_publish_456.log');
const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

// 目标时间：明天（2026-11-04）上午 10:00:00
const now = new Date();
const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);

const msRemaining = target.getTime() - now.getTime();
const hoursRemaining = (msRemaining / (1000 * 60 * 60)).toFixed(2);

log(`⏰ [定时守护进程已启动]`);
log(`📅 当前时间: ${now.toLocaleString()}`);
log(`🎯 计划触发时间: ${target.toLocaleString()} (约 ${hoursRemaining} 小时后)`);
log(`💤 守护进程进入精准监听状态...`);

// 每 30 秒轮询一次当前时间
const timer = setInterval(() => {
    const curr = new Date();
    if (curr >= target) {
        clearInterval(timer);
        log(`\n🔔 [时间已到达！] 触发第 4、5、6 章自动化推送任务！`);
        
        const batchScript = path.resolve(__dirname, 'batch_publish_456.js');
        const res = spawnSync('node', [batchScript], { stdio: 'inherit' });
        
        log(`🏁 [任务执行完毕] 退出码: ${res.status}`);
        process.exit(0);
    }
}, 30000);
