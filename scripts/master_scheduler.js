const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');
const logFile = path.resolve(__dirname, '../assets/master_scheduler.log');
const publishScript = path.resolve(__dirname, 'publish.js');

const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

function readSchedule() {
    return JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
}

function saveSchedule(data) {
    fs.writeFileSync(scheduleConfigFile, JSON.stringify(data, null, 2), 'utf8');
}

log("==================================================");
log("🌟 [番茄小说全自动定时预约发布总控中心启动]");
log(`📅 启动时间: ${new Date().toLocaleString()}`);
log("==================================================");

let scheduleData = readSchedule();
log(`📖 作品: 《${scheduleData.project_name}》`);
log(`⏰ 每日定时发布时间: ${scheduleData.daily_release_time} (${scheduleData.timezone})`);

// 打印未来排期表
console.log("\n📋 [当前排期总览]:");
scheduleData.batches.forEach(b => {
    if (b.chapters[0] <= 24) {
        console.log(`  - 批次 ${b.batch_id} [第 ${b.chapters.join('、')} 章] -> 计划时间: ${b.scheduled_time} | 状态: ${b.status}`);
    }
});
console.log("");

const checkInterval = 1000 * 20; // 每 20 秒检查一次

async function processBatch(batch) {
    log(`\n🚀 [触发条件满足] 开始自动发布批次 ${batch.batch_id} (第 ${batch.chapters.join('、')} 章)...`);
    
    let allSuccess = true;
    for (const chap of batch.chapters) {
        log(`👉 正在发布第 ${chap} 章...`);
        const res = spawnSync('node', [publishScript, '--chapter', chap.toString()], {
            stdio: 'inherit',
            env: { ...process.env, FANQIE_MIN_HAN: '1800' }
        });
        
        if (res.status === 0) {
            log(`✅ 第 ${chap} 章发布成功录入后台！`);
        } else {
            log(`❌ 第 ${chap} 章发布异常退出 (code: ${res.status})`);
            allSuccess = false;
        }
        
        // 章节间休息 6 秒，保证后台平稳同步
        const start = Date.now();
        while (Date.now() - start < 6000) {}
    }
    
    // 重新加载配置并标记状态
    scheduleData = readSchedule();
    const target = scheduleData.batches.find(b => b.batch_id === batch.batch_id);
    if (target) {
        target.status = allSuccess ? "published" : "partially_failed";
        target.published_at = new Date().toLocaleString();
        saveSchedule(scheduleData);
    }
    log(`🏁 批次 ${batch.batch_id} 发布流程结束，状态已更新。\n`);
}

let isProcessing = false;

const timer = setInterval(async () => {
    if (isProcessing) return;
    
    const now = new Date();
    scheduleData = readSchedule();
    
    // 寻找当前已到达发布时间但尚未发布的批次
    for (const batch of scheduleData.batches) {
        if (batch.status === "published") continue;
        
        const targetTime = new Date(batch.scheduled_time.replace(' ', 'T') + '+08:00');
        if (now >= targetTime) {
            isProcessing = true;
            try {
                await processBatch(batch);
            } catch (err) {
                log(`⚠️ 执行批次 ${batch.batch_id} 发生未捕获异常: ${err.message}`);
            } finally {
                isProcessing = false;
            }
            break; // 每次检查只处理一个批次
        }
    }
}, checkInterval);
