# Operations & Monitoring · Design

| Route | Page |
|---|---|
| `/ops-monitor/tasks` | `OpsTasksPage` |
| `/ops-monitor/lineage` | `OpsLineagePage` |
| `/ops-monitor/quality` | `OpsQualityPage` |
| `/ops-monitor/resource` | `OpsResourcePage` |

`/ops-monitor` 默认重定向到 `/ops-monitor/tasks`。每页使用独立 SQLite scope，mock 操作只改变本地原型状态。

