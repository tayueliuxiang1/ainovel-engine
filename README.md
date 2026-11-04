# AINovel-Engine (Antigravity 本地原生版)

基于多 Agent（架构师、写手、编辑、记忆归档）协同的高效长篇网文创作引擎。

## 目录结构说明

```text
ainovel-engine/
├── config/
│   └── project.json              # 项目全局配置（书名、平台、受众目标）
├── 00_settings/                  # 【架构师资产：全局设定】
│   ├── world_rules.md            # 世界观规则、灾变机制、基础法则
│   ├── characters.md             # 角色档案卡（人设、语言习惯、心理动机构架）
│   └── gold_finger.md            # 主角金手指底层逻辑与数值/权限成长树
├── 01_outlines/                  # 【大纲层：剧情骨架】
│   ├── volume_1_outline.md       # 第一卷核心主线与副本高潮设计
│   └── chapter_plans.md          # 分章细纲（前三章爆款钩子与后续章节计划）
├── 02_memories/                  # 【记忆层：长篇防失忆与防崩盘】
│   ├── chapter_summaries.md      # 滚动式单章50字极简摘要（提供给Writer的局部上下文）
│   └── plot_tracker.md           # 伏笔与道具追踪表（已埋下/待解决/人物状态变化）
├── 03_chapters/                  # 【成品正文】
│   └── chapter_001.md            # 生成的章节正文与评审批注
└── prompts/                      # 【各角色 Agent 标准提示词模板】
    ├── writer.md                 # 写手扩写提示词规范
    └── editor.md                 # 毒舌编辑质检与打分规范
```

## 核心运行流水线 (SOP)

1. **Step 1 (架构师)**：确认 `00_settings` 与 `01_outlines/chapter_plans.md`（细纲是小说的灵魂缰绳）。
2. **Step 2 (写手 Writer)**：读取【角色卡 + 本章细纲 + 上一章摘要】，单章扩写 2500 字，禁止自由发挥。
3. **Step 3 (编辑 Editor)**：依据番茄留存标准，从“人设、打脸爽点、黄金钩子、去AI味”四个维度评审。
4. **Step 4 (记忆归档 Archivist)**：合格章节入库 `03_chapters/`，自动提取 50 字摘要追加至 `02_memories/`。
