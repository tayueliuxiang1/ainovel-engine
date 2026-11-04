const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../assets/modal_dump.html'), 'utf8');
console.log("Full HTML length:", html.length);
console.log("Includes 定时?", html.includes('定时'));
console.log("Includes 预约?", html.includes('预约'));
console.log("Includes 时间?", html.includes('时间'));
console.log("Includes 日期?", html.includes('日期'));
console.log("Includes 立即?", html.includes('立即'));
console.log("Includes 稍后?", html.includes('稍后'));
console.log("Includes 发布?", html.includes('发布'));
