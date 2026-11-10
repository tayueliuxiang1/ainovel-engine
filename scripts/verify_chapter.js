// scripts/verify_chapter.js
// 番茄官方质感与工业化品控自动化终审脚本（融合去AI味7大类检测、P0草稿隔离、去重率、图谱冲突校验与mtime门禁凭据）
// 严格遵守全书铁律：零星号（不含 ASCII 0x2A）、杜绝文青、硬伤排查、去AI味、文风指纹监控

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GATE_DIR = path.resolve(__dirname, '..', 'assets', 'gates');
const STORY_GRAPH_PATH = path.resolve(__dirname, '..', '02_memories', 'story_graph.json');

// ---------------------------------------------------------------------------
// 7大类去 AI 味词库（针对初唐工科网文语境精准适配）
// ---------------------------------------------------------------------------
const AI_VOCAB_RULES = [
  { phrase: '只见', reason: '高频场景过渡套话，建议直接以物象或动作切入' },
  { phrase: '但见', reason: '高频场景过渡套话' },
  { phrase: '仿佛', reason: '高频比喻套话，建议改用直接体感或具体白描' },
  { phrase: '宛如', reason: '过度比喻词' },
  { phrase: '宛若', reason: '过度比喻词' },
  { phrase: '恍若', reason: '过度比喻词' },
  { phrase: '仿若', reason: '过度比喻词' },
  { phrase: '好似', reason: '高频比喻词（若非方言口语，叙述中尽量少用）' },
  { phrase: '映入眼帘', reason: '陈词滥调视觉过渡' },
  { phrase: '涌入眼帘', reason: '陈词滥调视觉过渡' },
  { phrase: '跃入眼帘', reason: '陈词滥调视觉过渡' },
  { phrase: '此时此刻', reason: '时间强调膨胀' },
  { phrase: '就在此时', reason: '时间强调膨胀' },
  { phrase: '恰在此时', reason: '时间强调膨胀' },
  { phrase: '在这一刻', reason: '时间强调膨胀' },
  { phrase: '心中暗道', reason: '内心独白套话' },
  { phrase: '心中暗想', reason: '内心独白套话' },
  { phrase: '暗自思忖', reason: '内心独白套话' },
  { phrase: '心中一动', reason: '内心独白套话' },
  { phrase: '心中一凛', reason: '内心独白套话' },
  { phrase: '心念一动', reason: '内心独白套话' },
  { phrase: '沉声道', reason: '对话标签套话，宜用具体动作替代' },
  { phrase: '淡淡地说', reason: '对话标签套话' },
  { phrase: '淡然道', reason: '对话标签套话' },
  { phrase: '漠然道', reason: '对话标签套话' },
  { phrase: '脸色一变', reason: '反应套话' },
  { phrase: '神情一凛', reason: '反应套话' },
  { phrase: '眉头微皱', reason: '反应套话' },
  { phrase: '身形一顿', reason: '动作套话' },
  { phrase: '脚步一顿', reason: '动作套话' },
  { phrase: '身子微微一颤', reason: '动作套话' },
  { phrase: '目光如炬', reason: '眼睛描写套话' },
  { phrase: '目光深邃', reason: '眼睛描写套话' },
  { phrase: '嘴角微扬', reason: '微笑描写套话（AI特征极强）' },
  { phrase: '勾起一抹弧度', reason: '微笑描写套话（AI特征极强）' },
  { phrase: '嘴角勾起', reason: '微笑描写套话' },
  { phrase: '感慨良多', reason: '情感套话' },
  { phrase: '百感交集', reason: '情感套话' },
  { phrase: '不禁感叹', reason: '情感套话' },
  { phrase: '不由得', reason: '主体性剥夺词' },
  { phrase: '不禁', reason: '情感反应套话' }
];

const WEAK_ADVERBS = [
  '微微', '淡淡', '缓缓', '轻轻', '悄悄', '悄然',
  '深深', '静静', '慢慢', '默默', '暗暗', '隐隐',
  '渐渐', '徐徐'
];

const SIGNIFICANCE_PHRASES = [
  '意义深远', '影响深远', '意义非凡', '令人叹为观止', '叹为观止',
  '前所未有', '史无前例', '意味深长', '深入人心', '可谓',
  '堪称', '不得不说', '值得一提的是', '不容忽视', '毋庸置疑', '不容置疑'
];

