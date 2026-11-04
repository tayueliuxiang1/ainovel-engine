// scripts/verify_chapter.js
// 番茄官方质感与规则自动化终审脚本
// 严格遵守全书铁律：零星号、杜绝文青、硬伤排查、减法自检

const fs = require('fs');
const path = require('path');

function verifyChapter(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('【错误】文件不存在：' + filePath);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let errors = [];
  let warnings = [];

  // 1. 绝对零星号铁律检查 (使用十六进制字符码 0x2A 彻底避免直接出现星号字符)
  const asteriskChar = String.fromCharCode(42);
  if (content.indexOf(asteriskChar) !== -1) {
    errors.push('【铁律暴雷】文本中存在星号字符 (0x2A)，违反绝对零星号铁律！');
  }

  // 2. 标题规范检查 (严禁八股二段对仗标题，如：xxxx，xxxx)
  const titleLine = lines[0] || '';
  if (titleLine.indexOf('，') !== -1) {
    const parts = titleLine.replace(/^#\s*/, '').split(' ')[1] || '';
    if (parts.indexOf('，') !== -1) {
      errors.push('【标题八股病】标题使用了二段式对仗（' + parts + '）！网文严禁四字对四字，必须单核直白、一句话或单个核心动作！');
    }
  }

  // 3. 历史称谓硬伤检查 (贞观元年严禁称李世民为天可汗)
  if (content.indexOf('天可汗') !== -1) {
    errors.push('【历史硬伤】文中出现了“天可汗”！贞观四年灭颉利后方有此尊号，当前时间线严禁使用！');
  }
  if (content.indexOf('机油') !== -1 || content.indexOf('轴承') !== -1) {
    errors.push('【科技越界】文中出现了现代工业名词（机油/轴承）！必须使用釭、轴瓦、猪膏润脂！');
  }

  // 4. 标点符号规范检查 (严禁连续感叹号与咆哮体)
  if (content.indexOf('！！') !== -1 || content.indexOf('？！') !== -1 || content.indexOf('！？') !== -1) {
    errors.push('【标点暴雷】文中存在连续感叹号（！！或？！），严禁使用咆哮体标点！');
  }
  const exclamationCount = content.split('！').length - 1;
  if (exclamationCount > 10) {
    warnings.push('【感叹号超标】全文感叹号高达 ' + exclamationCount + ' 个！严重缺乏克制感，建议改为沉稳句号，控制在10个以内！');
  }

  // 5. 文青病与自嗨注水词汇黑名单
  const literaryBlacklist = [
    '小灯笼',
    '雀儿',
    '松柏苦香',
    '熨平',
    '熨帖',
    '漂泊浮沉',
    '大青瓷盆',
    '火鏊子',
    '红根菘菜',
    '苍黄沃野'
  ];
  literaryBlacklist.forEach(function(word) {
    if (content.indexOf(word) !== -1) {
      errors.push('【文青病毒素】文中出现了禁用的文青散文词或舌尖体词汇：' + word);
    }
  });

  // 4. 文字做减法检查：高频冗余副词检测
  const adverbBlacklist = ['极其', '非常', '不由自主', '毫无疑问', '情不自禁'];
  adverbBlacklist.forEach(function(adv) {
    const count = content.split(adv).length - 1;
    if (count > 2) {
      warnings.push('【减法警告】冗余副词“' + adv + '”出现了 ' + count + ' 次，建议删减做减法！');
    }
  });

  // 5. 段落排版与手机端心流检查 (每段不宜过长)
  lines.forEach(function(line, idx) {
    const trimmed = line.trim();
    if (trimmed.length > 200) {
      warnings.push('【排版警告】第 ' + (idx + 1) + ' 行长度达 ' + trimmed.length + ' 字，超出手机端极简留白标准！');
    }
  });

  // 6. 章末强钩子检查 (最后 3 个有效非空行必须有张力)
  const nonEmptyLines = lines.map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
  if (nonEmptyLines.length > 0) {
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1];
    const hookPunctuation = ['！', '？', '……', '——', '！"', '！”', '？”', '……”'];
    let hasHookEnding = false;
    hookPunctuation.forEach(function(p) {
      if (lastLine.endsWith(p)) {
        hasHookEnding = true;
      }
    });
    if (!hasHookEnding) {
      warnings.push('【钩子警告】章末最后一句未以强张力标点（！/？/……/——）结尾，检查断章悬念强度！');
    }
  }

  // 输出审读报告
  console.log('====================================================');
  console.log('【番茄官方工业化品控审查报告】: ' + path.basename(filePath));
  console.log('总字数：' + content.length + ' 字符 | 总行数：' + lines.length);
  console.log('====================================================');

  if (errors.length > 0) {
    console.log('❌ 致命错误 (' + errors.length + ' 项)：');
    errors.forEach(function(e) { console.log('  ' + e); });
  } else {
    console.log('✅ 致命错误：0 项通过！');
  }

  if (warnings.length > 0) {
    console.log('⚠️ 优化预警 (' + warnings.length + ' 项)：');
    warnings.forEach(function(w) { console.log('  ' + w); });
  } else {
    console.log('✅ 优化预警：0 项通过！');
  }
  console.log('====================================================');

  if (errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

const targetFile = process.argv[2] || path.join(__dirname, '../03_chapters/chapter_003.md');
verifyChapter(path.resolve(targetFile));
