// 精修穿帮词汇脚本: scripts/fix_vocabulary_21_to_23.js
// 严格遵守零星号铁律，不含 ASCII 0x2A

const fs = require('fs');
const path = require('path');

const ch21Path = path.join(__dirname, '..', '03_chapters', 'chapter_021.md');
const ch23Path = path.join(__dirname, '..', '03_chapters', 'chapter_023.md');

// 修复第21章
let c21 = fs.readFileSync(ch21Path, 'utf8');

c21 = c21.replace(
    '在后世的化工实验室里，哪怕是最寻常的弱碱溶液滴定，都必须佩戴耐腐蚀的手套；而在这个大唐初年的苦寒冬夜，底层的妇人却只能用自己血肉模糊的双掌，在滚烫的灰水里与顽固的油脂拼命死磕。',
    '在严谨的格物工学规矩里，哪怕是最寻常的苛烈草木灰水淋滤，都必须谨慎护住皮肉；而在这个大唐初年的苦寒冬夜，底层的妇人却只能用自己血肉模糊的双掌，在滚烫的灰水里与顽固的油脂拼命死磕。'
);

c21 = c21.replace(
    '做去油硬皂的工科原理在苏白脑海中清晰无比：油脂与强碱共热，发生酯水解的皂化反应，生成脂肪酸盐与甘油。而在初唐缺乏纯苛性钠的条件下，最稳定、最唾手可得的碱源，正是灶膛底部的硬木草木灰。',
    '做去油硬皂的工理在苏白脑海中清晰无比：油脂遇强碱在微温滚沸间相融相克，生成去油坚膏与润滑甘液。而在初唐关中缺乏纯净白石碱的严苛境况下，最稳定、最唾手可得的碱源，正是灶膛底部的硬木草木灰。'
);

c21 = c21.replace(
    '琥珀色的草木灰碱水与浑浊的羊脂开始发生激烈的微观分子碰撞。',
    '琥珀色的草木灰浓碱水与浑浊的羊脂在微火催化下激烈交融咬合。'
);

fs.writeFileSync(ch21Path, c21, 'utf8');
console.log('第21章穿帮词汇修复完成');

// 修复第23章
let c23 = fs.readFileSync(ch23Path, 'utf8');

c23 = c23.replace(
    '备上一壶烧刀子，单等你来！',
    '备上一壶滚烫老稠酒，单等你来！'
);

fs.writeFileSync(ch23Path, c23, 'utf8');
console.log('第23章穿帮词汇修复完成');
