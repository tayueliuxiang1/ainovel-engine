const fs = require('fs');
const path = require('path');

const files = [
    '03_chapters/chapter_001.md',
    '03_chapters/chapter_002.md',
    '03_chapters/chapter_003.md'
];

files.forEach(f => {
    const full = path.resolve(__dirname, '..', f);
    const content = fs.readFileSync(full, 'utf8');
    const hasAsterisk = content.includes(String.fromCharCode(42));
    const lines = content.split(/\r?\n/);
    const titleLine = lines.find(l => l.startsWith('# ')) || '无标题行';
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    console.log(`文件: ${f}`);
    console.log(`  标题: ${titleLine}`);
    console.log(`  纯汉字数: ${chineseChars}`);
    console.log(`  星号检测结果: ${hasAsterisk ? '存在违规星号' : '合格（绝对零星号）'}`);
});
