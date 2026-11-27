const fs = require('fs');

// 1. 更新 chapter_summaries.md
let sumContent = fs.readFileSync('02_memories/chapter_summaries.md', 'utf8');
const sumAppend = '- 第112章《第一百一十二章 铁流压境雪漫城》：腊月二十七日漫天大雪，八十艘主力战舰在平壤城南五里绫罗岛回水湾立营；大营采用白槐木防风帆布棚与精煤地下地炉取暖，全军饮火酒涂羊脂膏无一人冻伤；平壤王宫内荣留王高建武欲遣使乞和，莫离支渊盖苏文斩杀主和派大臣篡夺全权困守平壤；苏白带梁猛赵长河冒雪乘铜皮铁艇查勘大同门水关涵闸，以双目三棱测距规与探深铜砣实测门轴应力极限，定下借江水重压冲砸门轴破关之策。\n- 第113章《第一百一十三章 铸铁飞桥扣重关》：腊月二十七日深夜高句丽骁将高突勃率五千精骑死士踏冰夜袭绫罗岛大营；程名振统领神舟大车自锁车城与折叠钢片连发弩构成坚固阵列，梁猛率八百玄甲破阵营踏阵反冲锋斩杀高突勃全歼夜袭敌军；船坞工坊内苏白指导拼装完成十二丈模块化双体伸缩铸铁飞桥，并装配三千六百斤冷铸高碳包钢破门三棱冲锤，全军整装蓄势待发。\n- 第114章《第一百一十四章 水龙裂闸破平壤》：腊月二十八日大唐舰队列阵直逼大同门，旋风抛石机齐射生石灰焦油双爆弹压制城头箭楼；双体飞桥战舰全速冲入主涵槽，四枚抓岩倒钩扣死石阶，三千六百斤包钢重锤呼啸坠击震碎生铁门轴；大同江狂暴江水顺势由外向内冲塌水闸倒灌城内，梁猛率八百破阵营踏飞桥登关斩将，金龙战旗插上平壤大同门城楼，外郭彻底告破。\n';
if (!sumContent.includes('第一百一十二章')) {
  if (sumContent.includes('## 历史归档版本')) {
    sumContent = sumContent.replace('## 历史归档版本', sumAppend + '\n## 历史归档版本');
  } else {
    sumContent += '\n' + sumAppend;
  }
  fs.writeFileSync('02_memories/chapter_summaries.md', sumContent, 'utf8');
  console.log('chapter_summaries.md updated');
}

// 2. 更新 technology_state.md
let techContent = fs.readFileSync('02_memories/technology_state.md', 'utf8');
const techAppend = '39. 战地地炉防寒营棚、神舟四轮大车自锁车城与双体飞桥水力破门冲锤体系（第112-114章大成）：\n   - 双层帆布防风营棚与精煤地炉导热技术：白槐木骨架覆双层熟桐油帆布彻底隔绝塞外寒风，冻土下掘两尺青砖烟道燃烧莱州精煤饼均匀散热，配合纯阳火酒与羊脂甘草膏实现极寒战地零冻伤。\n   - 神舟大车自锁公母榫车城与折叠钢片连发弩：八十辆大车首尾自锁公母铁榫扣合，车轮嵌高碳钢尖锥入冰两寸稳如磐石，侧板覆阻燃泥层弹飞火箭，配合折叠高碳冷拔钢片连发弩实施高密度立体压制。\n   - 模块化双体并联双轨伸缩铸铁飞桥与三千六百斤破门重锤：两艘五百料巨舰以六道熟铁桁架并联提升横向稳定性，十二丈伸缩桁架配前端四枚抓岩倒钩锁死城基石阶；三千六百斤冷铸生铁外包高碳包钢三棱冲锤借重力与水流惯性冲砸，单次动能达数万斤，瞬时震断城门生铁门轴破开水门。\n';
if (!techContent.includes('战地地炉防寒营棚')) {
  const target = '## 二、后续待开发技术储备库';
  if (techContent.includes(target)) {
    techContent = techContent.replace(target, techAppend + '\n' + target);
  } else {
    techContent += '\n' + techAppend;
  }
  fs.writeFileSync('02_memories/technology_state.md', techContent, 'utf8');
  console.log('technology_state.md updated');
}

