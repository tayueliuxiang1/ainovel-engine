const fs = require('fs');
const path = require('path');

const scheduleConfigFile = path.resolve(__dirname, '../config/publishing_schedule.json');
const scheduleData = JSON.parse(fs.readFileSync(scheduleConfigFile, 'utf8'));

console.log("==========================================================================");
console.log(`📖 作品: 《${scheduleData.project_name}》 定时预约发布日历 (当前本地时间: ${new Date().toLocaleString()})`);
console.log("==========================================================================");
console.log("批次\t章节\t\t预约发布日期与时间\t\t就绪状态");
console.log("--------------------------------------------------------------------------");

scheduleData.batches.forEach(b => {
    if (b.chapters[0] <= 24) {
        const chapStr = `第 ${b.chapters.join('、')} 章`;
        let statusStr = "⏳ 待生成";
        if (b.status === "published") statusStr = "✅ 已发布";
        else if (b.status === "written_and_queued" || b.status === "ready_and_scheduled") statusStr = "🟢 已就绪 (定时监听中)";
        console.log(`${b.batch_id}\t${chapStr.padEnd(14, ' ')}\t${b.scheduled_time}\t${statusStr}`);
    }
});
console.log("==========================================================================");
console.log("💡 提示: 守护进程正在后台精准监听中，每到达设定时间将自动推送到番茄后台。");
console.log("==========================================================================");
