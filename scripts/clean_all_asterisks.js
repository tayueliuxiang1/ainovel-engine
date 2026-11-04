const fs = require('fs');
const path = require('path');

function cleanAsterisks(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. 去除 Markdown 粗体 **内容**
    content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // 2. 去除 Markdown 列表开头的 * 
    content = content.replace(/^\s*\*\s+/gm, '');
    
    // 3. 去除任何孤立的 *
    content = content.replace(/\*/g, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned ${filePath}, remaining asterisks: ${(content.match(/\*/g) || []).length}`);
}

const chapters = ['001', '002', '003', '004', '005', '006'];
chapters.forEach(c => {
    const p = path.resolve(__dirname, `../03_chapters/chapter_${c}.md`);
    if (fs.existsSync(p)) cleanAsterisks(p);
});
