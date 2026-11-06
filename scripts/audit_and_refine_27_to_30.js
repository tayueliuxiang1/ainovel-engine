// 质检与自查脚本: scripts/audit_and_refine_27_to_30.js
// 严格遵守零星号铁律，不含 ASCII 0x2A

const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, '..', '03_chapters');
const files = ['chapter_027.md', 'chapter_028.md', 'chapter_029.md', 'chapter_030.md'];

console.log('=== 开始对第27至30章进行深度文史与术语自检 ===');

files.forEach(file => {
    const fullPath = path.join(chaptersDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. 星号检测
    const asteriskMatches = content.match(/\x2A/g);
    const asteriskCount = asteriskMatches ? asteriskMatches.length : 0;

    // 2. 字数统计
    const charCount = content.length;

    console.log(file + ' 当前字数: ' + charCount + ', 星号数量: ' + asteriskCount);

    // 3. 历史穿帮与近世/现代词汇靶向排查
    const targetSuspicious = [
        '商业风控模型',
        '护城河网络',
        '工业',
        '化学',
        '实验室',
        '现代',
        '品控'
    ];

    targetSuspicious.forEach(term => {
        if (content.indexOf(term) !== -1) {
            console.log('发现需本土化处理的词汇 [' + term + '] in ' + file);
        }
    });
});
