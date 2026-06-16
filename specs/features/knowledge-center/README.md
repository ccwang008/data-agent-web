# Knowledge Center · 知识中心

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/knowledge-center/` |
| 路由 · Route | `/knowledge-center` |
| 状态 · Status | 🚧 前端 mock |
| 负责人 · Owner | _未指派_ |
| 创建日期 · Created | 2026-06-10 |

## 概述 · Overview
知识中心提供知识库、文档、向量等管理入口, 支持业务用户配置知识库检索前的文档解析与索引参数。

## 当前实现 · Current Implementation
知识库列表与新建/编辑弹窗位于 `src/features/knowledge-center/pages/KnowledgeBasesPage.tsx`。当前为前端 mock 数据与本地状态, 不接真实后端接口。

## 关联文档 · Related Docs
- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)

## 关键决策 · Key Decisions
- 知识库新建/编辑继续使用现有 `parser: string` 字段保存解析策略名称, 本阶段不引入后端枚举或迁移。
- “PDF解析器”字段保留原命名, 不纳入“解析策略”重命名范围。
