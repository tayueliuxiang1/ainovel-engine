const fs = require('fs');

// 1. 精修第16章
let ch16 = fs.readFileSync('03_chapters/chapter_016.md', 'utf8');

// 修正计时计量
ch16 = ch16.replace(
    '取两只半时辰的沙漏放在桌上，沙漏漏完一轮算一刻。',
    '取两只一刻的沙漏放在桌上，漏完一轮算一刻，漏满四轮算半个时辰。'
);

// 补充赵明府坐堂细节
const targetTrial = '昨日他们父子将螭虎铜兽与催工白条送入县署后，崔县尉与法曹差役已然传唤崔浩回衙对质，案子已有公道。';
const enrichedTrial = '昨日他们父子将螭虎铜兽与催工白条送入县署后，蓝田县令赵明府亲坐二堂审理，崔县尉与法曹差役已然传唤崔浩回衙严加对质，案子已有公道。';
ch16 = ch16.replace(targetTrial, enrichedTrial);

fs.writeFileSync('03_chapters/chapter_016.md', ch16, 'utf8');
console.log('Ch16 refined successfully');

// 2. 精修第17章
let ch17 = fs.readFileSync('03_chapters/chapter_017.md', 'utf8');

// 修正现银为现钱
ch17 = ch17.replace('官渠司与各庄账房眼下一时凑不齐这许多现银。', '官渠司与各庄账房眼下一时凑不齐这许多现钱。');

// 补充出具红印保修字据
const targetContract = '周管事爽快。十贯定银入库，苏家工坊明日便依契开料！';
const enrichedContract = '周管事爽快。十贯定银入库，苏家工坊明日便依契开料！\n\n苏白当场取出一张硬黄麻纸，用朱砂印泥重重盖上苏家工坊印记，出具了一份正规的“红印保修字据”，字据上白纸黑字写明每旬派工巡检两次、油膜自润滑养护与免费紧固，彻底树立起大唐民间顶尖营造的售后信誉。';
ch17 = ch17.replace(targetContract, enrichedContract);

fs.writeFileSync('03_chapters/chapter_017.md', ch17, 'utf8');
console.log('Ch17 refined successfully');

// 3. 精修第18章
let ch18 = fs.readFileSync('03_chapters/chapter_018.md', 'utf8');

// 完善机械自洽：卡箍固定与易损木柄保险销解耦
const targetClamp = '把这断了的烂连杆根部直接锯平，套上老子打的这副熟铁燕尾箍！';
const enrichedClamp = '老子这副熟铁燕尾箍，用两枚熟铁长销直接死死抱死咬合在主轴上，任凭天大激流也冲脱不得！外头这根烂连杆根部直接锯平，插进燕尾槽里！';
ch18 = ch18.replace(targetClamp, enrichedClamp);

// 补充现货储备闭环
const targetEnd = '苏家的工坊，终于在关中这片焦土之上，淬炼出了坚不可摧的真正灵魂！';
const enrichedEnd = '当夜，炭火通红。赵二叔与马老六带着几名年轻学徒彻夜未眠，依照统一规矩模具，一气呵成连夜打出了首批十套熟铁燕尾卡箍，并切削出三十根上等浸油枣木保险销作为现货储备，彻底坐实了“立等可取”的敏捷底气。\n\n苏家的工坊，终于在关中这片焦土之上，淬炼出了坚不可摧的真正灵魂！';
ch18 = ch18.replace(targetEnd, enrichedEnd);

fs.writeFileSync('03_chapters/chapter_018.md', ch18, 'utf8');
console.log('Ch18 refined successfully');
