const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const targetTime = new Date('2026-11-05T10:00:00+08:00');
const logFile = path.resolve(__dirname, '../assets/timer_daemon_789.log');

const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

log("⏰ [定时守护进程已就绪: 第7、8、9章]");
log(`📅 当前时间: ${new Date().toLocaleString()}`);
log(`🎯 计划触发时间: ${targetTime.toLocaleString()} (后天上午 10:00)`);

const checkInterval = 1000 * 30; // 每 30 秒检查一次

const timer = setInterval(() => {
    const now = new Date();
    if (now >= targetTime) {
        clearInterval(timer);
        log("🚀 目标时间已到达！正在唤醒 Playwright 自动化发布第 7、8、9 章...");
        
        const publishProc = spawn('node', [path.resolve(__dirname, 'batch_publish_789.js')], {
            stdio: 'inherit',
            detached: true
        });
        
        publishProc.on('exit', (code) => {
            log(`🏁 第 7、8、9 章发布自动化任务执行完毕，退出码: ${code}`);
            process.exit(code || 0);
        });
    }
}, checkInterval);
