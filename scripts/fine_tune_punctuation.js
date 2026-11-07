// 精准标点打磨：将全篇多余的感叹号彻底改为沉着有力的逗号、句号
// 严格遵守零星号铁律，不含 ASCII 0x2A

const fs = require('fs');
const path = require('path');

function fineTuneText(text) {
    let s = text;

    // 清洗常见句中或对话中的感叹号
    s = s.replace(/！/g, function(match, offset, string) {
        // 检查前面和后面的文字
        const prevChar = offset > 0 ? string[offset - 1] : '';
        const nextChar = offset < string.length - 1 ? string[offset + 1] : '';

        // 仅在极其罕见的特定词汇后保留感叹号（如“快跑！”、“把人撤开！”）
        const sub = string.slice(Math.max(0, offset - 6), offset);
        if (sub.includes('快跑') || sub.includes('把人撤开') || sub.includes('轰隆') || sub.includes('停下')) {
            return '！';
        }

        // 引号前的感叹号，绝大部分改为句号或逗号
        if (nextChar === '”' || nextChar === '’') {
            if (sub.includes('算数吗') || sub.includes('担得起吗') || sub.includes('配叫水车') || sub.includes('怎么可能')) {
                return '？';
            }
            return '。';
        }

        // 句中的感叹号，改为逗号或顿号
        return '，';
    });

    // 修复可能出现的“？。”或“。。”
    s = s.replace(/？。/g, '？');
    s = s.replace(/！。/g, '！');
    s = s.replace(/，。/g, '。');
    s = s.replace(/，，/g, '，');
    s = s.replace(/、，/g, '、');
    s = s.replace(/？，/g, '？');

    return s;
}

for (let i = 1; i <= 10; i++) {
    const fn = path.join(__dirname, '..', '03_chapters', 'chapter_' + String(i).padStart(3, '0') + '.md');
    let content = fs.readFileSync(fn, 'utf8');
    content = fineTuneText(content);
    fs.writeFileSync(fn, content, 'utf8');
    const count = (content.match(/！/g) || []).length;
    console.log('Chapter ' + i + ' final exclamation count: ' + count);
}

console.log('Fine-tuning done.');
