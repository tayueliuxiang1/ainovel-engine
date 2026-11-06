const fs = require('fs');

// 1. 精修第13章
let ch13 = fs.readFileSync('03_chapters/chapter_013.md', 'utf8');

// 修正现代力学术语
ch13 = ch13.replace(
    '其抗弯截面模量瞬间暴跌三成以上！',
    '其受力吃劲之承重筋骨瞬间削弱三成以上！'
);

// 增加书吏白纸透光拓印核验的仪式感细节
const targetVerif = '周主簿猛地从官案后站起身，快步走下堂阶，取过书吏递来的放大水晶透镜，凑到两张图纸前仔细比对。';
const enrichedVerif = '周主簿猛地从官案后站起身，快步走下堂阶，取过书吏递来的放大水晶透镜，凑到两张图纸前仔细比对。\n\n司功曹书吏更是取来两张半透明的薄白麻纸，分别覆于两图之上对光拓印重合，两处墨迹死孔分毫不差地严密重合！';
ch13 = ch13.replace(targetVerif, enrichedVerif);

fs.writeFileSync('03_chapters/chapter_013.md', ch13, 'utf8');
console.log('Ch13 refined successfully');

// 2. 精修第14章
let ch14 = fs.readFileSync('03_chapters/chapter_014.md', 'utf8');

// 修正案发地点：曲江池 -> 灞河青石桥
ch14 = ch14.split('腊月初一傍晚，苏白在曲江池畔遇险落水，图纸被夺；').join('腊月初一傍晚，苏白在灞河青石桥边遇险落水，图纸被夺；');
ch14 = ch14.split('曲江池畔，究竟是谁，推了原主下水？').join('灞河青石桥边，究竟是谁，推了原主下水？');

// 增加苏成海心算工钱的经营细节
const targetWage = '工食银子按官渠司行规，管一日两顿饱饭，外加每人每日三十文现钱，由某与老赵按日现结，绝不拖欠一个大子儿！';
const enrichedWage = '工食银子按官渠司行规，管一日两顿饱饭，外加每人每日三十文现钱，由某与老赵按日现结，绝不拖欠一个大子儿！\n\n身旁的苏成海暗中掐指一算，八名木匠十日工钱不过二十四贯，官渠司下拨的料钱与后续长安粮行的定银完全足以支应，儿子这步棋既买到了人心，又解了南原修槽的燃眉之急。';
ch14 = ch14.replace(targetWage, enrichedWage);

fs.writeFileSync('03_chapters/chapter_014.md', ch14, 'utf8');
console.log('Ch14 refined successfully');

// 3. 精修第15章
let ch15 = fs.readFileSync('03_chapters/chapter_015.md', 'utf8');

// 修正案发地点与水运路线：曲江池 -> 灞河青石桥
ch15 = ch15.split('顺着官河的水运簿册逐一排查。腊月初一那天傍晚，在曲江池东南角荒草滩附近接客摆渡的，数来数去，就只有老刘头这一条船。').join('顺着官河的水运簿册逐一排查。腊月初一那天傍晚，在灞河青石桥下游背风芦苇荡附近接客摆渡的，数来数去，就只有老刘头这一条船。');

ch15 = ch15.split('腊月初一那天傍晚，曲江池东南角的荒草滩上，有个十四五岁的半大小子落了水').join('腊月初一那天傍晚，灞河青石桥边的荒草滩上，有个十四五岁的半大小子落了水');

ch15 = ch15.split('小老儿原本正把船泊在曲江池东南角背风的柳树桩后头补网。').join('小老儿原本正把船泊在灞河青石桥下游背风的柳树桩后头补网。');

ch15 = ch15.split('顺着水渠一路划往西市便桥！').join('顺着灞河急流一路划往灞上大驿码头！');

// 增加物证三联包油绢包裹的闭环细节
const targetBundle = '三块拼图，尽数归位！';
const enrichedBundle = '苏白取出一方细密厚实的熟桐油绢，将这枚螭虎铜兽与此前画押的《试车见证文状》、盖印的《催工限期白条》一层层严密裹好，贴身收于胸口。\n\n三件铁证，尽数归位！';
ch15 = ch15.replace(targetBundle, enrichedBundle);

fs.writeFileSync('03_chapters/chapter_015.md', ch15, 'utf8');
console.log('Ch15 refined successfully');
