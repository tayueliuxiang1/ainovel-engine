// scripts/refine_new_vol1_101112.js
const fs = require('fs');

function refineCh10() {
  let content = fs.readFileSync('03_chapters/chapter_010.md', 'utf8');

  // 1. 消除“主轴承套”
  content = content.replace('主轴承套，在剧烈的交变剪切应力', '主轴套，在剧烈的交变剪切应力');

  // 2. 去除连续感叹号
  content = content.replace(/！！+/g, '！');
  content = content.replace(/？！+/g, '？');
  content = content.replace(/！？+/g, '！');

  // 3. 补充制度官署词汇（工部、县令、折冲府）
  content = content.replace(
    '周围所有的士绅、大粮商以及蓝田县令明府相公',
    '折冲府老兵、工部随员，以及蓝田县令明府相公'
  );

  // 4. 感叹号转句号，只保留最关键的几个
  content = content.replace(/！/g, function(match, offset, str) {
    const before = str.substring(Math.max(0, offset - 12), offset);
    if (before.includes('停了') || before.includes('住手') || before.includes('上水') || before.includes('全洒在岸上')) {
      return '！';
    }
    return '。';
  });

  content = content.trim();
  if (!content.endsWith('！') && !content.endsWith('！”')) {
    content = content + '！\n';
  } else {
    content = content + '\n';
  }

  fs.writeFileSync('03_chapters/chapter_010.md', content, 'utf8');
  console.log('Ch10 refined');
}

function refineCh11() {
  let content = fs.readFileSync('03_chapters/chapter_011.md', 'utf8');

  // 1. 消除“县令大人”
  content = content.replace('伴随着县令大人的掌声', '伴随着县令明府相公的掌声');
  content = content.replace(/大人/g, '相公');

  // 2. 去除连续感叹号
  content = content.replace(/！！+/g, '！');
  content = content.replace(/？！+/g, '？');
  content = content.replace(/！？+/g, '！');

  // 3. 感叹号转句号，只保留最关键的几个
  content = content.replace(/！/g, function(match, offset, str) {
    const before = str.substring(Math.max(0, offset - 12), offset);
    if (before.includes('水进沟了') || before.includes('正位') || before.includes('报数') || before.includes('大家都有份')) {
      return '！';
    }
    return '。';
  });

  content = content.trim();
  if (!content.endsWith('！') && !content.endsWith('！”')) {
    content = content + '！\n';
  } else {
    content = content + '\n';
  }

  fs.writeFileSync('03_chapters/chapter_011.md', content, 'utf8');
  console.log('Ch11 refined');
}

function refineCh12() {
  let content = fs.readFileSync('03_chapters/chapter_012.md', 'utf8');

  // 1. 标题去掉逗号
  content = content.replace('# 第十二章 工坊归工坊，欠账归欠账', '# 第十二章 工坊归工坊欠账归欠账');

  // 2. 去除连续感叹号
  content = content.replace(/！！+/g, '！');
  content = content.replace(/？！+/g, '？');
  content = content.replace(/！？+/g, '！');

  // 3. 增加通感词汇（温润、油膜、咬合、蜂鸣、激流、震颤）
  content = content.replace(
    '那根百炼老军轴更是被苏白郑重写进了工坊核心资产，成了人人敬仰的镇坊之宝；',
    '百炼熟铁大轴安放在堂屋，枣木轴瓦上残存的熟猪油泛着温润油膜，齿榫咬合痕迹清晰，见证了顶住激流震颤的辉煌战绩；'
  );

  // 4. 感叹号转句号
  content = content.replace(/！/g, function(match, offset, str) {
    const before = str.substring(Math.max(0, offset - 12), offset);
    if (before.includes('当堂开枷') || before.includes('欠账归欠账') || before.includes('喝酒') || before.includes('就是偷来的')) {
      return '！';
    }
    return '。';
  });

  content = content.trim();
  if (!content.endsWith('！') && !content.endsWith('！”')) {
    content = content + '！\n';
  } else {
    content = content + '\n';
  }

  fs.writeFileSync('03_chapters/chapter_012.md', content, 'utf8');
  console.log('Ch12 refined');
}

refineCh10();
refineCh11();
refineCh12();
