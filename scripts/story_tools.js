// scripts/story_tools.js
// 轻量级长篇连载中枢工具：知识图谱强校验 + 写前按需中文RAG检索 + 节奏冷却状态机 + 文风指纹基线
// 严格遵守零星号铁律（代码、正则与输出均不含 ASCII 0x2A）

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEM_DIR = path.join(ROOT, '02_memories');
const CHAP_DIR = path.join(ROOT, '03_chapters');
const GRAPH_PATH = path.join(MEM_DIR, 'story_graph.json');
const PACING_PATH = path.join(MEM_DIR, 'pacing_and_style_state.json');

const { analyzeChapter } = require('./verify_chapter');

const EVENT_LABELS = {
  conflict_thrill: '冲突爽点（打脸/反杀/突破）',
  bond_deepening: '人物羁绊（家常/袍泽/匠心互动）',
  faction_building: '势力经营（产线/账目/招揽/外交）',
  world_painting: '风土人情（初唐物候/民俗/器物生活）',
  tension_escalation: '危机升级（断供/官难/天灾/新暗线）'
};

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function listChapterFiles() {
  if (!fs.existsSync(CHAP_DIR)) return [];
  return fs.readdirSync(CHAP_DIR)
    .filter(function (f) { return /^chapter_\d+\.md$/.test(f); })
    .sort()
    .map(function (f) {
      const m = f.match(/chapter_(\d+)\.md/);
      return {
        num: m ? parseInt(m[1], 10) : 0,
        name: f,
        path: path.join(CHAP_DIR, f)
      };
    });
}

// ---------------------------------------------------------------------------
// 1. validate: 知识图谱结构与伏笔时间窗校验
// ---------------------------------------------------------------------------
function cmdValidate() {
  const graph = readJson(GRAPH_PATH, null);
  if (!graph) {
    console.error('❌ 未找到 02_memories/story_graph.json');
    process.exit(1);
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const nodeMap = {};
  const errors = [];
  const warnings = [];
  const curCh = Number(graph.last_updated_chapter || 0);

  nodes.forEach(function (n, idx) {
    if (!n || !n.id || !n.type || !n.name) {
      errors.push('节点缺失必填字段 (index=' + idx + ')');
      return;
    }
    if (nodeMap[n.id]) {
      errors.push('节点 ID 重复: ' + n.id);
    }
    nodeMap[n.id] = n;

    if (n.type === 'foreshadow' && !n.resolved) {
      const planted = Number(n.planted_chapter || 0);
      const target = Number(n.target_chapter || 0);
      if (planted > 0 && target > 0 && target < planted) {
        errors.push('伏笔时间窗倒挂: ' + n.id + ' (planted=' + planted + ' > target=' + target + ')');
      }
      if (curCh > 0 && target > 0 && curCh > target) {
        warnings.push('伏笔已超过计划窗口: ' + n.name + ' (截止第' + target + '章，当前第' + curCh + '章)');
      }
    }
  });

  edges.forEach(function (e, idx) {
    if (!e || !e.id || !e.source || !e.target) {
      errors.push('边缺失必填字段 (index=' + idx + ')');
      return;
    }
    if (!nodeMap[e.source]) errors.push('边起点不存在: ' + e.id + ' -> ' + e.source);
    if (!nodeMap[e.target]) errors.push('边终点不存在: ' + e.id + ' -> ' + e.target);
  });

  console.log('====================================================');
  console.log('【Story Graph 图谱一致性校验】');
  console.log('当前推进至：第 ' + curCh + ' 章 | 节点数：' + nodes.length + ' | 关系边数：' + edges.length);
  console.log('致命错误：' + errors.length + ' | 逾期提示：' + warnings.length);
  errors.forEach(function (e) { console.log('  ❌ ' + e); });
  warnings.forEach(function (w) { console.log('  ⚠️ ' + w); });
  console.log('====================================================');
  if (errors.length > 0) process.exit(1);
}

// ---------------------------------------------------------------------------
// 中文轻量级 2-gram 分词（零依赖）
// ---------------------------------------------------------------------------
function cjkNgrams(text) {
  const grams = new Set();
  const blocks = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  blocks.forEach(function (blk) {
    for (let i = 0; i <= blk.length - 2; i++) {
      grams.add(blk.slice(i, i + 2));
      if (i <= blk.length - 3) grams.add(blk.slice(i, i + 3));
    }
  });
  return grams;
}

// ---------------------------------------------------------------------------
// 2. pacing 状态分析
// ---------------------------------------------------------------------------
function computePacingAdvice(nextChapter) {
  const state = readJson(PACING_PATH, { config: {}, history: [] });
  const history = Array.isArray(state.history) ? state.history.slice().sort(function (a, b) {
    return a.chapter - b.chapter;
  }) : [];
  const cfg = state.config || {};
  const cooldowns = cfg.cooldowns || {
    conflict_thrill: 2,
    bond_deepening: 1,
    faction_building: 2,
    world_painting: 3,
    tension_escalation: 2
  };
  const gentleWindow = Number(cfg.gentle_window_size || 5);

  const lastUsed = {};
  Object.keys(EVENT_LABELS).forEach(function (k) { lastUsed[k] = 0; });
  history.forEach(function (h) {
    if (h.chapter >= nextChapter) return;
    (h.event_types || []).forEach(function (t) {
      if (h.chapter > (lastUsed[t] || 0)) lastUsed[t] = h.chapter;
    });
  });

  const availability = {};
  Object.keys(EVENT_LABELS).forEach(function (t) {
    const lu = lastUsed[t] || 0;
    const cd = Number(cooldowns[t] || 1);
    const gap = lu > 0 ? nextChapter - lu : 999;
    availability[t] = {
      label: EVENT_LABELS[t],
      last_used_chapter: lu,
      cooldown: cd,
      cooled: gap > cd,
      chapters_since_last: lu > 0 ? gap : null
    };
  });

  // 统计最近 gentleWindow - 1 章中是否有慢档或纯温和元素（bond_deepening / world_painting / slow）
  const recent = history.filter(function (h) {
    return h.chapter >= nextChapter - (gentleWindow - 1) && h.chapter < nextChapter;
  });
  const hasRecentWorldPainting = recent.some(function (h) {
    return (h.event_types || []).indexOf('world_painting') !== -1;
  });
  const hasPureSlow = recent.some(function (h) { return h.tier === 'slow'; });

  const recentFastOrConflictStreak = (function () {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].chapter >= nextChapter) continue;
      if (history[i].tier === 'fast' || (history[i].event_types || []).indexOf('conflict_thrill') !== -1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  })();

  const suggestions = [];
  if (!hasRecentWorldPainting) {
    suggestions.push('最近 ' + (gentleWindow - 1) + ' 章未安排「风土人情 (world_painting)」，第 ' + nextChapter + ' 章非常适合融入初唐冬雪市井、山林矿脉或匠户日常画面。');
  }
  if (!hasPureSlow) {
    suggestions.push('最近 ' + (gentleWindow - 1) + ' 章均无纯慢档(slow)缓冲，建议第 ' + nextChapter + ' 章以中/慢档切入（如实地勘探、细节造物、亲友并肩），张弛兼备。');
  }
  if (recentFastOrConflictStreak >= 2) {
    suggestions.push('前序已连打 ' + recentFastOrConflictStreak + ' 章高冲突/快节奏，警惕反派密集上门造成爽点疲劳。');
  }
  if (suggestions.length === 0) {
    suggestions.push('近期各类型节奏冷却健康，可按既定主线自由发挥。');
  }

  return {
    next_chapter: nextChapter,
    recent_chapters: recent,
    availability: availability,
    suggestions: suggestions
  };
}

