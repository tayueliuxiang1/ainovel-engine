const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');
const publishScript = path.resolve(__dirname, 'publish.js');

const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));
const nextBatch = scheduleData.batches.find(b => b.status !== 'published');

if (!nextBatch) {
    console.log("所有批次均已发布！");
    process.exit(0);
}

console.log("==================================================");
console.log(`🚀 开始手动直接推送批次 ${nextBatch.batch_id} (第 ${nextBatch.chapters.join('、')} 章)...`);
console.log("==================================================");

let allSuccess = true;
for (const chap of nextBatch.chapters) {
    console.log(`\n👉 正在推送第 ${chap} 章...`);
    const res = spawnSync('node', [publishScript, '--chapter', chap.toString()], {
        stdio: 'inherit',
        env: { ...process.env, FANQIE_MIN_HAN: '1800' }
    });
    if (res.status === 0) {
        console.log(`✅ 第 ${chap} 章发布成功！`);
    } else {
        console.error(`❌ 第 ${chap} 章发布失败，退出码: ${res.status}`);
        allSuccess = false;
        break;
    }
    const start = Date.now();
    while (Date.now() - start < 5000) {}
}

if (allSuccess) {
    nextBatch.status = "published";
    nextBatch.published_at = new Date().toLocaleString();
    nextBatch.notes = "已成功直接发布上线，0错字，0星号";
    
    scheduleData.current_batch_index = nextBatch.batch_id + 1;
    let startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0);
    
    for (let i = scheduleData.batches.indexOf(nextBatch) + 1; i < scheduleData.batches.length; i++) {
        const b = scheduleData.batches[i];
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        b.scheduled_date = `${year}-${month}-${day}`;
        b.scheduled_time = `${b.scheduled_date} 10:00:00`;
        startDate.setDate(startDate.getDate() + 1);
    }
    
    fs.writeFileSync(scheduleConfigFile, JSON.stringify(scheduleData, null, 2), 'utf8');
    console.log(`\n🎉 批次 ${nextBatch.batch_id} 发布成功，排期表已自动递延！`);
}
