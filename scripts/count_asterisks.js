const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../03_chapters');
const files = fs.readdirSync(dir).filter(f => f.startsWith('chapter_') && f.endsWith('.md')).sort();

let totalAsterisks = 0;
files.forEach(f => {
    const fullPath = path.join(dir, f);
    const text = fs.readFileSync(fullPath, 'utf8');
    const matches = text.match(/\*/g);
    const count = matches ? matches.length : 0;
    totalAsterisks += count;
    console.log(`${f}: ${count} asterisks (${text.length} chars)`);
});

console.log(`\nTotal chapters checked: ${files.length}, Total asterisks: ${totalAsterisks}`);
if (totalAsterisks > 0) {
    process.exit(1);
}