// ---------------------------------------------------------------------------
// 3. context: 写前精准按需注入（替代暴力全读几十万字）
// ---------------------------------------------------------------------------
function cmdContext(chapterNum, keywords) {
  const graph = readJson(GRAPH_PATH, { nodes: [], edges: [] });
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const nextCh = chapterNum || (Number(graph.last_updated_chapter || 35) + 1);

  const activeChars = nodes.filter(function (n) {
    return n.type === 'character' && !n.removed_after_chapter && n.status === 'active';
  });
  const lockedChars = nodes.filter(function (n) {
    return n.type === 'character' && Number(n.removed_after_chapter || 0) > 0 && nextCh > Number(n.removed_after_chapter);
  });
  const pendingForeshadows = nodes
    .filter(function (n) { return n.type === 'foreshadow' && !n.resolved; })
    .sort(function (a, b) {
      return Number(a.target_chapter || 999) - Number(b.target_chapter || 999);
    });

  const pacing = computePacingAdvice(nextCh);

  console.log('====================================================');
  console.log('【第 ' + nextCh + ' 章写前态势图谱 & RAG精准记忆包】');
  console.log('====================================================');

  console.log('\n[1] 绝对防穿帮黑名单（已下狱/退场，禁止当作当场活人动作主体）:');
  lockedChars.forEach(function (c) {
    console.log('  - ' + c.name + ' [第' + c.removed_after_chapter + '章起状态: ' + c.status + '] -> ' + (c.location || ''));
  });

  console.log('\n[2] 活跃人物当前坐标速览:');
  activeChars.forEach(function (c) {
    console.log('  - ' + c.name + '（' + (c.rank || '平民') + '）｜ 位置：' + (c.location || '未知'));
  });

  console.log('\n[3] 急迫及长线待回收伏笔（按到期先后）:');
  pendingForeshadows.forEach(function (f) {
    console.log('  - [' + f.name + ']（埋于第' + f.planted_chapter + '章 -> 预期第' + f.target_chapter + '章）：' + f.description);
  });

  console.log('\n[4] 节奏与题材冷却建议:');
  pacing.suggestions.forEach(function (s) {
    console.log('  - ' + s);
  });

  // 轻量本地中文 RAG 片段检索
  if (keywords && keywords.length > 0) {
    console.log('\n[5] 前文原文按需回读 Top-6 片段 (检索词: ' + keywords.join(' / ') + '):');
    const queryStr = keywords.join(' ');
    const queryGrams = cjkNgrams(queryStr);
    const chapterFiles = listChapterFiles().filter(function (f) { return f.num < nextCh; });
    const scoredBlocks = [];

    chapterFiles.forEach(function (ch) {
      const txt = fs.readFileSync(ch.path, 'utf8');
      const lines = txt.split(/\r?\n/);
      lines.forEach(function (line, idx) {
        const trimmed = line.trim();
        if (trimmed.length < 15 || trimmed.startsWith('#')) return;
        let kwScore = 0;
        const matchedKws = [];
        keywords.forEach(function (kw) {
          if (kw && trimmed.indexOf(kw) !== -1) {
            kwScore += 10;
            matchedKws.push(kw);
          }
        });
        let gramScore = 0;
        if (kwScore > 0 || queryGrams.size > 0) {
          const lineGrams = cjkNgrams(trimmed);
          queryGrams.forEach(function (g) {
            if (lineGrams.has(g)) gramScore += 1;
          });
        }
        const total = kwScore + gramScore / 1.66;
        if (total >= 10 || (kwScore === 0 && gramScore >= 5)) {
          scoredBlocks.push({
            chapter: ch.num,
            file: ch.name,
            line: idx + 1,
            score: Number(total.toFixed(1)),
            matched: matchedKws,
            snippet: trimmed.length > 160 ? trimmed.slice(0, 160) + '...' : trimmed
          });
        }
      });
    });

    scoredBlocks.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.chapter - a.chapter;
    });

    const topHits = scoredBlocks.slice(0, 6);
    if (topHits.length === 0) {
      console.log('  （未命中高相关历史正文片段，可能为全新开启线索）');
    } else {
      topHits.forEach(function (hit, idx) {
        console.log('  ' + (idx + 1) + '. [' + hit.file + '#L' + hit.line + ' | 分值 ' + hit.score + '] ' + hit.snippet);
      });
    }
  }
  console.log('====================================================');
}

