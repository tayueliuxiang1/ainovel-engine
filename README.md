工业级多智能体网文创作与排期发布引擎 | Industrial multi-agent web novel generation and automated publishing engine.

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
├── prompts/                      # 核心生产提示词模板
│   ├── outliner.md               # 架构师 Agent 规范
│   ├── writer.md                 # 写手 Agent 规范（四幕式黄金模型）
│   ├── critic.md                 # 毒点审查官 Agent 规范（红蓝军对抗找茬）
│   └── editor.md                 # 总编 Agent 规范（四层物理代码终审）
├── scripts/                      # 自动化流水线工具集
│   ├── run_agent_loop.js         # 【核心】多智能体自博弈全自动闭环研发引擎
│   ├── publish_batch_template.js # 顺序批量拟人化发布模板（带防倒挂时序锁）
│   ├── stealth_utils.js          # 抹除WebDriver特征与正态随机等待工具
│   ├── fetch_reader_feedback.js  # 读者章评与平台在读数据反馈采集器
│   ├── generate_promo_script.js  # 短剧/推文短视频解说分镜自动切片工具
│   ├── master_scheduler.js       # 排期定时调度引擎
│   ├── list_exact_chapters.js    # 线上目录实时回显核验
│   ├── login.js                  # 平台会话维持
│   └── count_asterisks.js        # 零星号合规质检工具
├── tools/                        # 核心自动化工具包（Playwright自动化驱动）
└── assets/                       # 封面与媒体资产目录
```

## 核心特性与工作流

1. 三权分立多智能体自博弈闭环：运行 `node scripts/run_agent_loop.js --chapter 序号 --title 标题`，自动调度写手出稿、毒点审查官对抗打分（低于90分强制打回重写）、总编四层代码级物理终审，并自动落盘交付。
2. 拟人化反风控与防倒挂发布：抹除自动化特征，加入8至14秒正态随机等待沉淀时间戳，保证章节目录单调递增。
3. 读者数据双向反馈：自动化采集后台追读与读者评论，结构化存储为记忆输入，指导大纲动态微调。
4. 多模态宣发自动化：一键提取章节高潮与前三秒黄金吸睛钩子，生成短视频短剧推文分镜脚本。
