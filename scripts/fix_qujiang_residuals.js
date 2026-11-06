const fs = require('fs');

// 1. 修复 03_chapters/chapter_013.md
let ch13 = fs.readFileSync('03_chapters/chapter_013.md', 'utf8');
ch13 = ch13.split('他没有当场搬出曲江落水的谋害重罪').join('他没有当场搬出灞河落水的谋害重罪');
fs.writeFileSync('03_chapters/chapter_013.md', ch13, 'utf8');

// 2. 修复 03_chapters/chapter_015.md
let ch15 = fs.readFileSync('03_chapters/chapter_015.md', 'utf8');
ch15 = ch15.split('某昨日托了曲江池到灞桥放排的把式').join('某昨日托了蓝田县到灞桥放排的把式');
ch15 = ch15.split('在曲江池畔的一桩旧事').join('在灞河青石桥畔的一桩旧事');
ch15 = ch15.split('伸向曲江冰水的罪恶黑手').join('伸向灞河冰水的罪恶黑手');
fs.writeFileSync('03_chapters/chapter_015.md', ch15, 'utf8');

console.log('Qujiang residuals fully fixed!');