const CONCLUSION_CLICHES = [
  '展望未来', '未来可期', '前途无量', '前景广阔', '大有可为',
  '方兴未艾', '充满希望', '充满期待', '前程似锦', '大展宏图'
];

const PARA_SUMMARY_STARTERS = [
  '总的来说', '总而言之', '综上所述', '由此可见', '不难看出', '显而易见',
  '值得注意的是', '不容忽视的是', '更重要的是', '尤其值得一提', '说到底', '简而言之'
];

const FORMAL_INTRUSION = [
  '于是乎', '然而事实上', '然而实际上', '理所当然',
  '一方面', '另一方面', '与此同时', '诚然'
];

function escapeRegExp(str) {
  const star = String.fromCharCode(42);
  const specials = '.+?^${}()|[]\\' + star;
  return str.split('').map(function (ch) {
    return specials.indexOf(ch) !== -1 ? '\\' + ch : ch;
  }).join('');
}

function stripDialogueQuotes(text) {
  // 去掉双引号内的台词，专注于叙述句段 AI 检测
  return text.replace(/“[^”\n]{0,2000}”/g, ' ').replace(/"[^"\n]{0,2000}"/g, ' ');
}

function parseChapterNumber(filePath, titleLine) {
  const base = path.basename(filePath);
  const mFile = base.match(/chapter_(\d+)/i);
  if (mFile) return parseInt(mFile[1], 10);
  const mDigit = (titleLine || '').match(/第\s{0,}(\d+)\s{0,}章/);
  if (mDigit) return parseInt(mDigit[1], 10);
  return 0;
}

function computeStyleMetrics(bodyText, paragraphs) {
  const cjkMatches = bodyText.match(/[\u4e00-\u9fff]/g) || [];
  const totalCjk = cjkMatches.length;

  let dialogueCjk = 0;
  const dlgRe = /“([^”]{1,2000})”|"([^"]{1,2000})"/g;
  let m;
  while ((m = dlgRe.exec(bodyText)) !== null) {
    const inner = m[1] || m[2] || '';
    dialogueCjk += (inner.match(/[\u4e00-\u9fff]/g) || []).length;
  }

  const sentences = bodyText.split(/[。！？!?]+/).map(s => s.trim()).filter(Boolean);
  const sentCjkLens = sentences.map(s => (s.match(/[\u4e00-\u9fff]/g) || []).length).filter(n => n > 0);
  const avgSentChars = sentCjkLens.length
    ? Number((sentCjkLens.reduce((a, b) => a + b, 0) / sentCjkLens.length).toFixed(2))
    : 0;

  const paraCjkLens = paragraphs.map(p => (p.match(/[\u4e00-\u9fff]/g) || []).length).filter(n => n > 0);
  const avgParaChars = paraCjkLens.length
    ? Number((paraCjkLens.reduce((a, b) => a + b, 0) / paraCjkLens.length).toFixed(2))
    : 0;

  return {
    total_cjk_chars: totalCjk,
    paragraph_count: paragraphs.length,
    sentence_count: sentCjkLens.length,
    avg_sentence_cjk: avgSentChars,
    avg_paragraph_cjk: avgParaChars,
    dialogue_ratio: totalCjk > 0 ? Number((dialogueCjk / totalCjk).toFixed(4)) : 0
  };
}

