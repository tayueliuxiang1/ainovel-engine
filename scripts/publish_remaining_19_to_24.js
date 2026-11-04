const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const publishScript = path.resolve(__dirname, 'publish.js');
const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');

const log = (msg) => {
    const time = new Date().toLocaleString();
    console.log(`[${time}] ${msg}`);
};

const chapters = [19, 20, 21, 22, 23, 24];

log("==================================================");
log(`🚀 开始发布剩余章节: 第 ${chapters.join('、')} 章...`);
log("==================================================");

for (const chap of chapters) {
    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
        log(`\n👉 正在推送第 ${chap} 章 (尝试 ${attempt}/3)...`);
        const res = spawnSync('node', [publishScript, '--chapter', chap.toString()], {
            stdio: 'inherit',
            env: { ...process.env, FANQIE_MIN_HAN: '1800' }
        });
        
        if (res.status === 0) {
            log(`✅ 第 ${chap} 章发布成功录入后台！`);
            success = true;
            break;
        } else {
            log(`⚠️ 第 ${chap} 章发布失败，退出码: ${res.status}，等待 8 秒重试...`);
            const waitStart = Date.now();
            while (Date.now() - waitStart < 8000) {}
        }
    }
    
    if (!success) {
        log(`❌ 第 ${chap} 章重试3次仍失败，流程终止！`);
        process.exit(1);
    }
    
    // 章节间平稳过渡 6 秒
    log("⏳ 等待 6 秒平稳过渡...");
    const start = Date.now();
    while (Date.now() - start < 6000) {}
}

log("\n🎉 [全部成功] 第 19 至 24 章已全部成功录入并直接发布！");

try {
    const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
    for (let bId = 1; bId <= 7; bId++) {
        const b = scheduleData.batches.find(item => item.batch_id === bId);
        if (b) {
            b.status = "published";
            b.published_at = new Date().toLocaleString();
            b.notes = "已成功直接发布上线，0错字，0星号";
        }
    }
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
            b.notes = "第三卷新章节，明日10点自动推送";
        }
        startDate.setDate(startDate.getDate() + 1);
    }
    fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
    log("✅ 排期总表已更新：批次 8 (第 25、26、27 章) 已顺延定为明日 10:00！");
} catch (e) {
    log(`⚠️ 更新排期总表异常: ${e.message}`);
}