// ---------------------------------------------------------------------------
// 4. style-baseline: 提取全书文风指纹基线（尤其对比第21-35章黄金段）
// ---------------------------------------------------------------------------
function cmdStyleBaseline() {
  const files = listChapterFiles();
  if (files.length === 0) {
    console.log('未找到任何章节文件');
    return;
  }

  const allStats = [];
  files.forEach(function (ch) {
    const rep = analyzeChapter(ch.path, { noGate: true });
    allStats.push({
      chapter: ch.num,
      cjk: rep.style_metrics.total_cjk_chars,
      paras: rep.style_metrics.paragraph_count,
      avg_sent: rep.style_metrics.avg_sentence_cjk,
      avg_para: rep.style_metrics.avg_paragraph_cjk,
      dialogue_ratio: rep.style_metrics.dialogue_ratio,
      ai_density: rep.ai_trace.ai_vocab_density_per_1k,
      weak_adv_density: rep.ai_trace.weak_adverb_density_per_1k
    });
  });

  function avgSlice(arr, key) {
    if (!arr.length) return 0;
    const sum = arr.reduce(function (acc, item) { return acc + item[key]; }, 0);
    return Number((sum / arr.length).toFixed(2));
  }

  const recentGolden = allStats.filter(function (s) { return s.chapter >= 21; });
  const targetArr = recentGolden.length >= 5 ? recentGolden : allStats;

  const baseline = {
    computed_at: new Date().toISOString(),
    chapters_analyzed: allStats.length,
    golden_window: recentGolden.length >= 5 ? 'Ch21-Ch' + allStats[allStats.length - 1].chapter : 'All',
    avg_cjk_per_chapter: avgSlice(targetArr, 'cjk'),
    avg_paragraphs: avgSlice(targetArr, 'paras'),
    avg_sentence_cjk: avgSlice(targetArr, 'avg_sent'),
    avg_paragraph_cjk: avgSlice(targetArr, 'avg_para'),
    avg_dialogue_ratio: Number(avgSlice(targetArr, 'dialogue_ratio').toFixed(4)),
    avg_ai_vocab_per_1k: avgSlice(targetArr, 'ai_density'),
    avg_weak_adverb_per_1k: avgSlice(targetArr, 'weak_adv_density')
  };

  const state = readJson(PACING_PATH, { version: '1.0', config: {}, style_baseline: {}, history: [] });
  state.style_baseline = baseline;
  state.updated_at = new Date().toISOString();
  writeJson(PACING_PATH, state);

  console.log('====================================================');
  console.log('【全书文风指纹基线抽样完成】(' + baseline.golden_window + '，共' + targetArr.length + '章样本)');
  console.log('  平均纯汉字：' + baseline.avg_cjk_per_chapter + ' 字/章');
  console.log('  平均段落数：' + baseline.avg_paragraphs + ' 段/章（均段长 ' + baseline.avg_paragraph_cjk + ' 字）');
  console.log('  平均句长：  ' + baseline.avg_sentence_cjk + ' 字');
  console.log('  对话占比：  ' + (baseline.avg_dialogue_ratio / 0.01).toFixed(1) + '%');
  console.log('  AI套话均值：' + baseline.avg_ai_vocab_per_1k + ' /千字');
  console.log('  弱化副词均值：' + baseline.avg_weak_adverb_per_1k + ' /千字');
  console.log('已同步落盘至：02_memories/pacing_and_style_state.json');
  console.log('====================================================');
}

