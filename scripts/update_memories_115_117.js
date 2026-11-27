const fs = require('fs');

// 1. 更新 chapter_summaries.md
let sumContent = fs.readFileSync('02_memories/chapter_summaries.md', 'utf8');
const sumAppend = '- 第115章《第一百一十五章 仓廪既开抚黎庶》：大同门既下，大唐军纪严明秋毫无犯；五艘千料巨舫直泊平壤南市运河码头，调运数十万斤精盐咸鱼与雪花白面，架设三十口大铁锅以精煤地炉熬煮羊脂肉粥，配发火酒羊脂膏救治冻伤百姓，万民感泣叩拜；本地老掌柜主动引路查抄渊盖苏文四座隐秘地窖，起获二十万斤生铁与三千石豆料，中和剧毒乌头水；工匠拼装完成横跨大同门内外的标准化浮动木栈桥，建立通畅水陆粮道。\n- 第116章《第一百一十六章 掘地引水锁内城》：腊月二十九日渊盖苏文带八千死士困守清流峰高耸内城要塞与安鹤宫；苏白勘察山川地脉后定下断水源与冰胀裂基之策，遣破阵营截断清流暗渠上游分水堰致内城水井尽涸；调集两千兵卒开凿导流深壕，以两艘工程船阿基米德双向旋转铜叶片提水螺旋机提拉大同江水注入西墙冲积黄土断层；极寒严冬深层冷水发生结冰相变膨胀，巨大冰胀应力冲垮三十丈巨石城垣，内城彻底失去屏障。\n- 第117章《第一百一十七章 八方风雪会平壤》：除夕大雪初霁，辽东道大总管李世绩与副总管程咬金率两万玄甲铁骑踏雪抵平壤北郭，大唐水陆两军胜利会师平壤；李世绩惊叹水师神鬼奇功；高句丽荣留王高建武在内殿发动兵变生擒莫离支渊盖苏文，出正阳门捧高句丽五百年图籍舆图与黄金国玺肉袒出降；苏白自图经中锁定沸流水大磁铁矿脉定下战后工重化基地构想；除夕夜爆竹声中，平壤全城插遍金龙战旗，大唐跨海远征辽东取得史诗级完胜大闭环。\n';
if (!sumContent.includes('第一百一十五章')) {
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
const techAppend = '40. 模块化浮动木栈桥水陆转运系统、阿基米德螺旋提水机引水与极寒土壤冻胀破山基力学体系（第115-117章大成）：\n   - 标准化公母销扣浮动木栈桥：以拆卸水闸方木预制两丈长防滑浮桥节段，以公母铁销与大同门内外石基快速拼合，支撑数万斤大型运粮板车直通城内大仓，实现战舰至陆路市肆无倒运损耗衔接。\n   - 铜皮阿基米德双向提水螺旋机：粗逾三尺圆柱木筒内嵌冷轧白铜双向螺旋叶片，由脚踏连杆齿轮驱动实现高扬程提水，连续将数万斤大同江水灌入干裂黄土断层缝隙。\n   - 极寒土壤水分相变冰胀剪切应力破城体系：利用深层注入水在零下极寒中凝固结冰体积膨胀近一成的相变物理特性，在玄武岩石基与湿陷性黄土夹层产生数万斤每平方尺冰胀剪切应力，人工诱发山体滑坡塌落三十丈巨石城垣。\n   - 辽东沸流水铁矿与沿海重工业基地规划：基于高句丽内附矿脉秘册，结合海运精煤、高炉冶铁与登州轮渡造船，奠定帝国辽东水陆钢铁重工业基石。\n';
if (!techContent.includes('模块化浮动木栈桥水陆转运系统')) {
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
const charAppendSu = '第115至117章组织平壤外郭开仓施粥救济数万寒黎，以阿基米德螺旋机提水引大同江水实施冰胀裂基轰碎内城西墙；与李世绩程咬金南北主力大军会师平壤，接受荣留王高建武献降国玺图籍，将渊盖苏文锁解槛车，确立辽东沸流水万斤高炉与重工业经略大宏图。';
if (!charContent.includes('第115至117章组织平壤外郭开仓施粥')) {
  charContent = charContent.replace('年方弱冠（二十岁）。', charAppendSu + '年方弱冠（二十岁）。');
}
const charNew = '\n- 李世绩（检校司空、辽东道行军大总管、英国公）：统帅两万玄甲重骑与神舟大车突破高句丽北部坚城，第117章冒雪抵达平壤城北，与苏白程名振水陆主力胜利会师，惊叹工科水师神鬼莫测奇功，代表大唐天子接受高句丽国主献表归降。\n- 程咬金（左领军大将军、宿国公、辽东道副总管）：随李世绩主力铁骑抵达平壤，第117章在大同门痛斥槛车内的逆贼渊盖苏文。\n- 高建武（高句丽荣留王）：第117章在平壤内城墙塌后发动兵变生擒渊盖苏文，手捧五百年疆土舆图与黄金国玺肉袒出降大唐。\n';
if (!charContent.includes('李世绩（检校司空')) {
  charContent += charNew;
}
fs.writeFileSync('02_memories/character_state.md', charContent, 'utf8');
console.log('character_state.md updated');

// 4. 更新 world_state.md
let worldContent = fs.readFileSync('02_memories/world_state.md', 'utf8');
const worldAppend = '\n- 贞观三年除夕（平壤全城平定，高句丽献表称臣纳土）：大唐辽东道陆路主力与平壤道水路主力胜利会师平壤城下，荣留王高建武生擒渊盖苏文率文武百官降唐，呈献山川图籍与黄金国玺。大唐全面接管平壤全城及辽东各郡，渤海与大同江内海化，大唐帝国从黄海走向深海、威服辽东的伟大战略完成历史性全胜大闭环。\n';
if (!worldContent.includes('平壤全城平定')) {
  worldContent += worldAppend;
}
fs.writeFileSync('02_memories/world_state.md', worldContent, 'utf8');
console.log('world_state.md updated');

// 5. 更新 plot_tracker.md
let plotContent = fs.readFileSync('02_memories/plot_tracker.md', 'utf8');
const plotCoordOld = '- 当前剧情坐标：贞观三年深冬腊月下旬（绫罗岛车城反杀夜袭敌将高突勃，双体并联飞桥巨舰重锤轰碎平壤大同门生铁门轴，万顷江水倒灌城关，战旗插上平壤城楼）。';
const plotCoordNew = '- 当前剧情坐标：贞观三年除夕（平壤外郭开仓施粥万民归附，螺旋机引水冰胀裂塌内城三十丈巨石墙，大唐水陆主力会师平壤，荣留王执渊盖苏文献国降唐，全书辽东大决战胜利终局闭环）。';
if (plotContent.includes(plotCoordOld)) {
  plotContent = plotContent.replace(plotCoordOld, plotCoordNew);
}
const plotItems = '    - 第115章仓廪既开抚黎庶：大同门既下，大唐军纪严明秋毫无犯；五艘千料巨舫直泊平壤南市运河码头，调运数十万斤精盐咸鱼与雪花白面，架设三十口大铁锅以精煤地炉熬煮羊脂肉粥，配发火酒羊脂膏救治冻伤百姓，万民感泣叩拜；本地老掌柜主动引路查抄渊盖苏文四座隐秘地窖，起获二十万斤生铁与三千石豆料，中和剧毒乌头水；工匠拼装完成横跨大同门内外的标准化浮动木栈桥，建立通畅水陆粮道。\n    - 第116章掘地引水锁内城：腊月二十九日渊盖苏文带八千死士困守清流峰高耸内城要塞与安鹤宫；苏白勘察山川地脉后定下断水源与冰胀裂基之策，遣破阵营截断清流暗渠上游分水堰致内城水井尽涸；调集两千兵卒开凿导流深壕，以两艘工程船阿基米德双向旋转铜叶片提水螺旋机提拉大同江水注入西墙冲积黄土断层；极寒严冬深层冷水发生结冰相变膨胀，巨大冰胀应力冲垮三十丈巨石城垣，内城彻底失去屏障。\n    - 第117章八方风雪会平壤：除夕大雪初霁，辽东道大总管李世绩与副总管程咬金率两万玄甲铁骑踏雪抵平壤北郭，大唐水陆两军胜利会师平壤；李世绩惊叹水师神鬼奇功；高句丽荣留王高建武在内殿发动兵变生擒莫离支渊盖苏文，出正阳门捧高句丽五百年图籍舆图与黄金国玺肉袒出降；苏白自图经中锁定沸流水大磁铁矿脉定下战后工重化基地构想；除夕夜爆竹声中，平壤全城插遍金龙战旗，大唐跨海远征辽东取得史诗级完胜大闭环。\n';
if (!plotContent.includes('第115章仓廪既开抚黎庶')) {
  const marker = '- 第114章水龙裂闸破平壤';
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
const confItems = '- 第115章《第一百一十五章 仓廪既开抚黎庶》（2410字，状态：待发布）\n- 第116章《第一百一十六章 掘地引水锁内城》（2438字，状态：待发布）\n- 第117章《第一百一十七章 八方风雪会平壤》（2455字，状态：待发布）\n';
if (!confContent.includes('第115章')) {
  if (!confContent.endsWith('\n')) confContent += '\n';
  confContent += confItems;
  fs.writeFileSync('02_memories/confirmed_chapters.md', confContent, 'utf8');
  console.log('confirmed_chapters.md updated');
}

// 7. 更新 story_graph.json
const g = JSON.parse(fs.readFileSync('02_memories/story_graph.json', 'utf8'));
g.last_updated_chapter = 117;
g.updated_at = new Date().toISOString();

// 添加节点
const charLishiji = {
  id: 'char_li_shiji',
  type: 'character',
  name: '李世绩',
  location: '平壤城大同门',
  status: 'active',
  rank: '检校司空/辽东道行军大总管/英国公',
  faction: '大唐朝廷行军主力',
  first_chapter: 117,
  last_updated: 117,
  notes: '第117章率两万玄甲重骑抵平壤北面，与苏白程名振水陆会师，受降高句丽国主，盛赞苏白工科水师立国第一奇功。'
};
const charGaoJianwu = {
  id: 'char_gaojianwu',
  type: 'character',
  name: '高建武',
  location: '平壤内城正阳门外',
  status: 'surrendered',
  rank: '高句丽荣留王/国主',
  faction: '高句丽降表阵营',
  first_chapter: 117,
  last_updated: 117,
  notes: '第117章在平壤内城墙塌后发动兵变生擒渊盖苏文，肉袒出降献五百年山川图经与黄金国玺。'
};

if (!g.nodes.find(n => n.id === 'char_li_shiji')) g.nodes.push(charLishiji);
if (!g.nodes.find(n => n.id === 'char_gaojianwu')) g.nodes.push(charGaoJianwu);

// 更新渊盖苏文节点状态为 captured
const yuanNode = g.nodes.find(n => n.id === 'char_yuangaisuwen');
if (yuanNode) {
  yuanNode.status = 'captured';
  yuanNode.last_updated = 117;
  yuanNode.notes += '；第117章在平壤内城被高建武兵变生擒，锁解铁槛车押赴长安。';
}

// 添加边
const relLishijiSubai = {
  id: 'rel_lishiji_subai',
  type: 'strategic_alliance',
  source: 'char_li_shiji',
  target: 'char_subai',
  since_chapter: 117,
  description: '第117章大唐辽东道主力与水陆行军在平壤胜利会师，共同受降高句丽，筹划战后辽东重工化大经略。'
};
const relSubaiGaojianwu = {
  id: 'rel_subai_gaojianwu',
  type: 'subjugation',
  source: 'char_subai',
  target: 'char_gaojianwu',
  since_chapter: 117,
  description: '第117章高建武向大唐受降，苏白审阅其献上的海东山川舆图并锁定辽东铁矿基石。'
};
if (!g.edges.find(e => e.id === 'rel_lishiji_subai')) g.edges.push(relLishijiSubai);
if (!g.edges.find(e => e.id === 'rel_subai_gaojianwu')) g.edges.push(relSubaiGaojianwu);

// 更新伏笔 FB-013 状态（内城围歼与平定大决战圆满完成）
const fb13 = g.nodes.find(n => n.id === 'fs_fb013_pingyang_inner_city');
if (fb13) {
  fb13.resolved = true;
  fb13.status = 'resolved';
  fb13.resolution_chapter = 117;
  fb13.last_updated = 117;
  fb13.notes += '；第115-117章开仓施粥抚定民心，阿基米德提水螺杆引江水冰胀裂塌内城巨石墙，南北主力胜利会师，渊盖苏文被擒，荣留王献玺降唐，平壤战役与全书辽东大决战圆满闭环胜利大成。';
}

fs.writeFileSync('02_memories/story_graph.json', JSON.stringify(g, null, 2), 'utf8');
console.log('story_graph.json updated');
