// scripts/multi_agent_review.js
// 基于番茄官方十九讲的多智能体独立审阅与全维品控调度引擎
// 严格执行四大智能体一票否决权与全量自动化规则扫描

const fs = require('fs');
const path = require('path');

function reviewChapterMultiAgent(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('【错误】章节文件不存在：' + filePath);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  // 汉字字符统计（去除空格、换行、标点）
  const chineseChars = content.match(/[\u4e00-\u9fa5]/g) || [];
  const charCount = chineseChars.length;

  let report = {
    file: fileName,
    charCount: charCount,
    timestamp: new Date().toISOString(),
    architect: { name: '首席架构师兼资深主编', score: 100, pass: true, issues: [] },
    engineer: { name: '机械与水利工程总师', score: 100, pass: true, issues: [] },
    historian: { name: '大唐文史与律法考据官', score: 100, pass: true, issues: [] },
    toxicCritic: { name: '骨灰级毒舌试毒官', score: 100, pass: true, issues: [] },
    overallPass: true
  };

  // ----------------------------------------------------
  // 1. 骨灰级毒舌试毒官 (Toxic Critic) 自动化核验
  // ----------------------------------------------------
  // 1.1 绝对零星号检测 (使用 String.fromCharCode(42))
  const asteriskChar = String.fromCharCode(42);
  if (content.indexOf(asteriskChar) !== -1) {
    report.toxicCritic.score -= 50;
    report.toxicCritic.pass = false;
    report.toxicCritic.issues.push('【致命死刑】文中存在星号字符(0x2A)，触碰绝对零星号红线！');
  }

  // 1.2 咆哮体与连续感叹号
  if (content.indexOf('！！') !== -1 || content.indexOf('？！') !== -1 || content.indexOf('！？') !== -1) {
    report.toxicCritic.score -= 20;
    report.toxicCritic.pass = false;
    report.toxicCritic.issues.push('【标点暴雷】存在连续感叹号（！！或？！），破坏网文沉稳质感！');
  }

  // 1.3 感叹号总量压制 (超过10个扣分)
  const exclamationMatches = content.match(/！/g) || [];
  if (exclamationMatches.length > 10) {
    report.toxicCritic.score -= 15;
    report.toxicCritic.issues.push('【标点超标】全章感叹号高达 ' + exclamationMatches.length + ' 个，需压制在10个以内！');
  }

  // 1.4 文青病与舌尖体黑名单
  const literaryBlacklist = [
    '小灯笼', '雀儿', '松柏苦香', '熨平', '熨帖', '漂泊浮沉',
    '大青瓷盆', '火鏊子', '红根菘菜', '苍黄沃野'
  ];
  literaryBlacklist.forEach(function(w) {
    if (content.indexOf(w) !== -1) {
      report.toxicCritic.score -= 25;
      report.toxicCritic.pass = false;
      report.toxicCritic.issues.push('【文青病毒点】出现禁用的文青散文词或自嗨词汇：' + w);
    }
  });

  // 1.5 玄幻修仙旧套路与AI陈词滥调
  const cliches = ['恐怖如斯', '倒吸一口凉气', '嘴角泛起一抹冷笑', '桀桀怪笑', '此子断不可留'];
  cliches.forEach(function(c) {
    if (content.indexOf(c) !== -1) {
      report.toxicCritic.score -= 20;
      report.toxicCritic.pass = false;
      report.toxicCritic.issues.push('【AI陈词滥调】出现玄幻老旧陈腐词汇：' + c);
    }
  });

  // ----------------------------------------------------
  // 2. 首席架构师兼资深主编 (Chief Architect) 自动化核验
  // ----------------------------------------------------
  // 2.1 篇幅饱和度 (番茄标准2000-2500字)
  if (charCount < 2000) {
    report.architect.score -= 30;
    report.architect.pass = false;
    report.architect.issues.push('【字数不足】纯正文汉字量仅 ' + charCount + ' 字，低于番茄单章2000字基准线！');
  } else if (charCount > 3500) {
    report.architect.score -= 10;
    report.architect.issues.push('【字数偏长】纯正文达 ' + charCount + ' 字，建议适度紧凑以维持手机端滑屏心流。');
  }

  // 2.2 标题规范 (严禁对仗二段式，严禁公文词)
  const titleLine = lines[0] || '';
  if (titleLine.indexOf('，') !== -1) {
    const rawTitle = titleLine.replace(/^#\s*/, '').trim();
    if (rawTitle.indexOf('，') !== -1) {
      report.architect.score -= 25;
      report.architect.pass = false;
      report.architect.issues.push('【八股标题】标题使用了二段式对仗（' + rawTitle + '），番茄必须单核动作直白标题！');
    }
  }
  const bureaucraticWords = ['依据', '调研', '汇报', '规划', '研究', '报告', '决议'];
  bureaucraticWords.forEach(function(bw) {
    if (titleLine.indexOf(bw) !== -1) {
      report.architect.score -= 20;
      report.architect.issues.push('【行政标题】标题包含行政公文词汇：' + bw);
    }
  });

  // 2.3 章末强留存钩子 (最后有效非空行必须有张力结尾)
  const nonEmptyLines = lines.map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  if (nonEmptyLines.length > 0) {
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1];
    const hookMarks = ['！', '？', '……', '——', '！"', '！”', '？”', '……”'];
    let hasHook = false;
    hookMarks.forEach(function(m) {
      if (lastLine.endsWith(m)) { hasHook = true; }
    });
    if (!hasHook) {
      report.architect.score -= 15;
      report.architect.issues.push('【章末钩子疲软】章末最后一句未以强张力标点（！/？/……/——）收尾，追更留存不足！');
    }
  }

  // ----------------------------------------------------
  // 3. 机械与水利工程总师 (Chief Engineer) 自动化核验
  // ----------------------------------------------------
  // 3.1 营造工科尺寸核验 (必须含有确切的尺寸与工艺参数)
  const engineeringUnits = ['丈', '尺', '寸', '斤', '两', '度', '厘'];
  let unitFound = 0;
  engineeringUnits.forEach(function(u) {
    if (content.indexOf(u) !== -1) { unitFound++; }
  });
  if (unitFound < 2) {
    report.engineer.score -= 20;
    report.engineer.issues.push('【工科质感缺失】文中缺乏确凿营造度量参数（丈/尺/寸/斤），质感偏虚！');
  }

  // 3.2 越界现代工业违禁词 (硬核降维但严禁跨时代魔幻)
  const modernTechBlacklist = ['轴承', '机油', '塑料', '电焊', '齿轮箱', '电机', '芯片', '橡胶圈'];
  modernTechBlacklist.forEach(function(mw) {
    if (content.indexOf(mw) !== -1) {
      report.engineer.score -= 30;
      report.engineer.pass = false;
      report.engineer.issues.push('【科技越界】出现跨时代现代工业词汇：' + mw + '，必须用唐代釭、轴瓦、猪膏润脂！');
    }
  });

  // 3.3 五官通感与物理工法词汇核验
  const sensoryKeywords = ['温润', '清凉', '油膜', '咬合', '蜂鸣', '喷涌', '激流', '焦糊', '震颤'];
  let sensoryCount = 0;
  sensoryKeywords.forEach(function(sk) {
    if (content.indexOf(sk) !== -1) { sensoryCount++; }
  });
  if (sensoryCount < 2) {
    report.engineer.score -= 15;
    report.engineer.issues.push('【质感五步法偏弱】机械运转通感词汇（油膜/咬合/震颤/蜂鸣等）覆盖较少！');
  }

  // ----------------------------------------------------
  // 4. 大唐文史与律法考据官 (Historian & Legal) 自动化核验
  // ----------------------------------------------------
  // 4.1 贞观初年时代红线禁忌
  if (content.indexOf('天可汗') !== -1) {
    report.historian.score -= 40;
    report.historian.pass = false;
    report.historian.issues.push('【时代严重违规】文中出现“天可汗”，贞观元年严禁使用，为四年后尊号！');
  }
  if (content.indexOf('皇上') !== -1) {
    report.historian.score -= 30;
    report.historian.pass = false;
    report.historian.issues.push('【称谓清宫化】文中出现“皇上”，唐代当面称“大家”或“至尊”，严禁皇上！');
  }
  const qingDynastyWords = ['奴才', '喳', '大人'];
  qingDynastyWords.forEach(function(qw) {
    if (content.indexOf(qw) !== -1) {
      report.historian.score -= 20;
      report.historian.pass = false;
      report.historian.issues.push('【官场称谓穿帮】文中出现明清戏剧词汇：' + qw + '！');
    }
  });

  // 4.2 历史制度名词核验
  const officialWords = ['都尉', '县令', '天策', '折冲府', '将作', '工部', '司农', '鱼符', '敕令', '圣人', '大家'];
  let officialFound = 0;
  officialWords.forEach(function(ow) {
    if (content.indexOf(ow) !== -1) { officialFound++; }
  });
  if (officialFound < 2) {
    report.historian.score -= 15;
    report.historian.issues.push('【制度考据薄弱】唐代官署与制度词汇密度偏低，历史厚度不足！');
  }

  // ----------------------------------------------------
  // 综合判定
  // ----------------------------------------------------
  if (
    !report.architect.pass || report.architect.score < 90 ||
    !report.engineer.pass || report.engineer.score < 90 ||
    !report.historian.pass || report.historian.score < 90 ||
    !report.toxicCritic.pass || report.toxicCritic.score < 90
  ) {
    report.overallPass = false;
  }

  // 打印结构化会审报告
  console.log('================================================================');
  console.log('【番茄官方十九讲·多智能体专职独立审阅裁决书】');
  console.log('章节目标：' + fileName + ' | 纯汉字量：' + charCount + ' 字');
  console.log('----------------------------------------------------------------');

  const agents = [report.architect, report.engineer, report.historian, report.toxicCritic];
  agents.forEach(function(ag) {
    const statusIcon = (ag.pass && ag.score >= 90) ? '✅ [通过]' : '❌ [否决]';
    console.log(statusIcon + ' ' + ag.name + ' | 评分：' + ag.score + ' 分');
    if (ag.issues.length > 0) {
      ag.issues.forEach(function(issue) {
        console.log('   - ' + issue);
      });
    } else {
      console.log('   - 本项核验全部达标，准予放行！');
    }
  });

  console.log('----------------------------------------------------------------');
  if (report.overallPass) {
    console.log('🏆【会审终审判定】：四大智能体全票通过！准予签发上线与入库！');
    console.log('================================================================');
    return report;
  } else {
    console.log('🚫【会审终审判定】：存在智能体一票否决或评分低于90分，打回重构！');
    console.log('================================================================');
    process.exit(1);
  }
}

const targetPath = process.argv[2] || path.join(__dirname, '../03_chapters/chapter_005.md');
reviewChapterMultiAgent(path.resolve(targetPath));
