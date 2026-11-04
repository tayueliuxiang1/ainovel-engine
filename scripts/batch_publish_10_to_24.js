const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, '../assets/batch_publish_10_to_24.log');
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');
const publishScript = path.resolve(__dirname, 'publish.js');

const log = (msg) => {
    const time = new Date().toLocaleString();
    const str = `[${time}] ${msg}\n`;
    process.stdout.write(str);
    try { fs.appendFileSync(logFile, str, 'utf8'); } catch (_) {}
};

log("==================================================");
log("🚀 [全量推进] 开始直接批量推送第 10 至 24 章至番茄小说后台...");
log("==================================================");

const chapters = [];
for (let i = 10; i <= 24; i++) {
    chapters.push(i.toString());
}

let allSuccess = true;
const successfulChapters = [];

for (const chap of chapters) {
    log(`\n👉 正在执行第 ${chap} 章自动排版与发布流程...`);
    const res = spawnSync('node', [publishScript, '--chapter', chap], {
        stdio: 'inherit',
        env: { ...process.env, FANQIE_MIN_HAN: '1800' }
    });
    
    if (res.status === 0) {
        log(`✅ 第 ${chap} 章已成功提交并直接发布上线！`);
        successfulChapters.push(chap);
    } else {
        log(`❌ 第 ${chap} 章发布异常退出 (code: ${res.status})`);
        allSuccess = false;
        break;
    }
    
    // 章节间休息 6 秒，保持番茄后台平稳过渡
    log("⏳ 等待 6 秒平稳过渡...");
    const start = Date.now();
    while (Date.now() - start < 6000) {}
}

if (allSuccess) {
    log("\n🎉 [全部完成] 第 10 至 24 章已全部成功直接发布上线！");
    try {
        const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
        
        // 标记批次 3 ~ 7 为已发布
        for (let bId = 3; bId <= 7; bId++) {
            const b = scheduleData.batches.find(item => item.batch_id === bId);
            if (b) {
                b.status = "published";
                b.published_at = new Date().toLocaleString();
                b.notes = "已成功直接发布上线，0错字，0星号";
            }
        }
        
        // 自动顺延后续批次：批次 8 (第 25、26、27 章) 定于明日 10:00 自动推送
        scheduleData.current_batch_index = 8;
        let startDate = new Date('2026-11-04T10:00:00+08:00');
        
        for (let i = 7; i < scheduleData.batches.length; i++) {
            const b = scheduleData.batches[i];
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            b.scheduled_date = dateStr;
            b.scheduled_time = `${dateStr} 10:00:00`;
            if (b.batch_id === 8) {
                b.notes = "第三卷新章节，待写完后明日10点自动推送";
            }
            startDate.setDate(startDate.getDate() + 1);
        }
        
        fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
        log("✅ 排期总表已更新：批次 8 (第 25、26、27 章) 已顺延定为明日 10:00！");
    } catch (e) {
        log(`⚠️ 更新排期总表异常: ${e.message}`);
    }
} else {
    log(`\n⚠️ 批量发布中断，已成功发布的章节: ${successfulChapters.join(', ')}`);
}
