# Product Matrix · 产品矩阵首页

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/product-matrix/` |
| 路由 · Route | `/` |
| 状态 · Status | 🔨 前端 mock |

## 概述 · Overview

提供 Data Stack 官网式的产品首页入口：以左侧产品类型筛选产品矩阵，右侧展示对应产品卡片。产品数量、运行入口和文案均为本地 mock，用户可从卡片进入数据资产、数据集成、数据湖、治理、调度、运维和安全等产品工作台。

行业解决方案位于独立的 `/solutions` Tab 页面，不与产品矩阵首页混排；行业页面使用 `public/solutions/industry-solutions-strip.png` 作为本地视觉素材，点击行业卡片只切换本地方案详情，不调用真实服务。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [产品矩阵范围](../../platform/07-data-platform-product-scope.md)
