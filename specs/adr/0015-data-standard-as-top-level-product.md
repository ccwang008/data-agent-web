# ADR-0015 · 数据标准作为一级产品域

## 状态 · Status

Superseded by ADR-0017

## 决策 · Decision

将“数据标准”从数据治理下的单页能力调整为一级菜单和独立 `data-standard` feature。一级菜单下设置五个二级能力及稳定路由：业务术语 `/data-standard/business-terms`、主数据 `/data-standard/master-data`、参考数据 `/data-standard/reference-data`、数据元标准 `/data-standard/data-element-standards`、指标字典 `/data-standard/metric-dictionary`。产品名称使用“数据元标准”和“指标字典”，DCMM 映射仍分别引用 GB/T 36073—2025 第 10.4“数据元”和第 10.5“指标数据”。各能力拥有自身标准生命周期、AI 辅助、落标稽核、量化指标和证据；跨能力组织级汇总继续由 `/metrics/standards` 承担。

## 后果 · Consequences

- 数据标准需要独立维护 README、requirements、design、tasks、routes、菜单注册、i18n 和 `data-agent.data-standard` SQLite 状态范围。
- 删除原 `/data-governance/standards` 路由、旧稳定菜单 key 和旧实现，不提供兼容重定向，也不同时维护两套可编辑标准事实。
- 本体模型、语义层、元数据、量化看板等跨域关系必须通过共享契约或稳定引用表达，feature 之间不得直接 import。
- 主数据、参考数据、数据元标准和指标字典在本地原型中提供 SQLite 持久化 mock 工作流，不连接真实业务系统或执行引擎。

## 备选 · Alternatives Considered

- 保留在“数据治理”下：菜单改动较小，但无法承载五项完整能力，且会继续把独立 DCMM 能力域误作数据治理子页面。
- 只保留 `/data-governance/standards` 单页 Tab：实现较快，但缺少稳定深链，主数据和指标字典等专业工作台会被压缩为同构列表。
