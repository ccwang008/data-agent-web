# ADR-0001: Record architecture decisions

| 字段 | 值 |
|---|---|
| 状态 · Status | Accepted |
| 日期 · Date | 2026-05-12 |
| 决策者 · Deciders | 项目发起人 |
| 关联 · Related | — |

## 背景 · Context
项目刚启动,前端独立先行,无后端约束,需要密集地做技术与约定选择(状态库、路由、Mock 策略、设计语言、i18n…)。如无书面沉淀, 半年后无人能回答"为什么当时选了 X 而不是 Y", 后续的优化讨论会反复回到原点。

## 决策 · Decision
仓库内采用 Michael Nygard 风格的 ADR, 集中放在 `specs/adr/`, 按编号顺序追加。每条**跨 feature 的架构决策**(库 / 协议 / 约定 / 重大重构)都需提交一条 ADR。模板见 [`_templates/adr.md`](../_templates/adr.md)。

## 后果 · Consequences
- ✅ 正向: 决策可追溯, 新人 onboarding 有上下文
- ✅ 正向: 与 feature spec / platform spec 形成"特性 + 共识 + 决策"三层
- ✅ 正向: 推翻旧决策时有清晰的对话起点
- ⚠️ 负向: 需要团队习惯写作, 初期可能滞后
- ⚪ 中性: 不强制每个 PR 必须带 ADR; 由 reviewer 判断

## 备选 · Alternatives Considered
- **A · 不写,靠 commit message 与 PR 描述**: 信息散落, 难以检索, 一旦 PR 关闭就被遗忘。
- **B · 用第三方工具 (Log4brains / adr-tools CLI)**: 初期复杂度过高, 加入工具依赖, 可后续按需引入。
- **C · 用 wiki / Notion**: 与代码分离, 漂移风险高, 不便随 PR 一起评审。

## 参考 · References
- Michael Nygard, "Documenting Architecture Decisions" (2011)
- [ADR GitHub Organization](https://adr.github.io/)
- [Joel Parker Henderson, ADR examples](https://github.com/joelparkerhenderson/architecture-decision-record)
