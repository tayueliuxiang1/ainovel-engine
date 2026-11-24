const fs = require('fs');

// 1. 更新 character_state.md
let charContent = fs.readFileSync('02_memories/character_state.md', 'utf8');
const suText = '第109至111章统领八十艘大唐战舰破冰溯江逆流挺进羊角岛，以双目三棱测距规配水银水平倾角仪测定敌阵，指挥叠片弹簧钢臂三弓床弩轰塌石堡悬楼，以蓄能飞轮钨铁合金圆锯艇与水下定向爆震筒撕碎大同江双联重木浮桥，水师越过羊角岛长驱三十里，直扣平壤城大同门。';
if (!charContent.includes('第109至111章统领八十艘大唐战舰')) {
  charContent = charContent.replace('年方弱冠（二十岁）。', suText + '年方弱冠（二十岁）。');
}
if (!charContent.includes('渊净土')) {
  charContent += '\n- 渊净土（高句丽水陆副统领、渊盖苏文胞弟）：奉命统领平壤两万精锐与三千铁幢军扼守羊角岛双联重木浮桥，第109至111章遭大唐三弓床弩钨渗重箭洞穿石堡主梁崩塌，两岸重石炮阵地尽毁；浮桥被飞轮圆锯与水下定向爆震切断后落水溃败，在亲卫拼死拖拽下乘轻舟仓皇溃逃回平壤内城。\n';
}
fs.writeFileSync('02_memories/character_state.md', charContent, 'utf8');
console.log('character_state.md updated');

// 2. 更新 world_state.md
let worldContent = fs.readFileSync('02_memories/world_state.md', 'utf8');
const worldText = '\n- 贞观三年深冬腊月下旬（羊角岛天险告破，大唐水师直扣平壤城下）：高句丽大同江江防第二道枢纽羊角岛双联重木浮桥与六座悬崖石堡被大唐工科战术彻底摧毁，水陆副统领渊净土惨败溃逃平壤内城。大唐八十艘重装战舰逆流长驱二百二十里，兵临平壤城大同门外三十里，高句丽五百年国都震恐，大唐由海入江的战略突袭已转化为对平壤城的直接水陆围城态势。\n';
if (!worldContent.includes('羊角岛天险告破')) {
  worldContent += worldText;
}
fs.writeFileSync('02_memories/world_state.md', worldContent, 'utf8');
console.log('world_state.md updated');

// 3. 更新 plot_tracker.md
let plotContent = fs.readFileSync('02_memories/plot_tracker.md', 'utf8');
const plotCoordOld = '- 当前剧情坐标：贞观三年深冬腊月下旬（号角声波盲航横渡辽海，大同江口扫海重犁与破索滚剪斩断江防天险，雷火双爆轰塌悬崖水寨，大唐大军直逼平壤）。';
const plotCoordNew = '- 当前剧情坐标：贞观三年深冬腊月下旬（八十艘战舰逆流破冰挺进羊角岛，三弓叠片弹簧钢弩千步破甲轰塌两岸石堡，飞轮圆锯与水下定向爆震摧毁双联浮桥，大唐水师直扣平壤城大同门外三十里）。';
if (plotContent.includes(plotCoordOld)) {
  plotContent = plotContent.replace(plotCoordOld, plotCoordNew);
}
const item109 = '    - 第109章逆流千里锁大同：腊月二十五日大军顺江溯流而上，苏白以自适应微幅曲面明轮配合三级高碳斜齿轮箱增速，船艏包钢破冰撞角分浪破冰，八十艘巨舰日行百二十里逆流挺进；渊盖苏文震怒，遣胞弟渊净土率平壤两万精甲与铁幢军扼守羊角岛狭窄北峡，以三十六艘千料运粮巨舫搭设双联重木浮桥锁死主航道，两岸六座石堡设两百架绞盘石炮居高临下；苏白以双目三棱测距规探明水文与受力节点，定下动能破节点之策。\n';
const item110 = '    - 第110章钢弩千步洞铁甲：腊月二十六日羊角岛决战打响，两岸石堡齐射磨盘巨石；唐舰启用白槐木熟牛皮三十度人字斜面护甲，配冷拔弹簧钢圆弧减震撑杆卸去七成冲击并滑落石弹；苏白以水银水平仪校准三十七度二分射角，四十架三弓床弩换装登州叠片弹簧钢臂，以双棘轮自锁绞盘蓄力一千二百斤，齐射四棱钨渗重箭；重箭千步贯穿两层冷锻铁甲与松木大盾将敌将钉死木梁，连续轰塌悬挑石堡主柱，两岸重石炮阵地半数崩坠入江，铁幢军心大乱。\n';
const item111 = '    - 第111章浮桥断缆逼孤京：浮桥残敌泼洒猛火油拼死负隅；苏白派出两艘高转速飞轮钨铁合金圆锯尖底割缆铁艇，以每息六十转极限切削力三息切断儿臂粗青藤熟铁地缆；十二名水鬼潜入江底以青铜双层定向爆震筒炸裂玄武岩基座震脱六道锁地生铁桩；浮桥受大同江数百万斤水压冲击瞬间自中段扭曲断裂崩塌，千余重甲敌军尽坠激流；渊净土跳舟溃逃，水师破羊角岛长驱三十里，八十艘巨舰直扣平壤城大同门。\n';
const plotItems = item109 + item110 + item111;

if (!plotContent.includes('第109章逆流千里锁大同')) {
  const marker = '- 第108章雷火轰崖碎狼寨';
  const pos = plotContent.indexOf(marker);
  if (pos !== -1) {
    const endLine = plotContent.indexOf('\n---', pos);
    if (endLine !== -1) {
      plotContent = plotContent.slice(0, endLine) + '\n' + plotItems + plotContent.slice(endLine);
    } else {
      plotContent += '\n' + plotItems;
    }
  }
}
fs.writeFileSync('02_memories/plot_tracker.md', plotContent, 'utf8');
console.log('plot_tracker.md updated');

// 4. 更新 confirmed_chapters.md
let confContent = fs.readFileSync('02_memories/confirmed_chapters.md', 'utf8');
const confItems = '- 第109章《第一百零九章 逆流千里锁大同》（3758字，状态：待发布）\n- 第110章《第一百一十章 钢弩千步洞铁甲》（2667字，状态：待发布）\n- 第111章《第一百一十一章 浮桥断缆逼孤京》（2377字，状态：待发布）\n';
if (!confContent.includes('第109章')) {
  if (!confContent.endsWith('\n')) confContent += '\n';
  confContent += confItems;
  fs.writeFileSync('02_memories/confirmed_chapters.md', confContent, 'utf8');
  console.log('confirmed_chapters.md updated');
}