// 3. 更新 character_state.md
let charContent = fs.readFileSync('02_memories/character_state.md', 'utf8');
const charAppendSu = '第112至114章率水师立营绫罗岛，实测大同门水门应力极限，研造双体十二丈铸铁飞桥与三千六百斤破门重锤，一举轰碎平壤大同门生铁门轴，引江水倒灌破城，战旗插上平壤外郭。';
if (!charContent.includes('第112至114章率水师立营绫罗岛')) {
  charContent = charContent.replace('年方弱冠（二十岁）。', charAppendSu + '年方弱冠（二十岁）。');
}
const charNew = '\n- 渊盖苏文（高句丽莫离支、实权摄政）：第112章在平壤王宫斩杀主和派权臣篡夺全权，下令封锁各门困守平壤；第113章遣精锐夜袭绫罗岛战败；第114章亲临大同门督战，眼见城门被冲锤与江水撕裂、唐军破阵营杀入城关，弃大同门退守平壤内城。\n- 高突勃（高句丽折冲郎将，渊盖苏文心腹，已阵亡）：第113章率五千步骑死士夜袭大唐绫罗岛大营，遭神舟大车车城与连发钢弩重创，溃乱中被梁猛掷横刀贯胸斩杀。\n';
if (!charContent.includes('高突勃')) {
  charContent += charNew;
}
fs.writeFileSync('02_memories/character_state.md', charContent, 'utf8');
console.log('character_state.md updated');

// 4. 更新 world_state.md
let worldContent = fs.readFileSync('02_memories/world_state.md', 'utf8');
const worldAppend = '\n- 贞观三年深冬腊月下旬（平壤大同门告破，大唐战旗插上高句丽王都外郭）：大唐平壤道水陆行军连破椒岛、羊角岛天险后，以三千六百斤破门冲锤与江水倒灌战术轰碎大同门主水闸，八百破阵营占领大同门城楼。高句丽外郭防线彻底瓦解，莫离支渊盖苏文与荣留王高建武退保平壤内城，大唐水陆两军对平壤形成合围之势，平壤王畿覆灭在即。\n';
if (!worldContent.includes('平壤大同门告破')) {
  worldContent += worldAppend;
}
fs.writeFileSync('02_memories/world_state.md', worldContent, 'utf8');
console.log('world_state.md updated');

