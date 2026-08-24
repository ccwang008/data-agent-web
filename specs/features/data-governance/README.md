# Data Governance · 数据治理

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-governance/` |
| 路由 · Route | `/data-governance/*` |
| 子页面 · Pages | 治理中心 4 页 / 元数据 4 页 / 数据质量 6 页，共 14 页 |
| 状态 · Status | 🔨 重构中 · DCMM L4 就绪度 |

## 概述 · Overview

基于行业数据治理平台（WeData、DataWorks 治理中心模式）与 GB/T 36073—2025 DCMM 第4级（量化管理级）要求重构，覆盖三个产品子模块：治理中心（DCMM 7 数据治理域）、元数据与血缘（DCMM 8.4 元数据管理）、数据质量（DCMM 11 数据质量域）。数据标准正文不在本 feature 维护，仅保存稳定引用。

术语边界详见 `CONTEXT.md` 的"数据治理术语区分"：本模块的"数据治理产品模块"沿用行业惯例命名，不等于"DCMM 数据治理能力域"；DCMM 数据治理能力域（组织/制度/文化）由本模块治理中心承载管理面，由量化看板 `/metrics/governance` 承载 KPI。

## 子页面 · Pages

### 治理中心（DCMM 7 数据治理域）

| 路由 | 责任 | DCMM 对齐 |
|---|---|---|
| `/data-governance/center` | 治理大盘 + 个人工作台 | 7.1/7.2/7.3 跨域 |
| `/data-governance/center/organization` | 治理组织、岗位与认责总览 | 7.1 L4 |
| `/data-governance/center/regulation` | 制度库与执行监控 | 7.2 L4 |
| `/data-governance/center/culture` | 数据文化推广与成效 | 7.3 L4 |

### 元数据与血缘（DCMM 8.4 数据架构域）

| 路由 | 责任 | DCMM 对齐 |
|---|---|---|
| `/data-governance/metadata` | 检索、对象详情与血缘（升级） | 8.4 L3 |
| `/data-governance/metadata/model` | 元模型配置（新增） | 8.4 L3 |
| `/data-governance/metadata/quality` | 元数据质量评价（新增） | 8.4.2.e + L4 |
| `/data-governance/metadata/reports` | 元数据管理报告（新增 L4） | 8.4.4.d L4 |

### 数据质量（DCMM 11 数据质量域）

| 路由 | 责任 | DCMM 对齐 |
|---|---|---|
| `/data-governance/quality` | 质量概览、可信度与趋势（升级） | 11 综合 |
| `/data-governance/quality/requirements` | 质量需求矩阵（新增） | 11.1 L3/L4 |
| `/data-governance/quality/rules` | 规则库、剖析与检查执行（升级） | 11.2 L3 |
| `/data-governance/quality/issues` | 质量问题工作台与闭环（新增核心） | 11.2.f + 11.4 |
| `/data-governance/quality/analysis` | 质量分析与根因（新增） | 11.3 L3 |
| `/data-governance/quality/improvement` | 质量改进报告（新增） | 11.4 L4 |

## 当前实现 · Current Implementation

- 治理中心（4 页）+ 元数据（4 页，含升级）+ 数据质量（6 页，含升级）共 14 个页面，对齐 DCMM L4 就绪度要求。
- 元模型驱动：对象按元模型渲染属性 → 质量按指标评分 → 血缘按关系类型展示 → AI 辅助（补充/检测/追踪 mock）。
- 认责联动（D2）：角色+考核归组织面，对象级认责在元数据详情编辑回写；质量问题分发对象自动取自元数据认责管理者。
- 质量问题闭环（D6）：独立问题对象 + 状态机（发现→确认→分发→整改→复检→关闭）+ 职责分离（确认人≠处置人≠复核人，处置人不得自行关闭）。
- 所有 AI 辅助为 mock 建议待确认；所有执行为 mock 批次不冒充生产；L4 量化指标引用 `/metrics/*` 不重复计算。
- 数据标准不在本 feature 维护第二套可编辑事实；目标入口为独立 `/data-standard/*`，本 feature 只保存稳定标准 ID、版本 ID 和稽核摘要。
- 原 `/data-governance/standards` 删除，不提供兼容入口；数据标准也不作为数据资产类型流通。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
- [CONTEXT · 术语边界](../../../CONTEXT.md)
