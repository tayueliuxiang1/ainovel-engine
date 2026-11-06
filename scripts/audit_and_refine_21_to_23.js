// 质检与精修脚本: scripts/audit_and_refine_21_to_23.js
// 严格遵守零星号铁律，不含 ASCII 0x2A

const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, '..', '03_chapters');
const files = ['chapter_021.md', 'chapter_022.md', 'chapter_023.md'];

console.log('=== 开始对第21至23章进行深度文史与术语自检 ===');

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
        '烧刀子',
        '化工实验室',
        '分子碰撞',
        '酯水解',
        '苛性钠',
        '汇票',
        '眼镜'
    ];

    targetSuspicious.forEach(term => {
        if (content.indexOf(term) !== -1) {
            console.log('发现需本土化处理的词汇 [' + term + '] in ' + file);
        }
    });
});
