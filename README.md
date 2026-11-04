# AINovel-Engine (通用工业化网文创作与自动化发布引擎)

基于软件工程CI/CD思想与Playwright自动化流水线的全生命周期网文工业化创作引擎与合规交付系统。

## 目录结构说明

```text
ainovel-engine/
├── config/
│   ├── project.json              # 项目全局配置（书名模板、目标字数、格式约束）
│   └── publishing_schedule.json  # 自动化发布排期表与状态跟踪
├── 00_settings/                  # 【架构师资产：全局设定模板】
│   ├── world_rules.md            # 世界观底层规则、战力公理
│   ├── characters.md             # 角色档案卡（人设、行为范式）
│   └── gold_finger.md            # 核心机制与特殊能力设定
├── 01_outlines/                  # 【总编资产：分卷与章节大纲】
│   └── master_outline.md         # 全书宏观分卷规划
├── 02_memories/                  # 【记忆库：状态机与上下文追踪】
│   ├── chapter_summaries.md      # 动态章节摘要
│   ├── plot_tracker.md           # 伏笔与实体状态追踪
│   └── writing_rules.md          # 核心写作与排版规范（绝对零星号等）
├── 03_chapters/                  # 【正文交付区】
│   └── .gitkeep                  # 章节正文存放目录
├── prompts/                      # 核心生产提示词模板（架构师、写手、审稿）
├── scripts/                      # 自动化流水线工具集
│   ├── login.js                  # 平台会话维持
│   ├── publish.js                # 通用单章发布引擎
│   ├── publish_batch_template.js # 顺序批量发布模板
│   ├── master_scheduler.js       # 排期定时调度引擎
│   ├── list_exact_chapters.js    # 线上目录实时回显核验
│   ├── clean_all_asterisks.js    # 格式符号自动化清洗
│   └── count_asterisks.js        # 零星号合规质检工具
├── tools/                        # 核心自动化工具包（Playwright自动化驱动）
└── assets/                       # 封面与媒体资产目录
```

## 核心特性

1. 软件工程化叙事：将传统小说创作转变为可量化、可测试、可迭代的工业流水线。
2. 四层代码审计保障：语法与符号过滤、字数与结构校验、语义安全审查、逻辑与上下文咬合。
3. 自动化平台履约：基于Playwright保持登录会话，DOM富文本精准注入，穿透各类交互弹窗。
4. 绝对单调递增发布：章节强制串行并设置安全时间戳沉淀，彻底杜绝目录乱序倒挂。
