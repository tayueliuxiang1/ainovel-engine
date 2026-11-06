const fs = require('fs');

// 1. 修正 02_memories/chapter_summaries.md
let summaries = fs.readFileSync('02_memories/chapter_summaries.md', 'utf8');
summaries = summaries.split('曲江池畔天降冻雨').join('灞河青石桥畔天降冻雨');
summaries = summaries.split('夜航西市便桥').join('顺流夜航至灞上大驿码头');
fs.writeFileSync('02_memories/chapter_summaries.md', summaries, 'utf8');

// 2. 修正 confirmed_chapters.md
let confirmed = fs.readFileSync('confirmed_chapters.md', 'utf8');
confirmed = confirmed.split('揭露曲江池见死不救').join('揭露灞河青石桥畔见死不救');
fs.writeFileSync('confirmed_chapters.md', confirmed, 'utf8');

console.log('Record files updated consistently!');
