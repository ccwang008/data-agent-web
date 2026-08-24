# Data Governance · Tasks

基于 DCMM 第4级（量化管理级）要求重构，覆盖治理中心、元数据与血缘、数据质量三个子模块。任务按子模块和依赖顺序组织。

## 已完成 · Done

- [x] T-data-governance-01 元数据、质量两组路由；旧标准路由已按 ADR-0020 从目标范围移除
- [x] T-data-governance-02 元数据详情、责任信息和血缘视图（L2 基础）
- [x] T-data-governance-03 质量规则 CRUD、评分和状态反馈（L2 基础）
- [x] T-data-governance-04 已取消：术语、指标和标准审批迁移到独立 `data-standard` 目标 feature
- [x] T-data-governance-10 按数据地图和质量闭环重构两页信息架构

## 待完成 · TODO

### 基础设施

- [ ] T-data-governance-20 扩展领域类型与 fixtures：新增 MetaModel、MetadataQualityBatch、QualityRequirement、QualityIssue、GovernanceRole、GovernanceRegulation、RegulationExecutionBatch、CultureActivity 类型与 SQLite 种子数据；元数据对象增加 modelId、ownerId、managerId、accountabilityStatus 字段
- [ ] T-data-governance-21 扩展路由：新增 12 个子路由（center、center/organization、center/regulation、center/culture、metadata/model、metadata/quality、metadata/reports、quality/requirements、quality/rules、quality/issues、quality/analysis、quality/improvement）；默认重定向改为 /center
- [ ] T-data-governance-22 更新菜单配置：数据治理二级菜单对齐三个子模块入口

### 治理中心（DCMM 7 数据治理域）

- [ ] T-data-governance-30 治理大盘页 `/center`：四象限概览（组织/制度/文化/问题）+ 个人工作台待办；KPI 摘要引用 /metrics/governance
- [ ] T-data-governance-31 治理组织页 `/center/organization`：三级组织架构树 + 岗位职责 + 认责总览（覆盖率/按部门统计/异常/业务部门量化考核）
- [ ] T-data-governance-32 认责联动：元数据对象详情认责字段编辑回写，治理组织面聚合认责总览（通过对象 ID 关联，不重复维护）
- [ ] T-data-governance-33 制度管理页 `/center/regulation`：三层文档库（政策/办法/细则）+ 版本 + 起草审核发布 + 执行监控批次（mock 符合度评分 + 偏差 + 整改）
- [ ] T-data-governance-34 文化管理页 `/center/culture`：价值观 + 领导力承诺 + 宣贯培训时间线 + 标杆案例 + 成效量化指标（L4）

### 元数据与血缘（DCMM 8.4 元数据管理）

- [ ] T-data-governance-40 元模型配置页 `/metadata/model`：对象类型 + 属性集（必填/采集/值域）+ 关系类型（源/目标/方向/权重）+ 采集规则（来源/方式/频率/映射 + 任务状态）CRUD
- [ ] T-data-governance-41 升级元数据检索页 `/metadata`：按元模型对象类型筛选 + 对象详情按属性集分组渲染 + 认责字段编辑回写 + 血缘按关系类型渲染 + 影响分析
- [ ] T-data-governance-42 元数据质量评价页 `/metadata/quality`：三维评分（准确/完整/时效，元模型驱动）+ 评价批次（不可覆盖，引用元模型版本）+ 趋势 + 问题闭环（联动认责管理者）
- [ ] T-data-governance-43 元数据 L4 AI 辅助：业务元数据补充建议 + 符合性异常检测命中 + 血缘自动追踪结果（均 mock 待确认）
- [ ] T-data-governance-44 元数据管理报告页 `/metadata/reports`：版本化报告 + 量化指标（采集覆盖率/质量分/血缘完整率）；引用 /metrics/architecture

### 数据质量（DCMM 11 数据质量域）

- [ ] T-data-governance-50 升级质量概览页 `/quality`：综合可信度 + 五维评分雷达 + 批次趋势 + 问题闭环漏斗；原规则 CRUD 移至 /quality/rules
- [ ] T-data-governance-51 质量需求矩阵页 `/quality/requirements`：对象×维度×指标 + 优先级 + 信息环境上下文 + L4 AI 需求矩阵识别建议
- [ ] T-data-governance-52 质量规则页 `/quality/rules`：规则库 CRUD + 启停 + 质量剖析（分布统计快照）+ 检查执行批次；失败生成质量问题跳转 /quality/issues
- [ ] T-data-governance-53 质量问题工作台 `/quality/issues`：独立问题对象 + 闭环状态机（发现→确认→分发→整改→复检→关闭）+ 职责分离 + 证据引用 + 批量分发
- [ ] T-data-governance-54 质量问题认责联动：分发对象自动取自元数据对象 managerId（D2 联动）
- [ ] T-data-governance-55 质量分析页 `/quality/analysis`：跨批次趋势 + 根因聚类 + 对比分析
- [ ] T-data-governance-56 质量改进报告页 `/quality/improvement`：版本化报告 + 趋势 + 根因 + 措施 + 效果复评 + L4 生存周期闭环优化；引用 /metrics/quality

### 跨模块引用

- [ ] T-data-governance-60 元数据对象引用数据标准稳定 ID、版本 ID、本体概念 ID 和最近稽核摘要，跳转 /data-standard/*
- [ ] T-data-governance-61 治理状态接入资产目录、服务发布和调度监控
- [ ] T-data-governance-62 可信度低的数据在资产发布和服务发布时受限

## 已取消 · Cancelled

- [~] T-data-governance-05 接入元数据采集、搜索和数据地图服务（改为 mock 采集任务，不接真实采集器）
- [~] T-data-governance-06 接入血缘采集、影响分析和版本追踪（改为 mock 血缘 + L4 AI 追踪建议）
- [~] T-data-governance-07 接入质量规则执行器、评分计算和告警（改为 mock 执行批次）
- [~] T-data-governance-08 接入数据标准稳定 ID、版本和稽核摘要引用（保留为 T-60，标准审批由 data-standard 负责）
- [~] T-data-governance-09 将治理状态接入资产目录、服务发布和调度监控（保留为 T-61）

## 依赖顺序

1. T-20 → T-21 → T-22（基础设施先行）
2. T-40（元模型）→ T-41（检索升级依赖元模型）→ T-42（质量评价依赖元模型）→ T-43/T-44
3. T-31/T-32（认责）↔ T-41（元数据认责字段编辑）双向依赖，需协同
4. T-52（规则）→ T-53（问题由规则失败产生）→ T-54（认责联动）→ T-55/T-56
5. T-50（概览）依赖 T-52/T-53 的数据结构