function analyzeChapter(filePath, options) {
  const opts = options || {};
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('文件不存在：' + resolvedPath);
  }

  const rawBuf = fs.readFileSync(resolvedPath);
  const sha256 = crypto.createHash('sha256').update(rawBuf).digest('hex');
  const content = rawBuf.toString('utf8');
  const stat = fs.statSync(resolvedPath);
  const lines = content.split(/\r?\n/);

  let errors = [];
  let warnings = [];
  let notices = [];

  // 1. 绝对零星号铁律检查 (ASCII 0x2A)
  const asteriskChar = String.fromCharCode(42);
  if (content.indexOf(asteriskChar) !== -1) {
    errors.push('【铁律暴雷】文本中存在星号字符 (0x2A)，违反绝对零星号铁律！');
  }

  // 2. P0 草稿思维/元信息残留隔离检查（严禁任何创作备注泄露进正文）
  const p0Markers = [
    { name: '作者夹注（注：', re: /[（(]\s{0,}注\s{0,}[：:]/ },
    { name: '方括号占位说明', re: /\[\s{0,}(?:此处|待补|待填|说明|TODO|PLACEHOLDER)[^\]]{0,40}\]/i },
    { name: '大纲角标标签【xxx】', re: /【(?:注|待|说明|TODO|场景|人物卡)[^】]{0,30}】/i },
    { name: '草稿待办标记', re: /\b(?:TODO|PLACEHOLDER|FIXME)\b|NOVEL_TEXT_(?:START|END)/ },
    { name: '编者按/作者注前缀', re: /^(?:作者注|编者按|写作思路)\s{0,}[：:]/m }
  ];
  p0Markers.forEach(function (marker) {
    if (marker.re.test(content)) {
      errors.push('【P0正文章稿隔离失败】文中残留了创作思维/元信息标记（' + marker.name + '），必须立即清除！');
    }
  });

  // 3. 标题规范检查
  const titleLine = lines[0] || '';
  if (!titleLine.trim().startsWith('#')) {
    warnings.push('【格式预警】首行不是标准的 Markdown 一级标题（# 第X章 标题）。');
  }
  if (titleLine.indexOf('，') !== -1) {
    const parts = titleLine.replace(/^#\s{0,}/, '').split(/\s+/)[1] || '';
    // 仅拦截四字对四字公文对仗八股（排除口语短句如“图没了，人还在”“爹，您去一趟”）
    if (/^[\u4e00-\u9fff]{4}，[\u4e00-\u9fff]{4}$/.test(parts) && !/[了吗呢吧啊爹娘你我他]/.test(parts)) {
      errors.push('【标题八股病】标题使用了四字对仗（' + parts + '）！网文严禁四字对四字，必须单核直白！');
    }
  }
  const bureaucraticTitleWords = ['依据', '调研', '汇报', '调查', '规划', '研究', '报告'];
  bureaucraticTitleWords.forEach(function (bw) {
    if (titleLine.indexOf(bw) !== -1) {
      errors.push('【标题行政病】标题含有不适合小说的行政公文词汇（' + bw + '）！');
    }
  });

  const chapterNum = parseChapterNumber(resolvedPath, titleLine);

  // 提取纯正文与纯叙述（剥除标题行和引号对白）
  const bodyLines = lines.slice(1);
  const paragraphs = bodyLines.map(function (l) { return l.trim(); }).filter(function (l) {
    return l.length > 0 && !l.startsWith('#') && !/^---+$/.test(l) && l !== '……';
  });
  const bodyText = paragraphs.join('\n');
  const narrativeOnly = stripDialogueQuotes(bodyText);
  const pureBodyChars = Math.max(bodyText.replace(/\s+/g, '').length, 1);
  const perThousand = pureBodyChars / 1000;

  // 4. 历史称谓与科技越界检查
  if (content.indexOf('天可汗') !== -1) {
    errors.push('【历史硬伤】文中出现了“天可汗”！贞观四年灭颉利后方有此尊号，当前时间线严禁使用！');
  }
  if (content.indexOf('机油') !== -1 || content.indexOf('轴承') !== -1) {
    errors.push('【科技越界】文中出现了现代工业名词（机油/轴承）！必须使用釭、轴瓦、猪膏润脂！');
  }
  if (chapterNum > 0 && chapterNum < 85 && content.indexOf('玻璃窗') !== -1) {
    errors.push('【科技时间线越界】当前章节早于第85章(FB-006玻璃线)，严禁出现“玻璃窗”！应改为涂桐油明纸窗。');
  }
  if (narrativeOnly.indexOf('皇上') !== -1) {
    warnings.push('【称谓预警】叙述文中出现了清代称呼“皇上”，初唐宜称“圣人”、“陛下”或“至尊”。');
  }

  // 5. 标点符号规范检查
  if (content.indexOf('！！') !== -1 || content.indexOf('？！') !== -1 || content.indexOf('！？') !== -1) {
    errors.push('【标点暴雷】文中存在连续感叹号（！！或？！），严禁使用咆哮体标点！');
  }
  const exclamationCount = content.split('！').length - 1;
  if (exclamationCount > 10) {
    errors.push('【感叹号严重超标】全文感叹号高达 ' + exclamationCount + ' 个！严禁情绪过载，须改为沉稳句号。');
  } else if (exclamationCount > 0) {
    warnings.push('【标点克制提示】正文出现了 ' + exclamationCount + ' 个感叹号（第24章起本书实行全章零感叹号极简冷峻标准）。');
  }

  // 6. 文青病与冗余副词检查
  const literaryBlacklist = [
    '小灯笼', '雀儿', '松柏苦香', '熨平', '熨帖',
    '漂泊浮沉', '大青瓷盆', '火鏊子', '红根菘菜', '苍黄沃野'
  ];
  literaryBlacklist.forEach(function (word) {
    if (content.indexOf(word) !== -1) {
      errors.push('【文青病毒素】文中出现了禁用的文青散文词或舌尖体词汇：' + word);
    }
  });

  const adverbBlacklist = ['极其', '非常', '不由自主', '毫无疑问', '情不自禁'];
  adverbBlacklist.forEach(function (adv) {
    const count = bodyText.split(adv).length - 1;
    if (count > 2) {
      errors.push('【冗余副词泛滥】高危副词“' + adv + '”出现 ' + count + ' 次（上限2次，强烈建议清零）！');
    } else if (count > 0) {
      warnings.push('【减法提示】检测到高危冗余副词“' + adv + '” ' + count + ' 次，建议做减法删除。');
    }
  });

  // 7. 段落重复度检验（防模型循环注水）
  const substantialParas = paragraphs.filter(function (p) { return p.length >= 10; });
  const paraFreq = {};
  substantialParas.forEach(function (p) {
    paraFreq[p] = (paraFreq[p] || 0) + 1;
  });
  const uniqueParas = Object.keys(paraFreq).length;
  const uniqueRatio = substantialParas.length > 0 ? uniqueParas / substantialParas.length : 1;
  const maxRepeat = substantialParas.length > 0 ? Math.max.apply(null, Object.values(paraFreq)) : 1;
  if (substantialParas.length >= 10 && (uniqueRatio < 0.85 || maxRepeat > 2)) {
    errors.push(
      '【重复段落阻断】段落唯一率 ' + (uniqueRatio / 0.01).toFixed(1) + '% (<85%) 或单段最大重复 ' + maxRepeat + ' 次 (>2)，疑似重复注水！'
    );
  }

  // 8. 7大类去 AI 味定量检查（重点在叙述文本中精准扫描）
  let aiVocabTotal = 0;
  const aiVocabHits = [];
  AI_VOCAB_RULES.forEach(function (rule) {
    const count = narrativeOnly.split(rule.phrase).length - 1;
    if (count > 0) {
      aiVocabTotal += count;
      aiVocabHits.push({ phrase: rule.phrase, count: count, reason: rule.reason });
    }
  });
  aiVocabHits.sort(function (a, b) { return b.count - a.count; });

  const aiVocabDensity = Number((aiVocabTotal / perThousand).toFixed(2));
  const repeatedAiPhrases = aiVocabHits.filter(function (h) { return h.count >= 2; });
  if (repeatedAiPhrases.length > 0 || aiVocabDensity > 0.8) {
    const topStr = aiVocabHits.slice(0, 5).map(function (h) { return h.phrase + '(×' + h.count + ')'; }).join('、');
    warnings.push(
      '【去AI味高频预警】叙述部分命中 ' + aiVocabTotal + ' 处 AI 惯性套话（每千字 ' + aiVocabDensity + ' 次）：' + topStr
    );
  } else if (aiVocabTotal > 0) {
    notices.push('去AI高频词轻微命中 ' + aiVocabTotal + ' 处：' + aiVocabHits.map(function (h) { return h.phrase; }).join('、'));
  }

  let weakAdvTotal = 0;
  const weakAdvHits = [];
  WEAK_ADVERBS.forEach(function (adv) {
    const count = narrativeOnly.split(adv).length - 1;
    if (count > 0) {
      weakAdvTotal += count;
      weakAdvHits.push({ adverb: adv, count: count });
    }
  });
  weakAdvHits.sort(function (a, b) { return b.count - a.count; });
  const weakAdvDensity = Number((weakAdvTotal / perThousand).toFixed(2));
  const overusedAdvs = weakAdvHits.filter(function (h) { return h.count >= 4; });
  if (weakAdvDensity > 3.0 || overusedAdvs.length > 0) {
    const advStr = weakAdvHits.slice(0, 4).map(function (h) { return h.adverb + '(×' + h.count + ')'; }).join('、');
    warnings.push(
      '【弱化副词过密】叙述中弱化副词共 ' + weakAdvTotal + ' 处（每千字 ' + weakAdvDensity + ' 次，红线 3.0/千字；或单字>=4次）：' + advStr
    );
  }

  const sigHits = SIGNIFICANCE_PHRASES.filter(function (p) { return narrativeOnly.indexOf(p) !== -1; });
  if (sigHits.length > 0) {
    warnings.push('【意义膨胀词预警】叙述出现评论/夸大词（用具体事实替换）：' + sigHits.join('、'));
  }

  const concHits = CONCLUSION_CLICHES.filter(function (p) { return bodyText.indexOf(p) !== -1; });
  if (concHits.length > 0) {
    warnings.push('【通用结语套话】出现空泛结论词：' + concHits.join('、'));
  }

  let summaryParaCount = 0;
  const summaryStartersHit = [];
  paragraphs.forEach(function (p) {
    if (p.startsWith('“') || p.startsWith('"')) return;
    const firstPart = p.split(/[，。！？]/)[0] || '';
    for (let i = 0; i < PARA_SUMMARY_STARTERS.length; i++) {
      if (firstPart.startsWith(PARA_SUMMARY_STARTERS[i])) {
        summaryParaCount++;
        summaryStartersHit.push(firstPart.slice(0, 20));
        break;
      }
    }
  });
  if (paragraphs.length > 0 && summaryParaCount / paragraphs.length > 0.15) {
    warnings.push('【论文段首总结预警】有 ' + summaryParaCount + ' 段以议论/总结句开头（如 ' + summaryStartersHit.slice(0, 2).join(' / ') + '）。');
  }

  const formalHits = FORMAL_INTRUSION.filter(function (p) { return narrativeOnly.indexOf(p) !== -1; });
  if (formalHits.length > 0) {
    warnings.push('【正式论文/新闻腔预警】叙述出现异体逻辑词：' + formalHits.join('、'));
  }

  // 改进版排比三连检查：仅扫描剥离引号后的叙述文本，匹配结构化平行句尾
  const trioMatches = narrativeOnly.match(/[\u4e00-\u9fff]{3,10}(?:着|了|的|地)[、，][^\n。！？“”]{3,12}(?:着|了|的|地)[、，][^\n。！？“”]{3,12}(?:着|了|的|地)/g) || [];
  if (trioMatches.length > 3) {
    warnings.push('【排比句式偏密】叙述区发现 ' + trioMatches.length + ' 处同构三连排比，注意节奏错落。');
  }

  // 9. 手机端长段落检查（>200字警告）
  lines.forEach(function (line, idx) {
    const trimmed = line.trim();
    if (trimmed.length > 200) {
      warnings.push('【排版警告】第 ' + (idx + 1) + ' 行长度达 ' + trimmed.length + ' 字，超出手机端极简留白标准（<=200字）！');
    }
  });

  // 10. 知识图谱在场连贯性防穿帮校验（读取 02_memories/story_graph.json）
  if (chapterNum > 0 && fs.existsSync(STORY_GRAPH_PATH)) {
    try {
      const graph = JSON.parse(fs.readFileSync(STORY_GRAPH_PATH, 'utf8'));
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      nodes.forEach(function (node) {
        if (!node || node.type !== 'character') return;
        const removedCh = Number(node.removed_after_chapter || 0);
        if (removedCh > 0 && chapterNum > removedCh && node.name) {
          const safeName = escapeRegExp(node.name);
          // 仅匹配该角色作为“现场主动施动者或开口发言人”的场景穿帮，避免被口头提及或回忆误报
          const activePattern = new RegExp(
            safeName + '\\s{0,6}(?:说道|喝道|冷笑|怒道|叫嚣|走上前|迈步|拍案|拱手|站起身|指着|挥手|吩咐|问道)'
          );
          if (activePattern.test(narrativeOnly) || activePattern.test(bodyText)) {
            errors.push(
              '【图谱时空冲突】角色「' + node.name + '」已于第' + removedCh + '章状态变更为 [' +
              node.status + ']（' + (node.location || '已离场') + '），但第' + chapterNum + '章疑似将其写成现场行动/说话人！'
            );
          }
        }
      });
    } catch (err) {
      notices.push('story_graph.json 读取跳过：' + err.message);
    }
  }

  // 11. 文风指纹统计与轻提醒
  const styleMetrics = computeStyleMetrics(bodyText, paragraphs);

  const report = {
    chapter_file: resolvedPath,
    chapter_name: path.basename(resolvedPath),
    chapter_number: chapterNum,
    checked_at: new Date().toISOString(),
    file_mtime_ms: stat.mtimeMs,
    file_sha256: sha256,
    total_chars: content.length,
    line_count: lines.length,
    passed: errors.length === 0,
    strict_passed: errors.length === 0 && warnings.length === 0,
    errors: errors,
    warnings: warnings,
    notices: notices,
    ai_trace: {
      ai_vocab_count: aiVocabTotal,
      ai_vocab_density_per_1k: aiVocabDensity,
      ai_vocab_hits: aiVocabHits,
      weak_adverb_count: weakAdvTotal,
      weak_adverb_density_per_1k: weakAdvDensity,
      weak_adverb_hits: weakAdvHits.slice(0, 8),
      paragraph_unique_ratio: Number(uniqueRatio.toFixed(4)),
      max_paragraph_repeat: maxRepeat
    },
    style_metrics: styleMetrics
  };

  // 默认自动落盘门禁凭据（仅在文件属于 03_chapters/ 且未传 --no-gate 时写入）
  const normalizedPosix = resolvedPath.replace(/\\/g, '/');
  const inChaptersDir = normalizedPosix.indexOf('/03_chapters/chapter_') !== -1;
  if (!opts.noGate && (opts.emitGate || inChaptersDir)) {
    fs.mkdirSync(GATE_DIR, { recursive: true });
    const gateName = path.basename(resolvedPath, '.md') + '.gate.json';
    const gatePath = path.join(GATE_DIR, gateName);
    fs.writeFileSync(gatePath, JSON.stringify(report, null, 2), 'utf8');
    report.gate_file = gatePath;
  }

  return report;
}