// 5. 更新 plot_tracker.md
let plotContent = fs.readFileSync('02_memories/plot_tracker.md', 'utf8');
const plotCoordOld = '- 当前剧情坐标：贞观三年深冬腊月下旬（八十艘战舰逆流破冰挺进羊角岛，三弓叠片弹簧钢弩千步破甲轰塌两岸石堡，飞轮圆锯与水下定向爆震摧毁双联浮桥，大唐水师直扣平壤城大同门外三十里）。';
const plotCoordNew = '- 当前剧情坐标：贞观三年深冬腊月下旬（绫罗岛车城反杀夜袭敌将高突勃，双体并联飞桥巨舰重锤轰碎平壤大同门生铁门轴，万顷江水倒灌城关，战旗插上平壤城楼）。';
if (plotContent.includes(plotCoordOld)) {
  plotContent = plotContent.replace(plotCoordOld, plotCoordNew);
}
const plotItems = '    - 第112章铁流压境雪漫城：腊月二十七日漫天大雪，八十艘主力战舰在平壤城南五里绫罗岛回水湾立营；大营采用白槐木防风帆布棚与精煤地下地炉取暖，全军饮火酒涂羊脂膏无一人冻伤；平壤王宫内荣留王高建武欲遣使乞和，莫离支渊盖苏文斩杀主和派大臣篡夺全权困守平壤；苏白带梁猛赵长河冒雪乘铜皮铁艇查勘大同门水关涵闸，以双目三棱测距规与探深铜砣实测门轴应力极限，定下借江水重压冲砸门轴破关之策。\n    - 第113章铸铁飞桥扣重关：腊月二十七日深夜高句丽骁将高突勃率五千精骑死士踏冰夜袭绫罗岛大营；程名振统领神舟大车自锁车城与折叠钢片连发弩构成坚固阵列，梁猛率八百玄甲破阵营踏阵反冲锋斩杀高突勃全歼夜袭敌军；船坞工坊内苏白指导拼装完成十二丈模块化双体伸缩铸铁飞桥，并装配三千六百斤冷铸高碳包钢破门三棱冲锤，全军整装蓄势待发。\n    - 第114章水龙裂闸破平壤：腊月二十八日大唐舰队列阵直逼大同门，旋风抛石机齐射生石灰焦油双爆弹压制城头箭楼；双体飞桥战舰全速冲入主涵槽，四枚抓岩倒钩扣死石阶，三千六百斤包钢重锤呼啸坠击震碎生铁门轴；大同江狂暴江水顺势由外向内冲塌水闸倒灌城内，梁猛率八百破阵营踏飞桥登关斩将，金龙战旗插上平壤大同门城楼，外郭彻底告破。\n';
if (!plotContent.includes('第112章铁流压境雪漫城')) {
  const marker = '- 第111章浮桥断缆逼孤京';
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

// 6. 更新 confirmed_chapters.md
let confContent = fs.readFileSync('02_memories/confirmed_chapters.md', 'utf8');
const confItems = '- 第112章《第一百一十二章 铁流压境雪漫城》（2788字，状态：待发布）\n- 第113章《第一百一十三章 铸铁飞桥扣重关》（2793字，状态：待发布）\n- 第114章《第一百一十四章 水龙裂闸破平壤》（2363字，状态：待发布）\n';
if (!confContent.includes('第112章')) {
  if (!confContent.endsWith('\n')) confContent += '\n';
  confContent += confItems;
  fs.writeFileSync('02_memories/confirmed_chapters.md', confContent, 'utf8');
  console.log('confirmed_chapters.md updated');
}

// 7. 更新 story_graph.json
const g = JSON.parse(fs.readFileSync('02_memories/story_graph.json', 'utf8'));
g.last_updated_chapter = 114;
g.updated_at = new Date().toISOString();

// 添加节点
const locDatongmen = {
  id: 'loc_pingyang_datongmen',
  type: 'location',
  name: '平壤城大同门水关',
  location: '高句丽王都平壤南面正门',
  status: 'captured',
  first_chapter: 112,
  last_updated: 114,
  notes: '高句丽五百年王都平壤城南面水陆重关，设三道泄水涵闸，第114章被苏白指挥双体铸铁飞桥与三千六百斤包钢重锤轰碎生铁门轴彻底攻克。'
};
const charGaotubo = {
  id: 'char_gaotubo',
  type: 'character',
  name: '高突勃',
  location: '绫罗岛大营外石滩',
  status: 'killed',
  rank: '高句丽折冲郎将/渊盖苏文心腹',
  faction: '高句丽莫离支政权',
  first_chapter: 113,
  last_updated: 113,
  notes: '第113章率五千精骑死士雪夜偷袭绫罗岛大营，遭神舟大车自锁车城与连发钢弩重创，被梁猛一刀贯胸斩杀。'
};
const charYuanGai = {
  id: 'char_yuangaisuwen',
  type: 'character',
  name: '渊盖苏文',
  location: '平壤内城',
  status: 'active',
  rank: '高句丽大莫离支/实权摄政',
  faction: '高句丽莫离支政权',
  first_chapter: 112,
  last_updated: 114,
  notes: '第112章斩杀主和派大臣篡夺军政大权；第114章在大同门督战被大唐重锤与江水倒灌破城，弃外郭退守内城。'
};

if (!g.nodes.find(n => n.id === 'loc_pingyang_datongmen')) g.nodes.push(locDatongmen);
if (!g.nodes.find(n => n.id === 'char_gaotubo')) g.nodes.push(charGaotubo);
if (!g.nodes.find(n => n.id === 'char_yuangaisuwen')) g.nodes.push(charYuanGai);

// 添加边
const relSubaiDatong = {
  id: 'rel_subai_datongmen',
  type: 'military_siege',
  source: 'char_subai',
  target: 'loc_pingyang_datongmen',
  since_chapter: 112,
  description: '第112-114章苏白实测大同门应力极限，研造双体伸缩铸铁飞桥与重型包钢冲锤攻破水门。'
};
const relLiangGaotubo = {
  id: 'rel_liangmeng_gaotubo',
  type: 'elimination',
  source: 'char_liangmeng',
  target: 'char_gaotubo',
  since_chapter: 113,
  description: '第113章梁猛率八百玄甲破阵营反击夜袭，斩杀敌将高突勃。'
};
if (!g.edges.find(e => e.id === 'rel_subai_datongmen')) g.edges.push(relSubaiDatong);
if (!g.edges.find(e => e.id === 'rel_liangmeng_gaotubo')) g.edges.push(relLiangGaotubo);

// 更新伏笔 FB-012 状态（大同门水门已被攻克闭环）
const fb12 = g.nodes.find(n => n.id === 'fs_fb012_pingyang_siege');
if (fb12) {
  fb12.resolved = true;
  fb12.status = 'resolved';
  fb12.resolution_chapter = 114;
  fb12.last_updated = 114;
  fb12.notes += '；第112-114章实测水门门轴应力，以双体伸缩飞桥与三千六百斤包钢重锤轰碎主门轴，引江水倒灌，破阵营攻克平壤城大同门，插上大唐战旗，大同门攻坚决战圆满闭环。';
}

// 植入新伏笔 FB-013 平壤内城围歼与高句丽平定大决战（target_chapter: 120）
const fb13 = {
  id: 'fs_fb013_pingyang_inner_city',
  type: 'foreshadow',
  name: 'FB-013 平壤内城围歼与高句丽平定大决战',
  planted_chapter: 114,
  target_chapter: 120,
  resolved: false,
  status: 'in_progress',
  description: '平壤外郭与大同门告破，渊盖苏文退守平壤内城王宫。苏白以大同门水路引运粮战舰直抵内城码头，协同李世绩辽东道主力对平壤内城发起最终攻坚与政权归降。',
  last_updated: 114,
  notes: '第114章大同门水路打通，大唐水陆两军会师决战拉开帷幕。'
};
if (!g.nodes.find(n => n.id === 'fs_fb013_pingyang_inner_city')) g.nodes.push(fb13);

fs.writeFileSync('02_memories/story_graph.json', JSON.stringify(g, null, 2), 'utf8');
console.log('story_graph.json updated');
