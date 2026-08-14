# Data Standard · 数据标准

| 元数据 · Meta | 值 |
|---|---|
| 目标路径 · Target Path | `src/features/data-standard/` |
| 目标路由 · Target Route | `/data-standard/*` |
| 状态 · Status | 📋 需求与设计完成，待实现 |
| 业务负责人 · Owner | 数据标准负责人 |
| 创建日期 · Created | 2026-08-13 |

## 概述 · Overview

数据标准是独立一级产品域，面向数据标准负责人、标准维护人和业务数据管家，统一管理业务术语、主数据、参考数据、数据元标准和指标字典。产品先补齐 GB/T 36073—2025 第 10 章的组织级管理基线，再以量化指标、AI 辅助、自动落标稽核、问题闭环和证据追溯支撑 DCMM 第4级就绪度。

## 二级能力 · Capabilities

| 二级菜单 | 目标路由 | 核心任务 |
|---|---|---|
| 业务术语 | `/data-standard/business-terms` | 企业级业务术语库、本体模型、术语引用和审批 |
| 主数据 | `/data-standard/master-data` | 主数据标准、来源匹配、黄金记录、订阅分发和质量跟踪 |
| 参考数据 | `/data-standard/reference-data` | 参考数据目录、代码值版本、跨系统映射和符合性分析 |
| 数据元标准 | `/data-standard/data-element-standards` | 数据元目录、字段关系、AI 自动落标和符合性稽核 |
| 指标字典 | `/data-standard/metric-dictionary` | 企业指标体系、语义层模型、血缘和跨部门口径比对 |

这些是目标路由，当前工作区尚未实现 `data-standard` feature，不应在产品文档中标记为已上线。

## 产品边界 · Boundary

- 数据标准域权威维护本体模型和语义层指标模型。
- `/metrics/standards` 维护正式 KPI 目标、观测、快照、趋势和改进事项；数据标准域维护其来源事实和证据。
- 原 `/data-governance/standards`、旧菜单 key 和旧实现删除，不提供兼容入口。
- 数据标准不作为数据资产类型，本期不建设标准资产发布、外部申请、授权或下发流程。
- 当前原型只提供 SQLite 持久化 mock，不连接真实主数据平台、业务系统、语义执行引擎或外部标准平台。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [访谈归档 · Plan](./plans/2026-08-13-dcmm4-data-standard-requirements.md)
- [ADR-0020：最终确认数据标准为一级产品域](../../adr/0020-finalize-data-standard-as-top-level-product.md)
- [GB/T 36073—2025 原文](../../platform/references/GB_T_36073-2025_数据管理能力成熟度评估模型.pdf)