function printReport(report) {
  console.log('====================================================');
  console.log('【番茄官方工业化品控 & 去AI味终审报告】: ' + report.chapter_name);
  console.log(
    '总字符：' + report.total_chars +
    ' | 纯汉字：' + report.style_metrics.total_cjk_chars +
    ' | 段落：' + report.style_metrics.paragraph_count +
    ' | 均句长：' + report.style_metrics.avg_sentence_cjk + '字' +
    ' | 对话比：' + (report.style_metrics.dialogue_ratio / 0.01).toFixed(1) + '%'
  );
  console.log(
    '去AI指标：套话 ' + report.ai_trace.ai_vocab_count + '次 (' + report.ai_trace.ai_vocab_density_per_1k + '/千字)' +
    ' | 弱化副词 ' + report.ai_trace.weak_adverb_count + '次 (' + report.ai_trace.weak_adverb_density_per_1k + '/千字)' +
    ' | 段落唯一率 ' + (report.ai_trace.paragraph_unique_ratio / 0.01).toFixed(1) + '%'
  );
  console.log('====================================================');

  if (report.errors.length > 0) {
    console.log('❌ 致命错误 (' + report.errors.length + ' 项)：');
    report.errors.forEach(function (e) { console.log('  ' + e); });
  } else {
    console.log('✅ 致命错误：0 项通过！');
  }

  if (report.warnings.length > 0) {
    console.log('⚠️ 优化预警 (' + report.warnings.length + ' 项)：');
    report.warnings.forEach(function (w) { console.log('  ' + w); });
  } else {
    console.log('✅ 优化预警：0 项通过！');
  }

  if (report.notices.length > 0) {
    console.log('ℹ️ 轻微参考 (' + report.notices.length + ' 项)：');
    report.notices.forEach(function (n) { console.log('  ' + n); });
  }

  if (report.gate_file) {
    console.log('🔒 已更新 mtime 门禁凭据：' + path.relative(path.resolve(__dirname, '..'), report.gate_file));
  }
  console.log('====================================================');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const noGate = args.indexOf('--no-gate') !== -1;
  const emitGate = args.indexOf('--emit-gate') !== -1;
  const jsonMode = args.indexOf('--json') !== -1;
  const strictMode = args.indexOf('--strict') !== -1;
  const fileArgs = args.filter(function (a) { return !a.startsWith('--'); });
  const targetFile = fileArgs[0] || path.join(__dirname, '../03_chapters/chapter_035.md');

  try {
    const report = analyzeChapter(targetFile, { noGate: noGate, emitGate: emitGate });
    if (jsonMode) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
    if (report.errors.length > 0) process.exit(1);
    if (strictMode && report.warnings.length > 0) process.exit(2);
    process.exit(0);
  } catch (err) {
    console.error('【错误】' + err.message);
    process.exit(1);
  }
}

module.exports = {
  analyzeChapter: analyzeChapter,
  printReport: printReport,
  GATE_DIR: GATE_DIR
};