// ---------------------------------------------------------------------------
// 5. pacing: 查看或记录事件节奏状态
// ---------------------------------------------------------------------------
function cmdPacing(args) {
  const recordIdx = args.indexOf('--record');
  if (recordIdx !== -1) {
    const ch = parseInt(args[recordIdx + 1], 10);
    const tier = args[recordIdx + 2] || 'medium';
    const types = (args[recordIdx + 3] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    const note = args.slice(recordIdx + 4).join(' ');
    if (!ch || !types.length) {
      console.error('用法：node scripts/story_tools.js pacing --record <chapterNum> <slow|medium|fast> <type1,type2> [摘要]');
      process.exit(1);
    }
    const state = readJson(PACING_PATH, { version: '1.0', config: {}, style_baseline: {}, history: [] });
    state.history = (state.history || []).filter(function (h) { return Number(h.chapter) !== ch; });
    state.history.push({ chapter: ch, tier: tier, event_types: types, note: note });
    state.history.sort(function (a, b) { return a.chapter - b.chapter; });
    state.updated_at = new Date().toISOString();
    writeJson(PACING_PATH, state);
    console.log('✅ 已登记第 ' + ch + ' 章节奏档案 (' + tier + ': ' + types.join(',') + ')');
    return;
  }

  const graph = readJson(GRAPH_PATH, { last_updated_chapter: 35 });
  const nextCh = Number(graph.last_updated_chapter || 35) + 1;
  const advice = computePacingAdvice(nextCh);
  console.log('====================================================');
  console.log('【节奏冷却状态机报告】(针对即将动笔的第 ' + nextCh + ' 章)');
  console.log('最近几章节奏轨迹：');
  advice.recent_chapters.forEach(function (h) {
    console.log('  - 第' + h.chapter + '章 [' + h.tier + '] ' + (h.event_types || []).join(',') + ' | ' + (h.note || ''));
  });
  console.log('\n五类事件当前冷却情况：');
  Object.keys(advice.availability).forEach(function (k) {
    const item = advice.availability[k];
    const flag = item.cooled ? '✅ 可用' : '⏳ 冷却中';
    console.log('  - ' + item.label + '：' + flag + ' (上次第' + (item.last_used_chapter || '无') + '章, 冷却需求>' + item.cooldown + '章)');
  });
  console.log('\n选材建议：');
  advice.suggestions.forEach(function (s) { console.log('  - ' + s); });
  console.log('====================================================');
}

// CLI 入口
(function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'validate';
  if (cmd === 'validate') {
    cmdValidate();
  } else if (cmd === 'context') {
    const ch = args[1] && /^\d+$/.test(args[1]) ? parseInt(args[1], 10) : 0;
    const kwStart = ch ? 2 : 1;
    cmdContext(ch, args.slice(kwStart));
  } else if (cmd === 'style-baseline') {
    cmdStyleBaseline();
  } else if (cmd === 'pacing') {
    cmdPacing(args.slice(1));
  } else {
    console.log('用法: node scripts/story_tools.js <validate|context [ch] [kws...]|style-baseline|pacing>');
  }
})();
