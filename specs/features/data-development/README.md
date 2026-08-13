# Data Development · 数据开发

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-development/` |
| 路由 · Route | `/data-development/*` |
| 子页面 · Pages | `etl` / `sql` / `notebook` |
| 当前状态 · Current | ✅ ETL 画布、SQL 编辑器、Notebook 单元格工作台 P0 已实现 |
| 后续深化 · Next | 📋 跨域血缘/审计跳转与完整 i18n 待实现 |

## 概述 · Overview

为数据工程师、数仓开发者、数据分析师和算法工程师提供三种互补的开发方式：

- 可视化 ETL：以节点和连线为核心，完成标准化数据加工流程。
- SQL 开发：以脚本文本为核心，完成编辑、参数、校验、运行结果和版本管理。
- Notebook：以有状态单元格文档为核心，完成探索分析、实验和可复现发布。

三类开发对象共享版本、发布、运行、审计、血缘和调度引用契约，但拥有独立编辑器。当前前端不连接真实数据源或执行引擎，所有可变状态和 mock 结果保存到本地 SQLite。

## 关联文档 · Related Docs

- [需求](./requirements.md)
- [设计](./design.md)
- [任务](./tasks.md)
- [专业工作台实施计划](./plans/2026-08-13-specialized-workbenches.md)
- [基础 README 对齐计划](./plans/2026-08-13-readme-alignment.md)
