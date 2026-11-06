const fs = require('fs');

// 1. 修订第10章
let ch10 = fs.readFileSync('03_chapters/chapter_010.md', 'utf8');
ch10 = ch10.replace('神预言。', '料事如神，分毫不差。');
ch10 = ch10.replace('这少年竟真的在百丈之外，一眼看穿了这通天神车的自激共振与断轴死劫。', '这少年竟真的隔渠相望，一眼看穿了这巨型翻车的自激共振与断轴死劫。');
ch10 = ch10.split('主轴承套').join('主轴套');
fs.writeFileSync('03_chapters/chapter_010.md', ch10, 'utf8');
console.log('Ch10 updated');

// 2. 修订第11章
let ch11 = fs.readFileSync('03_chapters/chapter_011.md', 'utf8');
ch11 = ch11.replace('“一、连续运转时间：整整半个时辰，两刻钟内一息未停。”', '“一、连续运转时间：整整半个时辰，四刻之内一息未停。”');
fs.writeFileSync('03_chapters/chapter_011.md', ch11, 'utf8');
console.log('Ch11 updated');

// 3. 修订第12章
let ch12 = fs.readFileSync('03_chapters/chapter_012.md', 'utf8');
ch12 = ch12.replace('“准奏。着官渠司即刻出具行文，拨付官钱五贯作为苏家水车转运料钱。试灌期间，由县衙指派两名巡检弓手护卫，闲杂人等若敢无理阻挠抗旱，按军法论处。”', '“照准。着官渠司即刻出具行文，拨付官钱五贯作为苏家水车转运料钱。试灌期间，由县衙指派两名干练差役护卫，闲杂人等若敢无理阻挠抗旱，按军法论处。”');

const targetHook = '崔家吃了这么大的闷亏，绝不会善罢甘休。';
const enrichedHook = '崔家吃了这么大的闷亏，绝不会善罢甘休。\n\n崔浩抄得走死板的直插板尺寸，却抄不走斜切减阻与自润滑对拼轴瓦的动态配合。画虎不成反类犬，抄得越像，死得越惨。';
ch12 = ch12.replace(targetHook, enrichedHook);

fs.writeFileSync('03_chapters/chapter_012.md', ch12, 'utf8');
console.log('Ch12 updated');
