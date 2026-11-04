// 多智能体可视化控制台本地 Web 服务（严格零星号）

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const htmlPath = path.resolve(__dirname, '../dashboard/index.html');

const server = http.createServer((req, res) => {
    // 跨域与基础响应头
    res.setHeader('Access-Control-Allow-Origin', String.fromCharCode(42));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlContent);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Dashboard HTML 文件未找到');
        }
        return;
    }

    if (req.url === '/api/status') {
        const summariesPath = path.resolve(__dirname, '../02_memories/chapter_summaries.md');
        const schedulePath = path.resolve(__dirname, '../config/publishing_schedule.json');
        const chaptersDir = path.resolve(__dirname, '../03_chapters');

        let summaries = '';
        if (fs.existsSync(summariesPath)) {
            summaries = fs.readFileSync(summariesPath, 'utf8');
        }

        let schedule = { batches: [] };
        if (fs.existsSync(schedulePath)) {
            try {
                schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
            } catch (e) {}
        }

        let chapters = [];
        if (fs.existsSync(chaptersDir)) {
            chapters = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'online',
            chapterCount: chapters.length,
            chapters: chapters,
            summaries: summaries,
            schedule: schedule
        }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log('\n================================================================');
    console.log('【多智能体网文控制台】 本地可视化 Web 服务已启动！');
    console.log('请在浏览器中打开访问: http://localhost:' + PORT);
    console.log('可在此直观监控智能体博弈、查看毒点雷达打分、审核章节正文与排期入库');
    console.log('================================================================\n');
});
