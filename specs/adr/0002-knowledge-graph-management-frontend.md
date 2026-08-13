# ADR-0002: Knowledge graph management frontend

| 字段 | 值 |
|---|---|
| 状态 · Status | Superseded by [Knowledge Graph spec](../features/knowledge-graph/) |
| 日期 · Date | 2026-05-12 |
| 决策者 · Deciders | 项目发起人 |
| 关联 · Related | ADR-0001 |

## 背景 · Context
Knowledge Graph 模块最初是只读图谱浏览脚手架, 只覆盖 overview、canvas 占位和 Inspector 占位。新的产品定位要求它面向数据工程师和数据分析师, 用于管理知识图谱的完整前端工作流: 数据接入、图谱生成、Schema 建模、图数据库管理、查询分析、可视化探索和持续维护。

项目边界仍然是纯前端: 不实现后端、真实数据源连接、真实图数据库连接、认证、权限、审计、持久化、图谱抽取算法或查询执行引擎。前端技术栈也已经由平台规范确定, 不在 KG 模块内重新选型。

## 决策 · Decision
KG 模块采用**知识图谱管理台前端抽象 + 统一 JSON DSL + mock-only 实现**:

- 模块定位是知识图谱管理台, 不是单纯的图数据库管理台。
- 图数据库管理、连接和状态展示是 KG 管理台的底层能力之一。
- 第一阶段覆盖 KG 前端闭环: 图谱项目、数据源接入、图谱生成任务、Schema / ontology 管理、图数据维护、查询、可视化和维护任务。
- Schema 管理必须同时支持可视化编辑和列表编辑, 两种视图共享同一份前端 state。
- 所有创建、编辑、删除、接入配置和生成任务先生成 `KGChangeDraft` 或 mock task, 用户确认后只更新前端状态。
- Query 工作区使用统一 JSON DSL, 不执行 Cypher / Gremlin / GSQL 原生查询。
- 继续沿用 React 18 + TypeScript + Vite、Tailwind、shadcn-style UI、Zustand、React Router、react-i18next 和 `mockClient`。

## 后果 · Consequences
- ✅ 正向: KG 产品边界覆盖从接入到维护的完整知识图谱生命周期, 不被降格为底层数据库工具。
- ✅ 正向: 纯前端阶段也能完整评审接入、生成、schema 管理、图探索、查询和维护体验。
- ✅ 正向: Schema Visual / List 双视图覆盖工程师的建模效率和结构化维护诉求。
- ✅ 正向: `KGChangeDraft` 让写操作风险可见, 便于未来接权限和审计。
- ⚠️ 负向: 知识图谱管理台范围更宽, P1 必须控制深度, 优先做前端闭环而不是单点高级能力。
- ⚠️ 负向: 统一 DSL 不是任何真实图数据库语言, 未来接入真实后端时需要协议转换。
- ⚪ 中性: mock-only 数据不会持久化, 刷新或重载后的状态恢复策略需由实现阶段决定。

## 备选 · Alternatives Considered
- **A · 图数据库管理台**: 能覆盖连接、schema 和图数据 CRUD, 但产品层级过低, 无法表达知识图谱接入、生成和维护流程。
- **B · HugeGraph-first**: 与部分图数据库管理诉求匹配, 但会把 KG 产品体验过早绑定到单一厂商语义。
- **C · 暴露原生查询语言**: 更贴近真实数据库, 但 Cypher / Gremlin / GSQL 差异过大, 纯前端阶段会增加无后端支撑的复杂度。
- **D · 只做只读图谱探索**: 实现成本低, 但无法满足创建、维护、Schema 管理和图谱生命周期管理的核心定位。

## 参考 · References
- [Knowledge Graph requirements](../features/knowledge-graph/requirements.md)
- [Knowledge Graph design](../features/knowledge-graph/design.md)
- [Platform architecture](../platform/01-architecture.md)
