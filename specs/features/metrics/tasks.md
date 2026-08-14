# Metrics · Tasks

## P0 · 文档与骨架

- [x] T-metrics-01 完成需求访谈、领域词汇和一级产品 ADR
- [x] T-metrics-02 建立 README、requirements、design、tasks 和实现计划
- [x] T-metrics-03 创建类型、默认状态、store、路由和页面骨架

## P1 · 核心能力

- [x] T-metrics-04 实现 25 项核心 KPI、目标与观测状态模型
- [x] T-metrics-05 实现全局摘要、九域状态、当前/日/周/月切换和 SVG 趋势
- [x] T-metrics-06 实现九个路由化 Tab 和九种差异化业务视图

## 数据标准契约 · Planned

- [ ] T-metrics-15 接入 `data-standard` 三项核心 KPI 的标准化来源事实和分母明细
- [ ] T-metrics-16 接入五项能力与跨能力版本迁移诊断指标、证据和自动化熔断状态
- [ ] T-metrics-17 冻结历史快照引用的标准版本和目标版本，避免当前版本回算
- [x] T-metrics-07 实现 33 个能力项覆盖、证据与诊断指标
- [x] T-metrics-08 实现人工填报、目标调整、风险与轻量改进事项
- [x] T-metrics-09 实现日/周/月快照和季度报告查看、模拟导出

## P2 · 集成与验证

- [x] T-metrics-10 接入一级菜单、应用路由和面包屑
- [x] T-metrics-11 同步平台范围、路由、README 和 AGENTS 文档
- [x] T-metrics-12 运行 typecheck、lint、build、db:inspect 和页面视觉检查
- [x] T-metrics-13 增加综合看板并将导航调整为“综合 + 九域”模式
- [x] T-metrics-14 移除共享汇总区并将时间筛选下沉到各看板独立管理

## 持续项

- [ ] 接入共享跨域指标事实契约（当前为稳定 mock 证据引用）
- [ ] 接入真实日更调度（当前仅模拟，不属于本地原型范围）
