# ADR-0021: Data Agent 作为一级任务编排模块

| 字段 | 值 |
|---|---|
| 状态 · Status | Accepted |
| 日期 · Date | 2026-08-25 |
| 决策者 · Deciders | 产品负责人、平台设计协作者 |
| 关联 · Related | Supersedes `platform/08` 中“AI 不设独立一级产品域”的旧边界 |

## 背景 · Context

平台原先把 AI 能力作为横向赋能嵌入资产、开发、治理、安全和量化看板，并明确不提供独立 AI 工作台。随着产品模块增多，用户需要从一个数据意图出发跨资产发现、问答、开发、治理和运维连续处理；仅在各工作台放置零散 AI 按钮无法表达跨域计划、协作、确认和证据，也无法形成完整的演示故事。

## 决策 · Decision

平台新增一级 `data-agent` 产品模块，正式名称为 Data Agent。模块包含通用 Agent、数据发现 Agent、数据问答 Agent、数据开发 Agent、数据治理 Agent和数据运维 Agent。通用 Agent 只负责意图理解、自动路由、多 Agent 编排和结果汇总，领域 Agent 持有专业步骤；所有 Agent 共享同一任务记录并在各自页面按参与关系展示任务 List，不建设独立任务中心。

Data Agent 作为跨模块智能控制面，只执行检索、分析、预览、轻量确认和 mock 动作；复杂编辑仍进入原专业工作台，标准发布、重要数据认定、安全审批和问题关闭等受控结论仍由所属产品域的人工职责链决定。首期使用可重放的 SQLite mock 案例，不接入真实 LLM、真实数据源或生产执行引擎。

## 后果 · Consequences

- ✅ 正向 · Positive: 用户获得统一的 AI 任务入口，六种任务界面能展示清晰的专业差异和跨 Agent 协作。
- ✅ 正向 · Positive: 现有资产、标准、开发、调度、运维和安全事实仍由原产品域持有，Data Agent 只引用稳定对象 ID。
- ⚠️ 负向 · Negative: 菜单、路由、产品范围和 AI 举证文档必须同步调整，并维护跨域上下文入口。
- ⚪ 中性 · Neutral: 旧 `agents`、`workflow`、`insights` 菜单键继续废弃；新模块使用全新的 `data-agent.*` 稳定菜单键。

## 备选 · Alternatives Considered

- **AI 继续只横向嵌入**：无法提供跨域任务编排和统一证据轨迹，用户必须自行在多个工作台间切换。
- **六个彼此独立的聊天应用**：会复制上下文和任务状态，跨 Agent 转交无法保持同一任务身份。
- **通用 Agent 直接拥有全部专业能力**：边界模糊，并会复制现有产品工作台的专业逻辑和审批事实。

## 参考 · References

- [`../platform/08-ai-capability-dcmm-evidence.md`](../platform/08-ai-capability-dcmm-evidence.md)
- [`../features/data-agent/design.md`](../features/data-agent/design.md)
- [`../../CONTEXT.md`](../../CONTEXT.md)
