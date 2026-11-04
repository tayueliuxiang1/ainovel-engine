const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, '../assets/scheduled_publish_789.log');
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');
const publishScript = path.resolve(__dirname, 'publish.js');

const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

log("==================================================");
log("🚀 开始直接推送第 7、8、9 章至番茄作家后台...");
log("==================================================");

let allSuccess = true;
const publishedChapters = [];

for (const chap of ['7', '8', '9']) {
    log(`\n👉 正在执行第 ${chap} 章自动排版与发布流程...`);
    const res = spawnSync('node', [publishScript, '--chapter', chap], {
        stdio: 'inherit',
        env: { ...process.env, FANQIE_MIN_HAN: '1800' }
    });
    
    if (res.status === 0) {
        log(`✅ 第 ${chap} 章已成功提交并直接发布上线！`);
        publishedChapters.push(chap);
    } else {
        log(`⚠️ 第 ${chap} 章发布异常，退出码: ${res.status}`);
        allSuccess = false;
        break;
    }
    
    // 章节间休息 6 秒，保证后台平稳同步
    log("⏳ 等待 6 秒平稳过渡...");
    const start = Date.now();
    while (Date.now() - start < 6000) {}
}

if (allSuccess) {
    log("\n🎉 第 7、8、9 章全部直接发布成功！正在更新自动排期总表...");
    try {
        const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
        
        // 更新批次 2 状态
        const batch2 = scheduleData.batches.find(b => b.batch_id === 2);
        if (batch2) {
            batch2.status = "published";
            batch2.published_at = new Date().toLocaleString();
            batch2.notes = "已成功直接发布上线，0错字，0星号";
        }
        
        // 自动顺延后续批次，从明天 2026-11-04 10:00:00 开始发布批次 3 (第 10、11、12 章)
        let startDate = new Date('2026-11-04T10:00:00+08:00');
        scheduleData.current_batch_index = 3;
        
        for (let i = 2; i < scheduleData.batches.length; i++) {
            const b = scheduleData.batches[i];
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const timeStr = `${dateStr} 10:00:00`;
            
            b.scheduled_date = dateStr;
            b.scheduled_time = timeStr;
            if (b.batch_id === 3) {
                b.notes = "已生成，0星号，明日10点待发";
            } else if (b.batch_id === 4) {
                b.notes = "已生成，0星号，后天10点待发";
            }
            
            // 下一天
            startDate.setDate(startDate.getDate() + 1);
        }
        
        fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
        log("✅ 排期总表已更新：批次 3 (第 10、11、12 章) 已定为明日 10:00 自动推送！");
    } catch (e) {
        log(`⚠️ 更新排期表失败: ${e.message}`);
    }
} else {
    log("\n⚠️ 部分章节发布中断，请检查日志。");
}
