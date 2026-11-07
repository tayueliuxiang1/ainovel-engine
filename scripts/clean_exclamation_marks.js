// 深度降噪：将全篇感叹号压制至纯正工匠生活流黄金密度（每章10-18个极高压瞬间）
// 严格遵守零星号铁律，不含 ASCII 0x2A

const fs = require('fs');
const path = require('path');

function deepCalmText(text) {
    let s = text;

    // 1. 彻底清除连击感叹号
    s = s.replace(/！+/g, '！');
    s = s.replace(/——！/g, '。');

    // 2. 将反派的无能狂怒和嘲讽从感叹号改为更有阴狠感的句号
    s = s.replace(/也想混进石咀头的试车大典？！/g, '也想混进石咀头的试车大典？');
    s = s.replace(/没有你们云阳庄苏家的大名！/g, '没有你们云阳庄苏家的大名。');
    s = s.replace(/立仗三十！/g, '立仗三十。');
    s = s.replace(/当场革除资格！！/g, '当场革除资格。');
    s = s.replace(/苏家彻底输了！！/g, '苏家彻底输了。');
    s = s.replace(/谁也过不去！/g, '谁也过不去。');
    s = s.replace(/天黑之前能挪开一条缝吧！/g, '天黑之前能挪开一条缝吧。');
    s = s.replace(/给本公子踩！狠狠地踩！/g, '给本公子踩，狠狠地踩。');
    s = s.replace(/让全蓝田的人都看看，博陵崔氏的夺天大器！/g, '让全蓝田的人都看看博陵崔氏的夺天大器。');
    s = s.replace(/满！第一桶水满！/g, '第一桶水满。');
    s = s.replace(/满！第二桶水满！/g, '第二桶水满。');
    s = s.replace(/第三桶水满！/g, '第三桶水满。');
    s = s.replace(/快拿铁棍撬啊！/g, '快拿铁棍撬。');
    s = s.replace(/休怪本官无情！/g, '休怪本官无情。');

    // 3. 将主角苏白的沉着冷静台词全面降为句号（总师气度）
    s = s.replace(/“慌什么？！”/g, '“慌什么。”');
    s = s.replace(/“图没了，规制还在我脑子里！”/g, '“图没了，规制还在我脑子里。”');
    s = s.replace(/“爹说得对，现在就走，一刻都不能耽搁！”/g, '“爹说得对，现在就走，一刻都不能耽搁。”');
    s = s.replace(/“爹，您去一趟！”/g, '“爹，您去一趟。”');
    s = s.replace(/“用旧的！”/g, '“用旧的。”');
    s = s.replace(/“这不叫毛病，这叫动能未消！”/g, '“这不叫毛病，这叫动能未消。”');
    s = s.replace(/“不必砸墙，也不用发愁！”/g, '“不必砸墙，也不用发愁。”');
    s = s.replace(/“娘，拿得下！”/g, '“娘，拿得下。”');
    s = s.replace(/“这桶水，算数吗？！”/g, '“这桶水，算数吗？”');
    s = s.replace(/“这桶水，算数吗！”/g, '“这桶水，算数吗？”');
    s = s.replace(/“不能砸！”/g, '“不能砸。”');
    s = s.replace(/“不能垫砖！”/g, '“不能垫砖。”');
    s = s.replace(/“拿‘之字形阶梯跌水消能槽’来吃！”/g, '“拿之字形阶梯跌水消能槽来吃。”');

    // 4. 将拟声词的惊乍感降为从容的陈述
    s = s.replace(/“轰隆隆！轰隆隆隆！”/g, '伴随着一阵沉闷的轰鸣。');
    s = s.replace(/“咔嚓！”/g, '咔嚓一声轻响。');
    s = s.replace(/“嘎噔！”/g, '嘎噔一声脆响。');
    s = s.replace(/“咚！”/g, '咚的一声闷响。');
    s = s.replace(/“哗啦啦啦！”/g, '水流哗啦啦作响。');
    s = s.replace(/“铮！”/g, '刀刃发出一声金石脆鸣。');

    // 5. 对正文段落中带有夸张口吻的叹号全面改为句号
    const lines = s.split('\n');
    const processedLines = lines.map(line => {
        let l = line.trim();
        if (l.startsWith('#') || l.length === 0) return line;

        // 对话中的语气平实化
        let res = line;
        res = res.replace(/啊！/g, '啊。');
        res = res.replace(/呀！/g, '呀。');
        res = res.replace(/吧！/g, '吧。');
        res = res.replace(/呢！/g, '呢。');
        res = res.replace(/了！/g, '了。');
        res = res.replace(/的！/g, '的。');
        res = res.replace(/吗！/g, '吗？');
        res = res.replace(/么！/g, '么？');

        return res;
    });

    s = processedLines.join('\n');

    // 只保留极少数真正的断轴、落水、救命等死生大喊
    return s;
}

for (let i = 1; i <= 10; i++) {
    const fn = path.join(__dirname, '..', '03_chapters', 'chapter_' + String(i).padStart(3, '0') + '.md');
    const content = fs.readFileSync(fn, 'utf8');
    const cleaned = deepCalmText(content);
    fs.writeFileSync(fn, cleaned, 'utf8');
    const newCount = (cleaned.match(/！/g) || []).length;
    console.log('Chapter ' + i + ' refined. Exclamations: ' + newCount);
}

console.log('Deep calm refinement completed.');
