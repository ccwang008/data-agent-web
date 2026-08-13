# Operations & Monitoring · Design

| Route | Page |
|---|---|
| `/ops-monitor/tasks` | `OpsTasksPage` |
| `/ops-monitor/lineage` | `OpsLineagePage` |
| `/ops-monitor/quality` | `OpsQualityPage` |
| `/ops-monitor/resource` | `OpsResourcePage` |

`/ops-monitor` 默认重定向到 `/ops-monitor/tasks`。每页使用独立 SQLite scope，mock 操作只改变本地原型状态。

## 页面信息架构

- 任务监控是运行指挥台，使用健康指标、实时任务流和异常处置流。
- 链路监控以端到端拓扑、节点探测和影响范围为中心。
- 质量监控展示跨域评分、趋势、问题阶段分布和责任复检队列。
- 资源监控展示资源池负载、采样趋势、资源详情和队列调度。

四页共享视觉原语和 SQLite 数据边界，但不共享固定的 KPI + 列表页面模板。
